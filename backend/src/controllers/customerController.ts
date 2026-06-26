import { Request, Response } from 'express';
import prisma from '../config/db';

const notifyRoles = async (roles: string[], title: string, message: string) => {
  const users = await prisma.user.findMany({
    where: { role: { roleName: { in: roles } }, status: 'active' },
    select: { userId: true },
  });

  if (users.length === 0) return;

  await prisma.notification.createMany({
    data: users.map(user => ({
      userId: user.userId,
      title,
      message,
      type: 'info',
    })),
  });
};

const buildReferenceCode = (prefix = 'ORD') => `${prefix}-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

const fallbackCoffeeVarieties = ['Red Bourbon', 'Bourbon', 'Jackson', 'Mibirizi', 'Typica', 'Gesha'];
const fallbackCoffeeGrades = [
  { value: 'Premium', label: 'Premium', detail: 'High-scoring export lots that meet premium quality thresholds' },
  { value: 'Standard', label: 'Standard', detail: 'Approved export-grade coffee for reliable commercial orders' },
  { value: 'Low', label: 'Low', detail: 'Lower-tier coffee normally reviewed before commercial matching' },
];

const splitVarieties = (value: string | null | undefined) =>
  String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

const defectTotal = (defects: any): number => {
  if (!defects || typeof defects !== 'object') return 0;
  return Object.values(defects).reduce<number>((sum, value) => sum + Number(value || 0), 0);
};

const assignQualityTier = (score: number, moisture: number, defects: any) => {
  const totalDefects = defectTotal(defects);
  if (score >= 85 && totalDefects <= 5 && moisture >= 10 && moisture <= 12) return 'Premium';
  if (score >= 75 && score < 85 && totalDefects <= 10) return 'Standard';
  return 'Low';
};

const gradeDetail = (tier: string) => fallbackCoffeeGrades.find(grade => grade.value === tier)?.detail || 'System quality grade from completed assessments';

export const getCustomerCoffeeVarieties = async (_req: Request, res: Response): Promise<void> => {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS cooperative_member_farms (
        farm_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        cooperative_user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        farm_name VARCHAR(150) NOT NULL,
        farm_location TEXT NOT NULL,
        coordinates VARCHAR(100) NULL,
        farm_size_ha NUMERIC(12,2) NULL,
        coffee_varieties TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    const profileRows = await prisma.$queryRaw<Array<{ coffee_varieties: string | null }>>`
      SELECT coffee_varieties
      FROM farmer_profiles
      WHERE coffee_varieties IS NOT NULL AND TRIM(coffee_varieties) <> ''
    `;
    const memberFarmRows = await prisma.$queryRaw<Array<{ coffee_varieties: string | null }>>`
      SELECT coffee_varieties
      FROM cooperative_member_farms
      WHERE coffee_varieties IS NOT NULL AND TRIM(coffee_varieties) <> ''
    `;

    const varieties = Array.from(new Set(
      [...profileRows, ...memberFarmRows]
        .flatMap(row => splitVarieties(row.coffee_varieties))
    )).sort((a, b) => a.localeCompare(b));

    res.status(200).json({
      success: true,
      data: varieties.length ? varieties : fallbackCoffeeVarieties,
    });
  } catch (error) {
    console.error('Error fetching customer coffee varieties:', error);
    res.status(200).json({ success: true, data: fallbackCoffeeVarieties });
  }
};

export const getCustomerCoffeeGrades = async (_req: Request, res: Response): Promise<void> => {
  try {
    const assessments = await prisma.qualityAssessment.findMany({
      where: {
        batch: { status: { in: ['export_ready', 'shipment_authorized'] } },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });

    const tiers = Array.from(new Set(
      assessments.map((assessment) => {
        try {
          const parsedNotes = assessment.notes ? JSON.parse(assessment.notes) : null;
          if (parsedNotes?.tier) return String(parsedNotes.tier);
        } catch {
          // Fall back to recalculating below if notes are plain text.
        }
        return assignQualityTier(Number(assessment.cuppingScore), Number(assessment.moisture), assessment.defects);
      })
    ));
    const order = ['Premium', 'Standard', 'Low'];
    const grades = (tiers.length ? tiers : order)
      .sort((a, b) => order.indexOf(a) - order.indexOf(b))
      .map(tier => ({ value: tier, label: tier, detail: gradeDetail(tier) }));

    res.status(200).json({ success: true, data: grades });
  } catch (error) {
    console.error('Error fetching customer coffee grades:', error);
    res.status(200).json({ success: true, data: fallbackCoffeeGrades });
  }
};

export const createCustomerOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      customerName,
      companyName,
      email,
      phone,
      country,
      grade,
      weight,
      requestType = 'ORDER',
      sampleQuantityGrams,
      samplePurpose,
      incoterm,
      qualitySpecs,
      shipmentRequirements,
      message,
    } = req.body;

    const isSampleRequest = String(requestType).toUpperCase() === 'SAMPLE';

    if (!customerName || !email || !grade || (!isSampleRequest && !weight)) {
      res.status(400).json({ message: 'Customer name, email, grade, and quantity are required.' });
      return;
    }

    const numericWeight = isSampleRequest ? Number(sampleQuantityGrams || 500) / 1000 : Number(weight);
    if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
      res.status(400).json({ message: 'Requested quantity must be greater than 0.' });
      return;
    }

    const buyer = companyName ? `${companyName} - ${customerName}` : customerName;
    const destinationCountry = country || 'To be discussed';
    const referenceCode = buildReferenceCode(isSampleRequest ? 'SMP' : 'ORD');
    const order = await prisma.exportOrder.create({
      data: {
        referenceCode,
        buyer,
        customerEmail: String(email).toLowerCase(),
        customerPhone: phone || null,
        companyName: companyName || null,
        country: destinationCountry,
        weight: numericWeight,
        grade,
        pricePerKg: 0,
        totalValue: 0,
        status: isSampleRequest ? 'Sample Requested' : 'Customer Request',
        incoterm: incoterm || null,
        qualitySpecs: {
          ...(qualitySpecs || {}),
          requestType: isSampleRequest ? 'SAMPLE' : 'ORDER',
          ...(isSampleRequest ? {
            sampleQuantityGrams: Number(sampleQuantityGrams || 500),
            samplePurpose: samplePurpose || 'Buyer cupping evaluation',
          } : {}),
        },
        shipmentRequirements: {
          ...(shipmentRequirements || {}),
          fulfillmentType: isSampleRequest ? 'Sample dispatch' : 'Export shipment',
        },
        customerMessage: message || null,
        messages: message ? {
          create: {
            senderType: 'CUSTOMER',
            senderName: customerName,
            message,
          },
        } : undefined,
      },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CUSTOMER_ORDER_REQUESTED',
        entityType: 'ExportOrder',
        entityId: order.orderId,
        details: {
          customerName,
          companyName: companyName || null,
          email,
          phone: phone || null,
          country: destinationCountry,
          grade,
          weightKg: numericWeight,
          requestType: isSampleRequest ? 'SAMPLE' : 'ORDER',
          sampleQuantityGrams: isSampleRequest ? Number(sampleQuantityGrams || 500) : null,
          samplePurpose: isSampleRequest ? samplePurpose || null : null,
          incoterm: incoterm || null,
          qualitySpecs: qualitySpecs || {},
          shipmentRequirements: shipmentRequirements || {},
          message: message || null,
        },
        ipAddress: req.ip,
      },
    });

    await notifyRoles(
      ['EXPORTER', 'ADMIN'],
      isSampleRequest ? 'New customer sample request' : 'New customer order request',
      isSampleRequest
        ? `${buyer} requested a ${Number(sampleQuantityGrams || 500).toLocaleString()} g sample of ${grade} coffee.`
        : `${buyer} requested ${numericWeight.toLocaleString()} kg of ${grade} coffee.`
    );

    res.status(201).json({
      success: true,
      message: isSampleRequest
        ? 'Sample request submitted. IMPEXCOR will review availability and prepare sample dispatch details.'
        : 'Order request submitted. IMPEXCOR will contact the customer for pricing and contract confirmation.',
      data: order,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error creating customer order request' });
  }
};

export const getCustomerOrderByReference = async (req: Request, res: Response): Promise<void> => {
  try {
    const referenceCode = String(req.params.referenceCode || '');
    const email = String(req.query.email || '').toLowerCase();
    if (!referenceCode || !email) {
      res.status(400).json({ message: 'Reference code and email are required.' });
      return;
    }

    const order = await prisma.exportOrder.findFirst({
      where: { referenceCode, customerEmail: email },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!order) {
      res.status(404).json({ message: 'Order request not found for this reference and email.' });
      return;
    }

    res.status(200).json({ success: true, data: order });
  } catch {
    res.status(500).json({ message: 'Server error retrieving customer order request' });
  }
};

export const createCustomerOrderMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const referenceCode = String(req.params.referenceCode || '');
    const { email, senderName, message } = req.body;
    if (!referenceCode || !email || !message) {
      res.status(400).json({ message: 'Reference code, email, and message are required.' });
      return;
    }

    const order = await prisma.exportOrder.findFirst({
      where: { referenceCode, customerEmail: String(email).toLowerCase() },
    });

    if (!order) {
      res.status(404).json({ message: 'Order request not found for this reference and email.' });
      return;
    }

    const created = await prisma.customerOrderMessage.create({
      data: {
        orderId: order.orderId,
        senderType: 'CUSTOMER',
        senderName: senderName || order.buyer,
        message,
      },
    });

    await notifyRoles(['EXPORTER', 'ADMIN'], 'Customer replied on order', `${order.referenceCode} has a new customer message.`);
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ message: 'Server error creating customer order message' });
  }
};
