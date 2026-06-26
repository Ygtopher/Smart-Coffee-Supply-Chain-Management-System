import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import prisma from '../config/db';
import { deliveryTotalAmount, matchPaymentForDelivery, normalizedPaymentStatus } from '../utils/paymentMatching';
import { getSupplierRiskStatus } from '../services/eudrRiskService';

const ensureFarmerRequirementTables = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "farmer_service_requests" (
      "request_id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "farmer_id" TEXT NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
      "request_type" VARCHAR(80) NOT NULL,
      "description" TEXT NOT NULL,
      "quantity" VARCHAR(80) NULL,
      "preferred_date" DATE NULL,
      "status" VARCHAR(50) NOT NULL DEFAULT 'Open',
      "response" TEXT NULL,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "community_replies" (
      "reply_id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "post_id" TEXT NOT NULL REFERENCES "community_posts"("post_id") ON DELETE CASCADE,
      "author_id" TEXT NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
      "content" TEXT NOT NULL,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "status" VARCHAR(20) NOT NULL DEFAULT 'active'
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "community_reactions" (
      "reaction_id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "post_id" TEXT NOT NULL REFERENCES "community_posts"("post_id") ON DELETE CASCADE,
      "user_id" TEXT NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
      "reaction_type" VARCHAR(30) NOT NULL DEFAULT 'like',
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT "community_reactions_post_user_type_key" UNIQUE ("post_id", "user_id", "reaction_type")
    )
  `);
};

const ensureWashingStationRequestTable = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS washing_station_requests (
      request_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      supplier_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      washing_station_name VARCHAR(150) NOT NULL,
      current_washing_station VARCHAR(150) NULL,
      reason TEXT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
      reviewed_by_processor_id TEXT NULL REFERENCES users(user_id),
      assigned_aggregator_id TEXT NULL REFERENCES users(user_id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMP NULL
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_washing_station_requests_supplier_id ON washing_station_requests(supplier_id)`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_washing_station_requests_status ON washing_station_requests(status)`);
};

const ensureCooperativeMemberFarmsTable = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS cooperative_member_farms (
      farm_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      cooperative_user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      farm_name VARCHAR(150) NOT NULL,
      farm_location VARCHAR(255) NULL,
      coordinates VARCHAR(100) NOT NULL,
      farm_size_ha NUMERIC(12,2) NULL,
      coffee_varieties TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_cooperative_member_farms_user_id ON cooperative_member_farms(cooperative_user_id)`);
};

const DEFAULT_MARKET_PRICES = {
  currency: 'RWF',
  updatedAt: '2026-05-15',
  baselineRatePerKg: 2600,
  previousBaselineRatePerKg: 2500,
  grades: [
    { key: 'a1', grade: 'Grade A1 export reference', pricePerKg: 3200, previousPricePerKg: 3000 },
    { key: 'a2', grade: 'Grade A2 export reference', pricePerKg: 2950, previousPricePerKg: 2800 },
    { key: 'a3', grade: 'Grade A3 export reference', pricePerKg: 2700, previousPricePerKg: 2600 },
  ],
};

const monthLabel = (date: Date) => date.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'Africa/Kigali' });

const buildHistoryFromGrades = (grades: any[]) => {
  const current = new Date();
  const previous = new Date(current.getFullYear(), current.getMonth() - 1, 1);
  const currentMonth = monthLabel(current);
  const previousMonth = monthLabel(previous);
  const previousBaseline = Number((grades as any).previousBaselineRatePerKg || DEFAULT_MARKET_PRICES.previousBaselineRatePerKg);
  const currentBaseline = Number((grades as any).baselineRatePerKg || DEFAULT_MARKET_PRICES.baselineRatePerKg);
  const previousRow = grades.reduce<Record<string, any>>((row, grade) => {
    row[grade.key] = Number(grade.previousPricePerKg || grade.pricePerKg || 0);
    return row;
  }, { month: previousMonth, baseline: previousBaseline });
  const currentRow = grades.reduce<Record<string, any>>((row, grade) => {
    row[grade.key] = Number(grade.pricePerKg || 0);
    return row;
  }, { month: currentMonth, baseline: currentBaseline });
  return [previousRow, currentRow];
};

const normalizeMarketPrices = (config: any) => {
  const marketPrices = config?.marketPrices || DEFAULT_MARKET_PRICES;
  const configuredGrades = Array.isArray(marketPrices.grades) ? marketPrices.grades : [];
  const baselineRatePerKg = Number(marketPrices.baselineRatePerKg ?? DEFAULT_MARKET_PRICES.baselineRatePerKg);
  const previousBaselineRatePerKg = Number(marketPrices.previousBaselineRatePerKg ?? DEFAULT_MARKET_PRICES.previousBaselineRatePerKg);
  const baselineChangePercent = previousBaselineRatePerKg > 0 ? ((baselineRatePerKg - previousBaselineRatePerKg) / previousBaselineRatePerKg) * 100 : 0;
  const grades = DEFAULT_MARKET_PRICES.grades.map((fallback) => {
    const configured = configuredGrades.find((grade: any) => grade.key === fallback.key || grade.grade === fallback.grade) || {};
    const pricePerKg = Number(configured.pricePerKg ?? fallback.pricePerKg);
    const previousPricePerKg = Number(configured.previousPricePerKg ?? fallback.previousPricePerKg ?? pricePerKg);
    const changePercent = previousPricePerKg > 0 ? ((pricePerKg - previousPricePerKg) / previousPricePerKg) * 100 : 0;
    return {
      ...fallback,
      ...configured,
      pricePerKg,
      previousPricePerKg,
      changePercent: Number(changePercent.toFixed(1)),
    };
  });

  (grades as any).baselineRatePerKg = baselineRatePerKg;
  (grades as any).previousBaselineRatePerKg = previousBaselineRatePerKg;
  const history = buildHistoryFromGrades(grades);
  const normalizedHistory = history.map((row: any) => ({ ...row }));
  if (normalizedHistory.length > 0) {
    const lastRow = normalizedHistory[normalizedHistory.length - 1];
    grades.forEach((grade) => {
      lastRow[grade.key] = grade.pricePerKg;
    });
  }

  return {
    ...DEFAULT_MARKET_PRICES,
    ...marketPrices,
    baselineRatePerKg,
    previousBaselineRatePerKg,
    baselineChangePercent: Number(baselineChangePercent.toFixed(1)),
    grades,
    history: normalizedHistory,
  };
};

export const getFarmerDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    await prisma.$executeRawUnsafe(`ALTER TABLE farmer_profiles ADD COLUMN IF NOT EXISTS supplier_type VARCHAR(30) NOT NULL DEFAULT 'FARMER'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE farmer_profiles ADD COLUMN IF NOT EXISTS number_of_farms INTEGER NULL`);
    await prisma.$executeRawUnsafe(`ALTER TABLE farmer_profiles ADD COLUMN IF NOT EXISTS preferred_washing_station VARCHAR(150) NULL`);
    await prisma.$executeRawUnsafe(`ALTER TABLE farmer_profiles ADD COLUMN IF NOT EXISTS processor_id TEXT NULL`);
    await prisma.$executeRawUnsafe(`ALTER TABLE farmer_profiles ADD COLUMN IF NOT EXISTS assignment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_ASSIGNMENT'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE farmer_profiles ADD COLUMN IF NOT EXISTS coffee_varieties TEXT NULL`);

    // Fetch user and farm details
    const user = await prisma.user.findUnique({
      where: { userId },
      include: {
        farmerProfile: {
          include: {
            aggregator: {
              select: { fullName: true, phone: true }
            }
          }
        },
        role: true,
      },
    });

    if (!user || user.role.roleName !== 'FARMER') {
      res.status(403).json({ message: 'Access denied. Farmer profile not found.' });
      return;
    }

    // Fetch aggregated metrics
    const supplierRows = user.farmerProfile?.profileId
      ? await prisma.$queryRaw<Array<{ supplier_type: string | null; number_of_farms: number | null; preferred_washing_station: string | null; assignment_status: string | null; coffee_varieties: string | null }>>`
          SELECT supplier_type, number_of_farms, preferred_washing_station, assignment_status, coffee_varieties FROM farmer_profiles WHERE profile_id = ${user.farmerProfile.profileId}
        `
      : [];
    const supplierInfo = supplierRows[0] || { supplier_type: 'FARMER', number_of_farms: null, preferred_washing_station: null, assignment_status: null, coffee_varieties: null };
    const supplierType = supplierInfo.supplier_type || 'FARMER';

    let profileIds = [user.farmerProfile?.profileId].filter(Boolean) as string[];
    let userIds = [userId].filter(Boolean) as string[];
    if (supplierType === 'COOPERATIVE' && user.farmerProfile?.cooperativeId) {
      const memberProfiles = await prisma.farmerProfile.findMany({
        where: { cooperativeId: user.farmerProfile.cooperativeId },
        select: { profileId: true, userId: true }
      });
      const memberIds = memberProfiles.map(p => p.profileId);
      const memberUserIds = memberProfiles.map(p => p.userId);
      profileIds = [...new Set([...profileIds, ...memberIds])];
      userIds = [...new Set([...userIds, ...memberUserIds])];
    }

    const deliveryRecords = await prisma.deliveryRecord.findMany({
      where: { 
        profileId: { in: profileIds }
      }
    });

    const totalWeight = deliveryRecords.reduce((acc, record) => acc + Number(record.weightKg), 0);
    // Since PaymentTransaction doesn't directly link to DeliveryRecord in the DB class diagram, we will query them via payerId
    const payments = await prisma.paymentTransaction.findMany({
      where: { payerId: { in: userIds } }
    });
    
    const totalEarned = payments.reduce((acc, tx) => {
      return ['PAID', 'COMPLETED'].includes(tx.status) ? acc + Number(tx.amount) : acc;
    }, 0);
    const pendingPayment = payments.reduce((acc, tx) => {
      return ['PENDING', 'INITIATED'].includes(tx.status) ? acc + Number(tx.amount) : acc;
    }, 0);

    res.status(200).json({
      success: true,
      data: {
        profile: user.farmerProfile ? {
          ...user.farmerProfile,
          supplierType,
          numberOfFarms: supplierInfo.number_of_farms,
          preferredWashingStation: supplierInfo.preferred_washing_station,
          assignmentStatus: supplierInfo.assignment_status || 'PENDING_ASSIGNMENT',
          coffeeVarieties: supplierInfo.coffee_varieties || 'Red Bourbon',
        } : null,
        metrics: {
          totalDeliveries: deliveryRecords.length,
          totalWeight,
          totalEarned,
          pendingPayment,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching farmer dashboard:', error);
    res.status(500).json({ message: 'Server error retrieving dashboard' });
  }
};

export const getFarmerEudrStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rows = await getSupplierRiskStatus(req.user!.userId);
    const highRisk = rows.filter((row) => row.risk_level === 'HIGH').length;
    const mediumRisk = rows.filter((row) => row.risk_level === 'MEDIUM').length;
    const notVerified = rows.filter((row) => row.risk_level === 'NOT_VERIFIED').length;
    res.status(200).json({
      success: true,
      data: {
        rows,
        summary: {
          total: rows.length,
          highRisk,
          mediumRisk,
          notVerified,
          status: highRisk > 0 ? 'Needs Review' : notVerified > 0 ? 'Not Verified' : mediumRisk > 0 ? 'Monitor' : 'Clear',
        },
      },
    });
  } catch (error) {
    console.error('Error loading farmer EUDR status:', error);
    res.status(500).json({ message: 'Server error loading EUDR status' });
  }
};

export const updateFarmerProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const {
      farmName,
      gpsLocation,
      farmSizeHa,
      coordinates,
      numberOfFarms,
    } = req.body;

    await prisma.$executeRawUnsafe(`ALTER TABLE farmer_profiles ADD COLUMN IF NOT EXISTS number_of_farms INTEGER NULL`);

    const profileRows = await prisma.$queryRaw<Array<{ profile_id: string; supplier_type: string | null }>>`
      SELECT profile_id, supplier_type
      FROM farmer_profiles
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    const profile = profileRows[0];
    if (!profile) {
      res.status(404).json({ message: 'Farmer or cooperative profile not found' });
      return;
    }

    const cleanFarmName = farmName !== undefined ? String(farmName).trim() : null;
    const cleanLocation = gpsLocation !== undefined ? String(gpsLocation).trim() : null;
    const cleanCoordinates = coordinates !== undefined ? String(coordinates).trim() : null;
    const parsedFarmSize = farmSizeHa !== undefined && farmSizeHa !== '' ? Number(farmSizeHa) : null;
    const parsedNumberOfFarms = numberOfFarms !== undefined && numberOfFarms !== '' ? Number(numberOfFarms) : null;

    if (cleanCoordinates && !/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(cleanCoordinates)) {
      res.status(400).json({ message: 'Coordinates must be in "latitude, longitude" format' });
      return;
    }

    if (parsedFarmSize !== null && (!Number.isFinite(parsedFarmSize) || parsedFarmSize < 0)) {
      res.status(400).json({ message: 'Farm size must be a valid positive number' });
      return;
    }

    if (parsedNumberOfFarms !== null && (!Number.isFinite(parsedNumberOfFarms) || parsedNumberOfFarms < 0)) {
      res.status(400).json({ message: 'Number of farms must be a valid positive number' });
      return;
    }

    await prisma.$executeRaw`
      UPDATE farmer_profiles
      SET farm_name = COALESCE(${cleanFarmName || null}, farm_name),
          gps_location = COALESCE(${cleanLocation || null}, gps_location),
          farm_size_ha = COALESCE(${parsedFarmSize}, farm_size_ha),
          coordinates = COALESCE(${cleanCoordinates || null}, coordinates),
          number_of_farms = CASE
            WHEN supplier_type = 'COOPERATIVE' THEN COALESCE(${parsedNumberOfFarms}, number_of_farms)
            ELSE number_of_farms
          END
      WHERE profile_id = ${profile.profile_id}
    `;

    const updatedRows = await prisma.$queryRaw<Array<any>>`
      SELECT profile_id, user_id, farm_name, farm_size_ha, gps_location, coordinates, status,
             supplier_type, number_of_farms
      FROM farmer_profiles
      WHERE profile_id = ${profile.profile_id}
      LIMIT 1
    `;

    res.status(200).json({
      success: true,
      data: {
        profileId: updatedRows[0]?.profile_id,
        userId: updatedRows[0]?.user_id,
        farmName: updatedRows[0]?.farm_name,
        farmSizeHa: Number(updatedRows[0]?.farm_size_ha || 0),
        gpsLocation: updatedRows[0]?.gps_location,
        coordinates: updatedRows[0]?.coordinates,
        status: updatedRows[0]?.status,
        supplierType: updatedRows[0]?.supplier_type,
        numberOfFarms: updatedRows[0]?.number_of_farms,
      },
    });
  } catch (error) {
    console.error('Error updating farmer profile:', error);
    res.status(500).json({ message: 'Server error updating farmer profile' });
  }
};

export const getCooperativeMemberFarms = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    await ensureCooperativeMemberFarmsTable();
    const profileRows = await prisma.$queryRaw<Array<{ supplier_type: string | null }>>`
      SELECT supplier_type FROM farmer_profiles WHERE user_id = ${userId} LIMIT 1
    `;
    if (String(profileRows[0]?.supplier_type || '').toUpperCase() !== 'COOPERATIVE') {
      res.status(403).json({ message: 'Only cooperative supplier accounts can manage multiple farms.' });
      return;
    }

    const farms = await prisma.$queryRaw<Array<any>>`
      SELECT farm_id, farm_name, farm_location, coordinates, farm_size_ha, coffee_varieties, created_at
      FROM cooperative_member_farms
      WHERE cooperative_user_id = ${userId}
      ORDER BY created_at DESC
    `;

    res.status(200).json({
      success: true,
      data: farms.map((farm) => ({
        farmId: farm.farm_id,
        farmName: farm.farm_name,
        farmLocation: farm.farm_location,
        coordinates: farm.coordinates,
        farmSizeHa: farm.farm_size_ha !== null ? Number(farm.farm_size_ha) : null,
        coffeeVarieties: farm.coffee_varieties,
        createdAt: farm.created_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching cooperative farms:', error);
    res.status(500).json({ message: 'Server error fetching cooperative farms' });
  }
};

export const createCooperativeMemberFarm = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { farmName, farmLocation, coordinates, farmSizeHa, coffeeVarieties } = req.body;
    await ensureCooperativeMemberFarmsTable();

    const profileRows = await prisma.$queryRaw<Array<{ supplier_type: string | null }>>`
      SELECT supplier_type FROM farmer_profiles WHERE user_id = ${userId} LIMIT 1
    `;
    if (String(profileRows[0]?.supplier_type || '').toUpperCase() !== 'COOPERATIVE') {
      res.status(403).json({ message: 'Only cooperative supplier accounts can add member farms.' });
      return;
    }

    const cleanFarmName = String(farmName || '').trim();
    const cleanCoordinates = String(coordinates || '').trim();
    const cleanLocation = farmLocation ? String(farmLocation).trim() : null;
    const parsedFarmSize = farmSizeHa !== undefined && farmSizeHa !== '' ? Number(farmSizeHa) : null;

    if (!cleanFarmName) {
      res.status(400).json({ message: 'Farm name is required' });
      return;
    }
    if (!cleanCoordinates || !/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(cleanCoordinates)) {
      res.status(400).json({ message: 'Farm GPS coordinates are required in "latitude, longitude" format' });
      return;
    }
    if (parsedFarmSize !== null && (!Number.isFinite(parsedFarmSize) || parsedFarmSize < 0)) {
      res.status(400).json({ message: 'Farm size must be a valid positive number' });
      return;
    }

    const rows = await prisma.$queryRaw<Array<any>>`
      INSERT INTO cooperative_member_farms (
        cooperative_user_id, farm_name, farm_location, coordinates, farm_size_ha, coffee_varieties
      )
      VALUES (
        ${userId}, ${cleanFarmName}, ${cleanLocation}, ${cleanCoordinates}, ${parsedFarmSize}, ${coffeeVarieties ? String(coffeeVarieties) : null}
      )
      RETURNING farm_id, farm_name, farm_location, coordinates, farm_size_ha, coffee_varieties, created_at
    `;

    res.status(201).json({
      success: true,
      data: {
        farmId: rows[0].farm_id,
        farmName: rows[0].farm_name,
        farmLocation: rows[0].farm_location,
        coordinates: rows[0].coordinates,
        farmSizeHa: rows[0].farm_size_ha !== null ? Number(rows[0].farm_size_ha) : null,
        coffeeVarieties: rows[0].coffee_varieties,
        createdAt: rows[0].created_at,
      },
    });
  } catch (error) {
    console.error('Error creating cooperative farm:', error);
    res.status(500).json({ message: 'Server error creating cooperative farm' });
  }
};

export const getPriceTrends = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rows = await prisma.$queryRaw<Array<{ value: any }>>`
      SELECT value FROM admin_settings WHERE key = 'systemConfiguration' LIMIT 1
    `;
    const marketPrices = normalizeMarketPrices(rows[0]?.value || {});

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.status(200).json({
      success: true,
      data: {
        ...marketPrices,
        baselinePrice: `${marketPrices.currency} ${Number(marketPrices.baselineRatePerKg).toLocaleString()}/kg`,
        baselineChange: `${marketPrices.baselineChangePercent >= 0 ? '+' : ''}${marketPrices.baselineChangePercent.toFixed(1)}%`,
        grades: marketPrices.grades.map((grade: any) => ({
          ...grade,
          price: `${marketPrices.currency} ${Number(grade.pricePerKg).toLocaleString()}/kg`,
          change: `${grade.changePercent >= 0 ? '+' : ''}${grade.changePercent.toFixed(1)}%`,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching price trends:', error);
    res.status(500).json({ message: 'Server error retrieving price trends' });
  }
};

export const getFarmerPickups = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const user = await prisma.user.findUnique({ where: { userId }, include: { farmerProfile: true } });
    
    let profileIds = [user?.farmerProfile?.profileId].filter(Boolean) as string[];
    let userIds = [userId].filter(Boolean) as string[];

    const supplierRows = user?.farmerProfile?.profileId
      ? await prisma.$queryRaw<Array<{ supplier_type: string | null }>>`
          SELECT supplier_type FROM farmer_profiles WHERE profile_id = ${user.farmerProfile.profileId}
        `
      : [];
    const supplierType = supplierRows[0]?.supplier_type || 'FARMER';

    if (supplierType === 'COOPERATIVE' && user?.farmerProfile?.cooperativeId) {
      const memberProfiles = await prisma.farmerProfile.findMany({
        where: { cooperativeId: user.farmerProfile.cooperativeId },
        select: { profileId: true, userId: true }
      });
      const memberIds = memberProfiles.map(p => p.profileId);
      const memberUserIds = memberProfiles.map(p => p.userId);
      profileIds = [...new Set([...profileIds, ...memberIds])];
      userIds = [...new Set([...userIds, ...memberUserIds])];
    }

    const deliveries = await prisma.deliveryRecord.findMany({
      where: { profileId: { in: profileIds } },
      orderBy: { deliveryDate: 'desc' },
    });

    const payments = await prisma.paymentTransaction.findMany({
      where: { payerId: { in: userIds } },
    });

    const usedPaymentIds = new Set<string>();
    const pickupsWithPayments = deliveries.map((d) => {
      const linkedPayment = payments.find((payment) => payment.deliveryId === d.deliveryId);
      const payment = linkedPayment || matchPaymentForDelivery(d, payments, usedPaymentIds);
      if (payment) {
        usedPaymentIds.add(payment.txId);
      }

      return {
        ...d,
        receiptNo: `RCT-${d.deliveryId.slice(0, 8).toUpperCase()}`,
        status: normalizedPaymentStatus(payment),
        paymentMethod: payment ? payment.paymentMethod : 'MTN Mobile Money',
        paymentReference: payment?.referenceCode || null,
        paymentProcessedAt: payment?.processedAt || null,
        totalAmount: deliveryTotalAmount(d),
      };
    });

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.status(200).json({ success: true, data: pickupsWithPayments });
  } catch (error) {
    console.error('Error fetching farmer pickups:', error);
    res.status(500).json({ message: 'Server error retrieving pickups' });
  }
};

export const getFarmerPaymentReceipts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    await prisma.$executeRawUnsafe(`ALTER TABLE pickup_requests ADD COLUMN IF NOT EXISTS receipt_url TEXT NULL`);
    await prisma.$executeRawUnsafe(`ALTER TABLE pickup_requests ADD COLUMN IF NOT EXISTS receipt_file_name VARCHAR(255) NULL`);

    let userIds = [userId].filter(Boolean) as string[];
    const profileRows = await prisma.$queryRaw<Array<{ supplier_type: string | null, cooperative_id: string | null }>>`
      SELECT supplier_type, cooperative_id FROM farmer_profiles WHERE user_id = ${userId} LIMIT 1
    `;
    const supplierType = profileRows[0]?.supplier_type || 'FARMER';
    const cooperativeId = profileRows[0]?.cooperative_id || null;

    if (supplierType === 'COOPERATIVE' && cooperativeId) {
      const memberProfiles = await prisma.farmerProfile.findMany({
        where: { cooperativeId },
        select: { userId: true }
      });
      const memberUserIds = memberProfiles.map(p => p.userId);
      userIds = [...new Set([...userIds, ...memberUserIds])];
    }

    const quotedUserIds = userIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',');
    const receipts = await prisma.$queryRawUnsafe<Array<{
      request_id: string;
      requested_date: Date;
      pickup_date: Date | null;
      weight_estimate: any;
      farm_location: string | null;
      receipt_url: string | null;
      receipt_file_name: string | null;
      status: string;
      notes: string | null;
    }>>(
      `SELECT request_id, requested_date, pickup_date, weight_estimate, farm_location, receipt_url, receipt_file_name, status, notes
       FROM pickup_requests
       WHERE farmer_id IN (${quotedUserIds})
       ORDER BY COALESCE(pickup_date, requested_date) DESC`
    );

    res.status(200).json({
      success: true,
      data: receipts.map((receipt) => ({
        requestId: receipt.request_id,
        receiptNo: `RCT-${receipt.request_id.slice(0, 8).toUpperCase()}`,
        requestedDate: receipt.requested_date,
        pickupDate: receipt.pickup_date,
        weightKg: Number(receipt.weight_estimate || 0),
        farmLocation: receipt.farm_location,
        receiptUrl: receipt.receipt_url,
        receiptFileName: receipt.receipt_file_name,
        status: receipt.status,
        notes: receipt.notes,
      })),
    });
  } catch (error) {
    console.error('Error fetching farmer payment receipts:', error);
    res.status(500).json({ message: 'Server error retrieving payment receipts' });
  }
};

export const requestPickup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { weightEstimate, notes, requestedDate, farmCoordinates, farmLocation, coffeeVariety } = req.body;
    const estimatedWeightKg = Number(weightEstimate);

    if (!weightEstimate) {
      res.status(400).json({ message: 'Weight estimate is required' });
      return;
    }

    if (!Number.isFinite(estimatedWeightKg) || estimatedWeightKg < 100) {
      res.status(400).json({ message: 'Pickup request must be at least 100 kg of coffee cherry' });
      return;
    }

    await prisma.$executeRawUnsafe(`ALTER TABLE farmer_profiles ADD COLUMN IF NOT EXISTS assignment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_ASSIGNMENT'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE farmer_profiles ADD COLUMN IF NOT EXISTS coffee_varieties TEXT NULL`);
    await prisma.$executeRawUnsafe(`ALTER TABLE pickup_requests ADD COLUMN IF NOT EXISTS coffee_variety VARCHAR(100) NULL`);
    await ensureCooperativeMemberFarmsTable();
    const assignmentRows = await prisma.$queryRaw<Array<{ aggregator_id: string | null; assignment_status: string | null }>>`
      SELECT aggregator_id, assignment_status
      FROM farmer_profiles
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    const assignment = assignmentRows[0];
    if (!assignment?.aggregator_id || assignment.assignment_status !== 'APPROVED') {
      res.status(403).json({
        message: 'You must be assigned to an aggregator before requesting pickup. Send a washing station connection request first.',
      });
      return;
    }

    const farmerProfile = await prisma.farmerProfile.findUnique({
      where: { userId: userId! },
      select: { coordinates: true, gpsLocation: true },
    });
    const varietyRows = await prisma.$queryRaw<Array<{ coffee_varieties: string | null; supplier_type: string | null }>>`
      SELECT coffee_varieties, supplier_type FROM farmer_profiles WHERE user_id = ${userId} LIMIT 1
    `;
    const isCooperativeSupplier = String(varietyRows[0]?.supplier_type || '').toUpperCase() === 'COOPERATIVE';
    const memberFarmRows = isCooperativeSupplier
      ? await prisma.$queryRaw<Array<{ coffee_varieties: string | null }>>`
          SELECT coffee_varieties FROM cooperative_member_farms WHERE cooperative_user_id = ${userId}
        `
      : [];

    const requestCoordinates = farmCoordinates || farmerProfile?.coordinates || null;
    const requestLocation = farmLocation || farmerProfile?.gpsLocation || null;
    const profileVarieties = String(varietyRows[0]?.coffee_varieties || '').split(',').map(item => item.trim()).filter(Boolean);
    const memberFarmVarieties = Array.from(new Set(
      memberFarmRows
        .flatMap(row => String(row.coffee_varieties || '').split(','))
        .map(item => item.trim())
        .filter(Boolean)
    ));
    const savedVarieties = memberFarmVarieties.length ? memberFarmVarieties : profileVarieties;
    const requestedCoffeeVariety = String(coffeeVariety || savedVarieties[0] || 'Red Bourbon').trim();

    const pickupRequest = await prisma.pickupRequest.create({
      data: {
        farmerId: userId!,
        weightEstimate: estimatedWeightKg,
        notes,
        requestedDate: requestedDate ? new Date(requestedDate) : new Date(),
        status: 'PENDING',
      }
    });

    await prisma.$executeRaw`
      UPDATE pickup_requests
      SET farm_coordinates = ${requestCoordinates},
          farm_location = ${requestLocation},
          coffee_variety = ${requestedCoffeeVariety}
      WHERE request_id = ${pickupRequest.requestId}
    `;

    res.status(201).json({
      success: true,
      data: {
        ...pickupRequest,
        farmCoordinates: requestCoordinates,
        farmLocation: requestLocation,
        coffeeVariety: requestedCoffeeVariety,
      },
    });
  } catch (error) {
    console.error('Error creating pickup request:', error);
    res.status(500).json({ message: 'Server error creating pickup request' });
  }
};

export const getFarmerPickupRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    await prisma.$executeRawUnsafe(`ALTER TABLE pickup_requests ADD COLUMN IF NOT EXISTS coffee_variety VARCHAR(100) NULL`);
    
    const requests = await prisma.pickupRequest.findMany({
      where: { farmerId: userId },
      orderBy: { createdAt: 'desc' },
    });
    const requestIds = requests.map(request => request.requestId);
    const varietyRows = requestIds.length
      ? await prisma.$queryRawUnsafe<Array<{ request_id: string; coffee_variety: string | null }>>(
          `SELECT request_id, coffee_variety FROM pickup_requests WHERE request_id IN (${requestIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',')})`
        )
      : [];
    const varietyByRequest = new Map(varietyRows.map(row => [row.request_id, row.coffee_variety]));

    res.status(200).json({
      success: true,
      data: requests.map(request => ({
        ...request,
        coffeeVariety: varietyByRequest.get(request.requestId) || null,
      })),
    });
  } catch (error) {
    console.error('Error fetching pickup requests:', error);
    res.status(500).json({ message: 'Server error retrieving pickup requests' });
  }
};

export const getWashingStationConnection = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    await ensureWashingStationRequestTable();
    await prisma.$executeRawUnsafe(`ALTER TABLE farmer_profiles ADD COLUMN IF NOT EXISTS preferred_washing_station VARCHAR(150) NULL`);
    await prisma.$executeRawUnsafe(`ALTER TABLE farmer_profiles ADD COLUMN IF NOT EXISTS assignment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_ASSIGNMENT'`);

    const [stations, profileRows, requests] = await Promise.all([
      prisma.warehouseLocation.findMany({
        where: { type: 'Washing Station', status: 'active' },
        orderBy: { name: 'asc' },
        select: { locationId: true, name: true, district: true, address: true, gpsLocation: true },
      }),
      prisma.$queryRaw<Array<{ preferred_washing_station: string | null; assignment_status: string | null; aggregator_name: string | null; aggregator_phone: string | null }>>`
        SELECT fp.preferred_washing_station, fp.assignment_status, ag.full_name AS aggregator_name, ag.phone AS aggregator_phone
        FROM farmer_profiles fp
        LEFT JOIN users ag ON ag.user_id = fp.aggregator_id
        WHERE fp.user_id = ${userId}
        LIMIT 1
      `,
      prisma.$queryRaw<Array<{
        request_id: string;
        washing_station_name: string;
        current_washing_station: string | null;
        reason: string | null;
        status: string;
        assigned_aggregator_id: string | null;
        created_at: Date;
        reviewed_at: Date | null;
      }>>`
        SELECT request_id, washing_station_name, current_washing_station, reason, status, assigned_aggregator_id, created_at, reviewed_at
        FROM washing_station_requests
        WHERE supplier_id = ${userId}
        ORDER BY created_at DESC
      `,
    ]);

    res.status(200).json({
      success: true,
      data: {
        stations,
        current: profileRows[0] || null,
        requests,
      },
    });
  } catch (error) {
    console.error('Error loading washing station connection:', error);
    res.status(500).json({ message: 'Server error loading washing station connection' });
  }
};

export const createWashingStationRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { washingStationName, reason } = req.body;
    await ensureWashingStationRequestTable();
    await prisma.$executeRawUnsafe(`ALTER TABLE farmer_profiles ADD COLUMN IF NOT EXISTS preferred_washing_station VARCHAR(150) NULL`);

    if (!washingStationName) {
      res.status(400).json({ message: 'Washing station is required' });
      return;
    }

    const station = await prisma.warehouseLocation.findFirst({
      where: { name: washingStationName, type: 'Washing Station', status: 'active' },
    });
    if (!station) {
      res.status(404).json({ message: 'Selected washing station was not found' });
      return;
    }

    const profileRows = await prisma.$queryRaw<Array<{ preferred_washing_station: string | null }>>`
      SELECT preferred_washing_station FROM farmer_profiles WHERE user_id = ${userId} LIMIT 1
    `;
    const currentStation = profileRows[0]?.preferred_washing_station || null;

    const pendingRows = await prisma.$queryRaw<Array<{ request_id: string }>>`
      SELECT request_id FROM washing_station_requests
      WHERE supplier_id = ${userId} AND status = 'PENDING'
      LIMIT 1
    `;
    if (pendingRows.length > 0) {
      res.status(409).json({ message: 'You already have a pending washing station request.' });
      return;
    }

    const rows = await prisma.$queryRaw<Array<{ request_id: string; washing_station_name: string; current_washing_station: string | null; reason: string | null; status: string; created_at: Date }>>`
      INSERT INTO washing_station_requests (supplier_id, washing_station_name, current_washing_station, reason, status)
      VALUES (${userId}, ${washingStationName}, ${currentStation}, ${reason || null}, 'PENDING')
      RETURNING request_id, washing_station_name, current_washing_station, reason, status, created_at
    `;

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error creating washing station request:', error);
    res.status(500).json({ message: 'Server error creating washing station request' });
  }
};

export const getFarmerTraceability = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const user = await prisma.user.findUnique({ where: { userId }, include: { farmerProfile: true } });

    if (!user || !user.farmerProfile) {
      res.status(403).json({ message: 'Access denied. Farmer profile not found.' });
      return;
    }
    const farmerProfile = user.farmerProfile;
    
    // Find all delivery records for this farmer that are part of a batch
    const deliveries = await prisma.deliveryRecord.findMany({
      where: { 
        profileId: farmerProfile.profileId,
        batchId: { not: '' }
      },
      orderBy: { deliveryDate: 'desc' }
    });

    const batchIds = [...new Set(deliveries.map(d => d.batchId).filter(id => id))];

    if (batchIds.length === 0) {
      res.status(200).json({ success: true, data: [] });
      return;
    }

    let resolvedBatchIds = [...batchIds];
    const groupChildrenById = new Map<string, string[]>();
    const batchGroupMap = new Map<string, string | null>();
    const quotedBatchIds = batchIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',');
    const groupRows = await prisma.$queryRawUnsafe<Array<{ batch_id: string; batch_group_id: string | null }>>(
      `SELECT batch_id, batch_group_id FROM coffee_batches WHERE batch_id IN (${quotedBatchIds}) OR batch_group_id IN (${quotedBatchIds})`
    );

    groupRows.forEach((row) => {
      batchGroupMap.set(row.batch_id, row.batch_group_id);
      if (row.batch_group_id) {
        const children = groupChildrenById.get(row.batch_group_id) || [];
        children.push(row.batch_id);
        groupChildrenById.set(row.batch_group_id, children);
      }
    });
    resolvedBatchIds = [...new Set([...batchIds, ...groupRows.map((row) => row.batch_id)])];

    const batches = await prisma.coffeeBatch.findMany({
      where: { batchId: { in: resolvedBatchIds } },
      include: {
        checkpointLogs: {
          include: {
            scannedBy: {
              select: { fullName: true, role: { select: { roleName: true } } }
            }
          },
          orderBy: { timestamp: 'asc' }
        },
        transportLogs: {
          include: {
            scannedBy: {
              select: { fullName: true, role: { select: { roleName: true } } }
            }
          },
          orderBy: { departureTime: 'asc' }
        },
        qualityAssessments: {
          include: {
            assessor: {
              select: { fullName: true, role: { select: { roleName: true } } }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        shippingRecords: {
          orderBy: { shippedAt: 'desc' }
        },
      },
      orderBy: { createdAt: 'desc' }
    });

    const deliveryByBatch = deliveries.reduce<Record<string, typeof deliveries>>((acc, delivery) => {
      acc[delivery.batchId] = acc[delivery.batchId] || [];
      acc[delivery.batchId].push(delivery);
      (groupChildrenById.get(delivery.batchId) || []).forEach((childBatchId) => {
        acc[childBatchId] = acc[childBatchId] || [];
        acc[childBatchId].push(delivery);
      });
      return acc;
    }, {});

    const roadByShipment = new Map<string, any>();
    const shipmentIds = batches.flatMap(batch => batch.shippingRecords.map(shipment => shipment.shipmentId));
    if (shipmentIds.length > 0) {
      try {
        const quotedShipmentIds = shipmentIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',');
        const roadRows = await prisma.$queryRawUnsafe<Array<any>>(
          `SELECT * FROM road_transport_records WHERE shipment_id IN (${quotedShipmentIds})`
        );
        const roadIds = roadRows.map(row => row.road_transport_id);
        let checkpointRows: any[] = [];

        if (roadIds.length > 0) {
          const quotedRoadIds = roadIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',');
          checkpointRows = await prisma.$queryRawUnsafe<Array<any>>(
            `SELECT * FROM road_transit_checkpoints WHERE road_transport_id IN (${quotedRoadIds}) ORDER BY recorded_at ASC`
          );
        }

        roadRows.forEach((road) => {
          roadByShipment.set(road.shipment_id, {
            ...road,
            checkpoints: checkpointRows.filter(checkpoint => checkpoint.road_transport_id === road.road_transport_id)
          });
        });
      } catch {
        // The road trace tables are optional until a logistics road journey is recorded.
      }
    }

    const traceabilityData = batches.map(batch => {
      const journey: any[] = [];
      const createdDate = new Date(batch.createdAt);
      const farmerDeliveries = deliveryByBatch[batch.batchId] || [];
      const totalDeliveredKg = farmerDeliveries.reduce((sum, delivery) => sum + Number(delivery.weightKg), 0);
      
      journey.push({
        stage: 'Farm',
        date: createdDate.toISOString(),
        location: farmerProfile.gpsLocation || batch.district,
        blockchainHash: `0x${batch.batchId.replace(/-/g, '').substring(0, 12)}...`,
        actors: [farmerProfile.farmName || user.fullName || 'Your Farm'],
        notes: `${totalDeliveredKg.toLocaleString()} kg delivered by this farmer`
      });

      batch.checkpointLogs.forEach(log => {
        journey.push({
          stage: log.checkpointType,
          date: log.timestamp.toISOString(),
          location: log.locationName,
          blockchainHash: `0x${log.logId.replace(/-/g, '').substring(0, 12)}...`,
          actors: [log.scannedBy.fullName || log.scannedBy.role.roleName],
          notes: log.notes || 'Checkpoint scan recorded'
        });
      });

      batch.transportLogs.forEach(log => {
        journey.push({
          stage: 'Transport',
          date: log.departureTime.toISOString(),
          location: log.arrivalTime ? 'Arrived at destination' : 'In transit',
          blockchainHash: `0x${log.logId.replace(/-/g, '').substring(0, 12)}...`,
          actors: [log.scannedBy.fullName || log.scannedBy.role.roleName],
          notes: `${log.transportMethod} - ${log.condition}${log.notes ? ` - ${log.notes}` : ''}`
        });
      });

      batch.qualityAssessments.forEach(assessment => {
        journey.push({
          stage: 'Quality Control',
          date: assessment.createdAt.toISOString(),
          location: batch.washingStation || batch.district,
          blockchainHash: `0x${assessment.assessmentId.replace(/-/g, '').substring(0, 12)}...`,
          actors: [assessment.assessor.fullName || assessment.assessor.role.roleName],
          notes: `Cupping ${Number(assessment.cuppingScore).toFixed(1)} / 100, moisture ${Number(assessment.moisture).toFixed(1)}%`
        });
      });

      batch.shippingRecords.forEach(shipment => {
        const road = roadByShipment.get(shipment.shipmentId);
        if (road?.departure_time) {
          journey.push({
            stage: 'Road Dispatch',
            date: new Date(road.departure_time).toISOString(),
            location: `${road.origin_location} to ${road.destination_port}`,
            blockchainHash: `0x${road.road_transport_id.replace(/-/g, '').substring(0, 12)}...`,
            actors: ['Logistics Coordinator'],
            notes: `${road.truck_plate} - seal ${road.seal_no || 'not recorded'}`
          });
        }

        (road?.checkpoints || []).forEach((checkpoint: any) => {
          journey.push({
            stage: `Road Transit - ${checkpoint.event_type}`,
            date: new Date(checkpoint.recorded_at).toISOString(),
            location: checkpoint.checkpoint_name,
            blockchainHash: `0x${checkpoint.checkpoint_id.replace(/-/g, '').substring(0, 12)}...`,
            actors: ['Logistics Coordinator'],
            notes: `${checkpoint.scan_code ? `QR ${checkpoint.scan_code} - ` : ''}Seal ${checkpoint.seal_condition || 'not checked'}${checkpoint.notes ? ` - ${checkpoint.notes}` : ''}`
          });
        });

        journey.push({
          stage: 'Shipping',
          date: (shipment.shippedAt || createdDate).toISOString(),
          location: `${shipment.portLoading} to ${shipment.portDestination}`,
          blockchainHash: `0x${shipment.shipmentId.replace(/-/g, '').substring(0, 12)}...`,
          actors: ['Logistics / Export Team'],
          notes: `${shipment.status} - ${shipment.containerNo} / ${shipment.vesselName}`
        });
      });

      journey.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const latestQuality = batch.qualityAssessments[0];

      return {
        batchId: batch.batchId,
        batchGroupId: batchGroupMap.get(batch.batchId) || null,
        batchName: batch.qrCode,
        status: batch.status,
        district: batch.district,
        washingStation: batch.washingStation,
        farmName: batch.farmName,
        weightCherry: Number(batch.weightCherry),
        farmerDeliveryKg: totalDeliveredKg,
        deliveries: farmerDeliveries.map(delivery => ({
          deliveryId: delivery.deliveryId,
          deliveryDate: delivery.deliveryDate.toISOString(),
          weightKg: Number(delivery.weightKg),
          buyer: delivery.buyer,
          pricePerKg: Number(delivery.pricePerKg),
        })),
        qualityFeedback: latestQuality ? {
          assessmentId: latestQuality.assessmentId,
          cuppingScore: Number(latestQuality.cuppingScore),
          moisture: Number(latestQuality.moisture),
          defects: latestQuality.defects || {},
          notes: latestQuality.notes || '',
          assessedAt: latestQuality.createdAt.toISOString(),
          assessor: latestQuality.assessor.fullName || latestQuality.assessor.role.roleName,
        } : null,
        checkpointHistory: batch.checkpointLogs.map(log => ({
          logId: log.logId,
          checkpointType: log.checkpointType,
          locationName: log.locationName,
          timestamp: log.timestamp.toISOString(),
          scannedBy: log.scannedBy.fullName || log.scannedBy.role.roleName,
          notes: log.notes,
        })),
        transportHistory: batch.transportLogs.map(log => ({
          logId: log.logId,
          transportMethod: log.transportMethod,
          departureTime: log.departureTime.toISOString(),
          arrivalTime: log.arrivalTime?.toISOString() || null,
          condition: log.condition,
          scannedBy: log.scannedBy.fullName || log.scannedBy.role.roleName,
          notes: log.notes,
        })),
        shipments: batch.shippingRecords.map(shipment => {
          const road = roadByShipment.get(shipment.shipmentId);
          return {
            shipmentId: shipment.shipmentId,
            containerNo: shipment.containerNo,
            vesselName: shipment.vesselName,
            portLoading: shipment.portLoading,
            portDestination: shipment.portDestination,
            status: shipment.status,
            shippedAt: shipment.shippedAt?.toISOString() || null,
            roadTransport: road ? {
              roadTransportId: road.road_transport_id,
              truckPlate: road.truck_plate,
              driverName: road.driver_name,
              originLocation: road.origin_location,
              destinationPort: road.destination_port,
              status: road.status,
              departureTime: road.departure_time ? new Date(road.departure_time).toISOString() : null,
              checkpoints: road.checkpoints.map((checkpoint: any) => ({
                checkpointId: checkpoint.checkpoint_id,
                checkpointName: checkpoint.checkpoint_name,
                eventType: checkpoint.event_type,
                sealCondition: checkpoint.seal_condition,
                recordedAt: new Date(checkpoint.recorded_at).toISOString()
              }))
            } : null
          };
        }),
        journey
      };
    });

    res.status(200).json({ success: true, data: traceabilityData });
  } catch (error) {
    console.error('Error fetching farmer traceability:', error);
    res.status(500).json({ message: 'Server error fetching traceability' });
  }
};

export const getCommunityTopics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureFarmerRequirementTables();
    const posts = await prisma.$queryRaw<Array<any>>`
      SELECT
        cp.post_id,
        cp.group_id,
        cp.content,
        cp.created_at,
        u.full_name AS author,
        COUNT(DISTINCT cr.reply_id)::int AS replies,
        COUNT(DISTINCT react.reaction_id)::int AS likes,
        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'replyId', cr.reply_id,
              'content', cr.content,
              'author', ru.full_name,
              'createdAt', cr.created_at
            )
          ) FILTER (WHERE cr.reply_id IS NOT NULL),
          '[]'
        ) AS reply_items
      FROM community_posts cp
      JOIN users u ON u.user_id = cp.author_id
      LEFT JOIN community_replies cr ON cr.post_id = cp.post_id AND cr.status = 'active'
      LEFT JOIN users ru ON ru.user_id = cr.author_id
      LEFT JOIN community_reactions react ON react.post_id = cp.post_id
      WHERE cp.status = 'active'
      GROUP BY cp.post_id, cp.group_id, cp.content, cp.created_at, u.full_name
      ORDER BY cp.created_at DESC
    `;

    const mapped = posts.map(post => ({
      id: post.post_id,
      title: post.content.substring(0, 50) + (post.content.length > 50 ? '...' : ''),
      excerpt: post.content,
      category: post.group_id,
      author: post.author || 'Anonymous Farmer',
      replies: Number(post.replies || 0),
      likes: Number(post.likes || 0),
      replyItems: post.reply_items || [],
      views: Number(post.replies || 0) + Number(post.likes || 0) + 1,
      lastActivity: new Date(post.created_at).toLocaleDateString()
    }));
    res.status(200).json({ success: true, data: mapped });
  } catch (error) {
    console.error('Error retrieving community topics:', error);
    res.status(500).json({ message: 'Server error retrieving community topics' });
  }
};

export const createCommunityPost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { groupId = 'farmer-community', content, imageUrl } = req.body;
    if (!content || String(content).trim().length < 5) {
      res.status(400).json({ message: 'Community post content is required' });
      return;
    }
    const post = await prisma.communityPost.create({
      data: {
        authorId: req.user!.userId,
        groupId,
        content,
        imageUrl: imageUrl || null,
        status: 'active',
      },
      include: { author: true }
    });
    res.status(201).json({ success: true, data: post });
  } catch (error) {
    console.error('Error creating community post:', error);
    res.status(500).json({ message: 'Server error creating community post' });
  }
};

export const createCommunityReply = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureFarmerRequirementTables();
    const { postId } = req.params;
    const { content } = req.body;
    if (!content || String(content).trim().length < 2) {
      res.status(400).json({ message: 'Reply content is required' });
      return;
    }
    const rows = await prisma.$queryRaw<Array<any>>`
      INSERT INTO community_replies (post_id, author_id, content)
      VALUES (${postId}, ${req.user!.userId}, ${String(content).trim()})
      RETURNING *
    `;
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error creating community reply:', error);
    res.status(500).json({ message: 'Server error creating community reply' });
  }
};

export const toggleCommunityLike = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureFarmerRequirementTables();
    const { postId } = req.params;
    const deleted = await prisma.$queryRaw<Array<any>>`
      DELETE FROM community_reactions
      WHERE post_id = ${postId} AND user_id = ${req.user!.userId} AND reaction_type = 'like'
      RETURNING reaction_id
    `;
    if (deleted.length > 0) {
      res.status(200).json({ success: true, liked: false });
      return;
    }
    await prisma.$executeRaw`
      INSERT INTO community_reactions (post_id, user_id, reaction_type)
      VALUES (${postId}, ${req.user!.userId}, 'like')
      ON CONFLICT ("post_id", "user_id", "reaction_type") DO NOTHING
    `;
    res.status(200).json({ success: true, liked: true });
  } catch (error) {
    console.error('Error toggling community like:', error);
    res.status(500).json({ message: 'Server error updating community like' });
  }
};

export const getKnowledgeArticles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const articles = await prisma.knowledgeArticle.findMany({
      orderBy: { publishedAt: 'desc' }
    });
    res.status(200).json({ success: true, data: articles });
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving knowledge articles' });
  }
};

export const getSupportTickets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { farmerId: req.user!.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving support tickets' });
  }
};

export const getServiceRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureFarmerRequirementTables();
    const rows = await prisma.$queryRaw<Array<any>>`
      SELECT * FROM farmer_service_requests
      WHERE farmer_id = ${req.user!.userId}
      ORDER BY created_at DESC
    `;
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching farmer service requests:', error);
    res.status(500).json({ message: 'Server error retrieving service requests' });
  }
};

export const createServiceRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureFarmerRequirementTables();
    const { requestType, description, quantity, preferredDate } = req.body;
    if (!requestType || !description) {
      res.status(400).json({ message: 'requestType and description are required' });
      return;
    }
    const rows = await prisma.$queryRaw<Array<any>>`
      INSERT INTO farmer_service_requests (farmer_id, request_type, description, quantity, preferred_date)
      VALUES (${req.user!.userId}, ${requestType}, ${description}, ${quantity || null}, ${preferredDate ? new Date(preferredDate) : null})
      RETURNING *
    `;
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error creating farmer service request:', error);
    res.status(500).json({ message: 'Server error creating service request' });
  }
};

export const createSupportTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ticket = await prisma.supportTicket.create({
      data: {
        farmerId: req.user!.userId,
        subject: req.body.subject,
        category: req.body.category,
        description: req.body.description,
      }
    });
    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ message: 'Server error creating support ticket' });
  }
};
