import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import prisma from '../config/db';
import { createNotification } from './notificationController';

const MIN_PROCESSING_CHERRY_KG = 100;
const MAX_PROCESSING_CHERRY_KG = 500;

const evaluateProcessingBatchWeight = (weightKg: number) => {
  if (weightKg < MIN_PROCESSING_CHERRY_KG) {
    return {
      code: 'needs_consolidation',
      label: 'Needs Consolidation',
      canProcess: false,
      message: `Batch is below ${MIN_PROCESSING_CHERRY_KG} kg and must be consolidated before fermentation/drying.`,
    };
  }

  if (weightKg > MAX_PROCESSING_CHERRY_KG) {
    return {
      code: 'split_required',
      label: 'Split Required',
      canProcess: false,
      message: `Batch exceeds ${MAX_PROCESSING_CHERRY_KG} kg and must be split before fermentation/drying.`,
    };
  }

  return {
    code: 'valid_processing_cycle',
    label: 'Valid Processing Cycle',
    canProcess: true,
    message: `Batch is within the ${MIN_PROCESSING_CHERRY_KG}-${MAX_PROCESSING_CHERRY_KG} kg CWS processing range.`,
  };
};

const normalizeStatus = (status: string) => {
  const map: Record<string, string> = {
    pending_transport: 'In Transit',
    needs_consolidation: 'Needs Consolidation',
    split_required: 'Split Required',
    received: 'Received',
    arrived_washing_station: 'Received',
    processing: 'Processing',
    ready_for_quality: 'Quality Check',
    quality_assessed: 'Dispatched',
  };
  return map[status] || status;
};

const toRawProcessorStatus = (status: string) => {
  const map: Record<string, string> = {
    'In Transit': 'pending_transport',
    Received: 'received',
    Processing: 'processing',
    'Quality Check': 'ready_for_quality',
    Dispatched: 'quality_assessed',
    'Needs Consolidation': 'needs_consolidation',
    'Split Required': 'split_required',
    pending_transport: 'pending_transport',
    needs_consolidation: 'needs_consolidation',
    split_required: 'split_required',
    received: 'received',
    processing: 'processing',
    ready_for_quality: 'ready_for_quality',
    quality_assessed: 'quality_assessed',
  };
  return map[status] || status;
};

const processorInclude = {
  inventoryItems: {
    include: { warehouse: true, stockMovements: true },
    orderBy: { fifoDate: 'asc' as const }
  },
  checkpointLogs: { orderBy: { timestamp: 'asc' as const } },
  transportLogs: { orderBy: { departureTime: 'desc' as const } },
  qualityAssessments: { orderBy: { createdAt: 'desc' as const } },
};

const enrichBatch = (batch: any) => {
  const status = normalizeStatus(batch.status);
  const processingWeightRule = evaluateProcessingBatchWeight(Number(batch.weightCherry || 0));
  const latestTransport = batch.transportLogs?.[0];
  const latestQuality = batch.qualityAssessments?.[0];
  const processingLogs = (batch.checkpointLogs || []).filter((log: any) =>
    ['Processing Step', 'Quality Intake', 'Processing Completed', 'Maintenance Downtime'].includes(log.checkpointType)
  );
  const completed = (batch.checkpointLogs || []).find((log: any) => log.checkpointType === 'Processing Completed');
  const handoffHours = completed && latestQuality
    ? Math.max(0, (new Date(latestQuality.createdAt).getTime() - new Date(completed.timestamp).getTime()) / 3600000)
    : null;
  return {
    ...batch,
    status,
    rawStatus: batch.status,
    processingWeightRule,
    transitHours: latestTransport?.departureTime
      ? Math.max(0, ((latestTransport.arrivalTime ? new Date(latestTransport.arrivalTime).getTime() : Date.now()) - new Date(latestTransport.departureTime).getTime()) / 3600000)
      : null,
    arrivalCondition: latestTransport?.condition || null,
    processingLogs,
    latestQuality: latestQuality ? {
      cuppingScore: Number(latestQuality.cuppingScore),
      moisture: Number(latestQuality.moisture),
      defects: latestQuality.defects,
      notes: latestQuality.notes,
      createdAt: latestQuality.createdAt,
    } : null,
    handoffHours,
  };
};

const attachBatchGroupIds = async (batches: any[]) => {
  if (batches.length === 0) return batches;
  const quotedBatchIds = batches.map((batch) => `'${batch.batchId.replace(/'/g, "''")}'`).join(',');
  const rows = await prisma.$queryRawUnsafe<Array<{ batch_id: string; batch_group_id: string | null }>>(
    `SELECT batch_id, batch_group_id FROM coffee_batches WHERE batch_id IN (${quotedBatchIds})`
  );
  const groupMap = new Map(rows.map((row) => [row.batch_id, row.batch_group_id]));
  return batches.map((batch) => ({ ...batch, batchGroupId: groupMap.get(batch.batchId) || null }));
};

const getProcessorStationNames = async (processorId: string) => {
  const rows = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT name
    FROM warehouse_locations
    WHERE type = 'Washing Station'
      AND status = 'active'
      AND processor_id = ${processorId}
    ORDER BY name ASC
  `;
  return rows.map((row) => row.name).filter(Boolean);
};

const processorStationBatchWhere = (stationNames: string[]) => ({
  washingStation: { in: stationNames },
});

const assertProcessorCanAccessBatch = async (processorId: string, batchId: string) => {
  const stationNames = await getProcessorStationNames(processorId);
  if (stationNames.length === 0) {
    return { allowed: false, stationNames, batch: null as any, message: 'No washing station is assigned to this processor account.' };
  }

  const batch = await prisma.coffeeBatch.findFirst({
    where: {
      batchId,
      ...processorStationBatchWhere(stationNames),
    },
  });

  if (!batch) {
    return { allowed: false, stationNames, batch: null as any, message: 'Batch not found for your assigned washing station.' };
  }

  return { allowed: true, stationNames, batch, message: '' };
};

const quotedSqlList = (values: string[]) => values.map((value) => `'${value.replace(/'/g, "''")}'`).join(',');

const ensureInventoryWorkflowTables = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "inventory_reconciliations" (
      "reconciliation_id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "item_id" TEXT NOT NULL REFERENCES "inventory_items"("item_id") ON DELETE CASCADE,
      "system_quantity_kg" NUMERIC(12,2) NOT NULL,
      "physical_quantity_kg" NUMERIC(12,2) NOT NULL,
      "variance_kg" NUMERIC(12,2) NOT NULL,
      "notes" TEXT NULL,
      "created_by" TEXT NULL REFERENCES "users"("user_id"),
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
};

const ensureCorrectiveActionTable = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "corrective_actions" (
      "action_id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "assessment_id" TEXT NULL REFERENCES "quality_assessments"("assessment_id") ON DELETE SET NULL,
      "batch_id" TEXT NOT NULL REFERENCES "coffee_batches"("batch_id") ON DELETE CASCADE,
      "issue_type" VARCHAR(80) NOT NULL,
      "severity" VARCHAR(30) NOT NULL DEFAULT 'Medium',
      "responsible_role" VARCHAR(50) NOT NULL DEFAULT 'PROCESSOR',
      "required_action" TEXT NOT NULL,
      "deadline" TIMESTAMP NULL,
      "status" VARCHAR(50) NOT NULL DEFAULT 'Assigned',
      "submitted_notes" TEXT NULL,
      "evidence" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "created_by" TEXT NULL REFERENCES "users"("user_id") ON DELETE SET NULL,
      "submitted_by" TEXT NULL REFERENCES "users"("user_id") ON DELETE SET NULL,
      "reviewed_by" TEXT NULL REFERENCES "users"("user_id") ON DELETE SET NULL,
      "review_notes" TEXT NULL,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "submitted_at" TIMESTAMP NULL,
      "reviewed_at" TIMESTAMP NULL
    )
  `);
};

const ensureSupplierAssignmentColumns = async () => {
  await prisma.$executeRawUnsafe(`ALTER TABLE farmer_profiles ADD COLUMN IF NOT EXISTS preferred_washing_station VARCHAR(150) NULL`);
  await prisma.$executeRawUnsafe(`ALTER TABLE farmer_profiles ADD COLUMN IF NOT EXISTS processor_id TEXT NULL`);
  await prisma.$executeRawUnsafe(`ALTER TABLE farmer_profiles ADD COLUMN IF NOT EXISTS assignment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_ASSIGNMENT'`);
  await prisma.$executeRawUnsafe(`ALTER TABLE warehouse_locations ADD COLUMN IF NOT EXISTS processor_id TEXT NULL REFERENCES users(user_id)`);
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
};

export const getProcessorCorrectiveActions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureCorrectiveActionTable();
    const stationNames = await getProcessorStationNames(req.user!.userId);
    if (stationNames.length === 0) {
      res.status(200).json({ success: true, data: [] });
      return;
    }
    const stationList = quotedSqlList(stationNames);
    const rows = await prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT ca.*,
             cb.qr_code, cb.farm_name, cb.district, cb.washing_station, cb.status AS batch_status,
             qa.cupping_score, qa.moisture, qa.defects,
             creator.full_name AS created_by_name,
             reviewer.full_name AS reviewed_by_name
      FROM corrective_actions ca
      JOIN coffee_batches cb ON cb.batch_id = ca.batch_id
      LEFT JOIN quality_assessments qa ON qa.assessment_id = ca.assessment_id
      LEFT JOIN users creator ON creator.user_id = ca.created_by
      LEFT JOIN users reviewer ON reviewer.user_id = ca.reviewed_by
      WHERE ca.responsible_role = 'PROCESSOR'
        AND cb.washing_station IN (${stationList})
      ORDER BY
        CASE ca.status
          WHEN 'Rejected' THEN 1
          WHEN 'Assigned' THEN 2
          WHEN 'In Progress' THEN 3
          WHEN 'Ready for Reassessment' THEN 4
          WHEN 'Overdue' THEN 5
          ELSE 6
        END,
        ca.created_at DESC
    `
    );
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching processor corrective actions:', error);
    res.status(500).json({ message: 'Server error retrieving corrective actions' });
  }
};

export const submitProcessorCorrectiveAction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureCorrectiveActionTable();
    const actionId = req.params.actionId as string;
    const { submittedNotes, evidence = [] } = req.body;
    if (!submittedNotes || !String(submittedNotes).trim()) {
      res.status(400).json({ message: 'Correction notes are required' });
      return;
    }

    const existing = await prisma.$queryRaw<Array<any>>`
      SELECT ca.*, cb.qr_code, cb.washing_station
      FROM corrective_actions ca
      JOIN coffee_batches cb ON cb.batch_id = ca.batch_id
      WHERE ca.action_id = ${actionId}
      LIMIT 1
    `;
    if (!existing.length) {
      res.status(404).json({ message: 'Corrective action not found' });
      return;
    }
    const action = existing[0];
    const access = await assertProcessorCanAccessBatch(req.user!.userId, action.batch_id);
    if (!access.allowed) {
      res.status(404).json({ message: access.message });
      return;
    }

    if (action.status === 'Resolved') {
      res.status(400).json({ message: 'Resolved corrective actions cannot be resubmitted' });
      return;
    }

    const evidenceItems = Array.isArray(evidence)
      ? evidence.filter(Boolean)
      : String(evidence || '').split('\n').map(item => item.trim()).filter(Boolean);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `UPDATE corrective_actions
         SET status = 'Ready for Reassessment',
             submitted_notes = $1,
             evidence = $2::jsonb,
             submitted_by = $3,
             submitted_at = NOW(),
             updated_at = NOW()
         WHERE action_id = $4`,
        submittedNotes,
        JSON.stringify(evidenceItems),
        req.user!.userId,
        actionId
      );
      await tx.coffeeBatch.update({
        where: { batchId: action.batch_id },
        data: { status: 'ready_for_quality' }
      });
      await tx.inventoryItem.updateMany({
        where: { batchId: action.batch_id, status: 'QC Failed - Corrective Action' },
        data: { status: 'Awaiting QC' }
      });
      await tx.checkpointLog.create({
        data: {
          batchId: action.batch_id,
          checkpointType: 'Corrective Reprocessing Completed',
          locationName: action.washing_station || 'Washing Station',
          timestamp: new Date(),
          scannedById: req.user!.userId,
          notes: `${submittedNotes}${evidenceItems.length ? ` | Evidence: ${evidenceItems.join(', ')}` : ''}. Batch sent back to QC queue for reassessment.`,
        }
      });
    });

    const qualityUsers = await prisma.user.findMany({
      where: { role: { roleName: 'QUALITY_CONTROLLER' }, status: 'active' },
      select: { userId: true }
    });
    await Promise.all(qualityUsers.map(user => createNotification(
      user.userId,
      'Batch Ready for QC Reassessment',
      `Batch ${action.qr_code || action.batch_id} was reprocessed and returned to the quality queue for reassessment.`,
      'info'
    )));

    res.status(200).json({ success: true, data: { actionId, status: 'Ready for Reassessment', batchStatus: 'ready_for_quality' } });
  } catch (error) {
    console.error('Error submitting corrective action:', error);
    res.status(500).json({ message: 'Server error submitting corrective action' });
  }
};

export const getSupplierAssignments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureSupplierAssignmentColumns();
    const stationRows = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT name
      FROM warehouse_locations
      WHERE type = 'Washing Station'
        AND status = 'active'
        AND processor_id = ${req.user!.userId}
      ORDER BY name ASC
    `;
    const stationNames = stationRows.map((station) => station.name);

    if (stationNames.length === 0) {
      const aggregators = await prisma.user.findMany({
        where: { role: { roleName: 'AGGREGATOR' }, status: 'active' },
        orderBy: { fullName: 'asc' },
        select: { userId: true, fullName: true, phone: true, email: true },
      });
      res.status(200).json({
        success: true,
        data: {
          suppliers: [],
          aggregators,
          stations: [],
        },
      });
      return;
    }

    const suppliers = await prisma.$queryRaw<Array<{
      profile_id: string;
      user_id: string;
      supplier_name: string | null;
      supplier_email: string | null;
      supplier_phone: string | null;
      supplier_account_status: string | null;
      supplier_type: string | null;
      number_of_farms: number | null;
      farm_name: string;
      farm_size_ha: number;
      gps_location: string | null;
      coordinates: string | null;
      preferred_washing_station: string | null;
      assignment_status: string | null;
      created_at: Date | null;
      aggregator_id: string | null;
      aggregator_name: string | null;
      aggregator_phone: string | null;
      aggregator_email: string | null;
      cooperative_name: string | null;
      cooperative_district: string | null;
      cooperative_zone: string | null;
      request_id: string | null;
      requested_station: string | null;
      request_reason: string | null;
      request_status: string | null;
      request_created_at: Date | null;
      station_name: string | null;
    }>>`
      SELECT fp.profile_id, fp.user_id, u.full_name AS supplier_name, u.email AS supplier_email,
             u.phone AS supplier_phone, u.status AS supplier_account_status,
             fp.supplier_type, fp.number_of_farms, fp.farm_name, fp.farm_size_ha,
             fp.gps_location, fp.coordinates, fp.preferred_washing_station,
             fp.assignment_status, u.created_at, fp.aggregator_id,
             ag.full_name AS aggregator_name, ag.phone AS aggregator_phone, ag.email AS aggregator_email,
             c.name AS cooperative_name, c.district AS cooperative_district, c.zone AS cooperative_zone,
             wr.request_id, wr.washing_station_name AS requested_station, wr.reason AS request_reason,
             wr.status AS request_status, wr.created_at AS request_created_at,
             ws.name AS station_name
      FROM washing_station_requests wr
      JOIN farmer_profiles fp ON fp.user_id = wr.supplier_id
      JOIN users u ON u.user_id = fp.user_id
      JOIN warehouse_locations ws
        ON LOWER(ws.name) = LOWER(wr.washing_station_name)
       AND ws.type = 'Washing Station'
       AND ws.status = 'active'
       AND ws.processor_id = ${req.user!.userId}
      LEFT JOIN users ag ON ag.user_id = fp.aggregator_id
      LEFT JOIN cooperatives c ON c.coop_id = fp.cooperative_id
      WHERE wr.request_id = (
        SELECT latest.request_id
        FROM washing_station_requests latest
        WHERE latest.supplier_id = wr.supplier_id
        ORDER BY latest.created_at DESC
        LIMIT 1
      )
        AND (wr.status = 'PENDING' OR wr.reviewed_by_processor_id = ${req.user!.userId})
      ORDER BY wr.created_at DESC
    `;
    const aggregators = await prisma.user.findMany({
      where: { role: { roleName: 'AGGREGATOR' }, status: 'active' },
      orderBy: { fullName: 'asc' },
      select: { userId: true, fullName: true, phone: true, email: true },
    });

    res.status(200).json({
      success: true,
      data: {
        suppliers: suppliers.map((supplier) => ({
          profileId: supplier.profile_id,
          userId: supplier.user_id,
          supplierName: supplier.supplier_name || supplier.farm_name,
          supplierEmail: supplier.supplier_email,
          supplierPhone: supplier.supplier_phone,
          supplierAccountStatus: supplier.supplier_account_status,
          supplierType: supplier.supplier_type,
          numberOfFarms: supplier.number_of_farms,
          farmName: supplier.farm_name,
          farmSizeHa: Number(supplier.farm_size_ha || 0),
          location: supplier.gps_location,
          coordinates: supplier.coordinates,
          preferredWashingStation: supplier.preferred_washing_station,
          assignmentStatus: supplier.assignment_status,
          latestRequest: supplier.request_id ? {
            requestId: supplier.request_id,
            washingStationName: supplier.requested_station,
            assignedProcessorStation: supplier.station_name,
            reason: supplier.request_reason,
            status: supplier.request_status,
            createdAt: supplier.request_created_at,
          } : null,
          assignedAggregator: supplier.aggregator_id ? {
            userId: supplier.aggregator_id,
            fullName: supplier.aggregator_name,
            phone: supplier.aggregator_phone,
            email: supplier.aggregator_email,
          } : null,
          cooperative: supplier.cooperative_name ? {
            name: supplier.cooperative_name,
            district: supplier.cooperative_district,
            zone: supplier.cooperative_zone,
          } : null,
          createdAt: supplier.created_at,
        })),
        aggregators,
        stations: stationNames,
      },
    });
  } catch (error) {
    console.error('Error loading supplier assignments:', error);
    res.status(500).json({ message: 'Server error loading supplier assignments' });
  }
};

export const assignSupplierAggregator = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureSupplierAssignmentColumns();
    const profileId = req.params.profileId as string;
    const { aggregatorId, status = 'APPROVED' } = req.body;

    if (!profileId || !aggregatorId) {
      res.status(400).json({ message: 'Supplier and aggregator are required' });
      return;
    }

    const [supplier, aggregator] = await Promise.all([
      prisma.farmerProfile.findUnique({ where: { profileId }, include: { user: true } }),
      prisma.user.findFirst({ where: { userId: aggregatorId, role: { roleName: 'AGGREGATOR' }, status: 'active' } }),
    ]);

    if (!supplier) {
      res.status(404).json({ message: 'Supplier profile not found' });
      return;
    }
    if (!aggregator) {
      res.status(404).json({ message: 'Active aggregator not found' });
      return;
    }

    const nextStatus = String(status || 'APPROVED').toUpperCase() === 'REJECTED' ? 'REJECTED' : 'APPROVED';
    const requestRows = await prisma.$queryRaw<Array<{ request_id: string; washing_station_name: string; status: string }>>`
      SELECT wr.request_id, wr.washing_station_name, wr.status
      FROM washing_station_requests wr
      JOIN warehouse_locations ws
        ON LOWER(ws.name) = LOWER(wr.washing_station_name)
       AND ws.type = 'Washing Station'
       AND ws.status = 'active'
       AND ws.processor_id = ${req.user!.userId}
      WHERE wr.supplier_id = ${supplier.userId}
      ORDER BY wr.created_at DESC
      LIMIT 1
    `;
    const latestRequest = requestRows[0];
    if (!latestRequest && nextStatus === 'APPROVED') {
      res.status(400).json({ message: 'Supplier must request one of your assigned washing stations before assignment.' });
      return;
    }
    if (latestRequest && latestRequest.status !== 'PENDING' && nextStatus === 'APPROVED') {
      res.status(400).json({ message: 'The latest washing station request has already been reviewed.' });
      return;
    }

    await prisma.$executeRaw`
      UPDATE farmer_profiles
      SET aggregator_id = ${aggregatorId},
          processor_id = ${req.user!.userId},
          preferred_washing_station = ${latestRequest?.washing_station_name || null},
          assignment_status = ${nextStatus}
      WHERE profile_id = ${profileId}
    `;
    if (latestRequest) {
      await prisma.$executeRaw`
        UPDATE washing_station_requests
        SET status = ${nextStatus},
            reviewed_by_processor_id = ${req.user!.userId},
            assigned_aggregator_id = ${aggregatorId},
            reviewed_at = NOW()
        WHERE request_id = ${latestRequest.request_id}
      `;
    }

    await Promise.all([
      createNotification(
        supplier.userId,
        nextStatus === 'APPROVED' ? 'Aggregator assigned' : 'Supplier assignment rejected',
        nextStatus === 'APPROVED'
          ? `${aggregator.fullName || 'An aggregator'} has been assigned to collect coffee from ${supplier.farmName}.`
          : `Your supplier assignment request was rejected by the processor.`,
        nextStatus === 'APPROVED' ? 'success' : 'warning'
      ),
      createNotification(
        aggregatorId,
        'New supplier assigned',
        `${supplier.user?.fullName || supplier.farmName} has been assigned to you by the processor for pickup coordination.`,
        'info'
      ),
    ]);

    res.status(200).json({
      success: true,
      data: {
        profileId,
        assignmentStatus: nextStatus,
        assignedAggregator: {
          userId: aggregator.userId,
          fullName: aggregator.fullName,
          phone: aggregator.phone,
          email: aggregator.email,
        },
      },
    });
  } catch (error) {
    console.error('Error assigning supplier aggregator:', error);
    res.status(500).json({ message: 'Server error assigning supplier' });
  }
};

export const getProcessorSupportTickets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { farmerId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving processor support tickets' });
  }
};

export const createProcessorSupportTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subject, category, description } = req.body;
    if (!subject || !category || !description) {
      res.status(400).json({ message: 'Subject, category, and description are required' });
      return;
    }
    const ticket = await prisma.supportTicket.create({
      data: {
        farmerId: req.user!.userId,
        subject,
        category,
        description,
        status: 'Open',
      },
    });
    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ message: 'Server error creating processor support ticket' });
  }
};

export const getProcessorBatches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stationNames = await getProcessorStationNames(req.user!.userId);
    if (stationNames.length === 0) {
      res.status(200).json({ success: true, data: [] });
      return;
    }
    const batches = await attachBatchGroupIds(await prisma.coffeeBatch.findMany({
      where: processorStationBatchWhere(stationNames),
      orderBy: { createdAt: 'desc' },
      include: processorInclude
    }));

    res.status(200).json({ success: true, data: batches.map(enrichBatch) });
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving processor batches' });
  }
};

export const getProcessorDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stationNames = await getProcessorStationNames(req.user!.userId);
    const batches = stationNames.length > 0
      ? (await attachBatchGroupIds(await prisma.coffeeBatch.findMany({
          where: processorStationBatchWhere(stationNames),
          include: processorInclude,
        }))).map(enrichBatch)
      : [];
    const processingLogs = batches.flatMap((b: any) => b.processingLogs || []);
    const completed = processingLogs.filter((l: any) => l.checkpointType === 'Processing Completed');
    const fifoSorted = [...batches].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const processedOrder = batches
      .filter((b: any) => ['Processing', 'Quality Check', 'Dispatched'].includes(b.status))
      .sort((a: any, b: any) => {
        const aLog = (a.checkpointLogs || []).find((l: any) => l.checkpointType === 'Processing Status Update' || l.checkpointType === 'Processing Step');
        const bLog = (b.checkpointLogs || []).find((l: any) => l.checkpointType === 'Processing Status Update' || l.checkpointType === 'Processing Step');
        return new Date(aLog?.timestamp || a.createdAt).getTime() - new Date(bLog?.timestamp || b.createdAt).getTime();
      });
    const fifoMatches = processedOrder.filter((b: any, i: number) => fifoSorted[i]?.batchId === b.batchId).length;
    const handoffValues = batches.map((b: any) => b.handoffHours).filter((v: any) => typeof v === 'number');

    res.status(200).json({
      success: true,
      data: {
        batches,
        stations: stationNames,
        kpis: {
          processingThroughput: completed.length,
          fifoComplianceRate: processedOrder.length ? Math.round((fifoMatches / processedOrder.length) * 100) : 100,
          offlineSyncSuccessRate: 100,
          qualityHandoffTurnaroundHours: handoffValues.length ? Number((handoffValues.reduce((s: number, v: number) => s + v, 0) / handoffValues.length).toFixed(1)) : 0,
          anomalyFlagRate: processingLogs.length ? Math.round((processingLogs.filter((l: any) => (l.notes || '').toLowerCase().includes('anomaly') || (l.notes || '').toLowerCase().includes('downtime') || (l.notes || '').toLowerCase().includes('risk')).length / processingLogs.length) * 100) : 0,
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving processor dashboard' });
  }
};

export const updateBatchStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const batchId = req.params.batchId as string;
    const { status, condition, moisture, defects, notes, locationName, receivedWeightKg } = req.body;
    const rawStatus = toRawProcessorStatus(status);
    const normalized = normalizeStatus(rawStatus);
    const access = await assertProcessorCanAccessBatch(req.user!.userId, batchId);

    if (!access.allowed) {
      res.status(404).json({ message: access.message });
      return;
    }
    const existingBatch = access.batch;

    const processingWeightRule = evaluateProcessingBatchWeight(Number(existingBatch.weightCherry || 0));
    if (['processing', 'ready_for_quality'].includes(rawStatus) && !processingWeightRule.canProcess) {
      res.status(400).json({
        message: processingWeightRule.message,
        processingWeightRule,
      });
      return;
    }

    const updatedBatch = await prisma.coffeeBatch.update({
      where: { batchId },
      data: { status: rawStatus }
    });

    await prisma.checkpointLog.create({
      data: {
        batchId: updatedBatch.batchId,
        checkpointType: normalized === 'Received' ? 'Washing Station Arrival' : 'Processing Status Update',
        locationName: locationName || updatedBatch.washingStation,
        timestamp: new Date(),
        scannedById: req.user!.userId,
        notes: JSON.stringify({ status: normalized, condition, moisture, defects, receivedWeightKg, notes })
      }
    });

    if (normalized === 'Received') {
      await prisma.transportLog.updateMany({
        where: { batchId, arrivalTime: null },
        data: { arrivalTime: new Date(), condition: condition || 'received' }
      });
    }

    if (rawStatus === 'ready_for_quality') {
      const qualityUsers = await prisma.user.findMany({
        where: { role: { roleName: 'QUALITY_CONTROLLER' }, status: 'active' },
        select: { userId: true }
      });
      await Promise.all(qualityUsers.map(user => createNotification(
        user.userId,
        'Batch Ready for Quality Assessment',
        `Batch ${updatedBatch.qrCode} from ${updatedBatch.washingStation} is ready for QC assessment.`,
        'info'
      )));
    }

    res.status(200).json({ success: true, data: updatedBatch });
  } catch (error) {
    console.error('Error updating batch status:', error);
    res.status(500).json({ message: 'Server error updating batch' });
  }
};

export const completeProcessing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const batchId = req.params.batchId as string;
    const {
      greenCoffeeWeightKg,
      warehouseId,
      coffeeForm = 'Green Coffee',
      stockLocation,
      pulpingHours,
      fermentationHours,
      washingCycles,
      dryingHours,
      initialMoisture,
      visualDefects,
      anomalies,
      downtimeMinutes,
      notes
    } = req.body;

    if (!greenCoffeeWeightKg || Number(greenCoffeeWeightKg) <= 0 || initialMoisture === undefined || initialMoisture === '') {
      res.status(400).json({ message: 'Output weight and initial moisture are required before QC handoff' });
      return;
    }

    const access = await assertProcessorCanAccessBatch(req.user!.userId, batchId);
    if (!access.allowed) {
      res.status(404).json({ message: access.message });
      return;
    }
    const existingBatch = access.batch;

    const processingWeightRule = evaluateProcessingBatchWeight(Number(existingBatch.weightCherry || 0));
    if (!processingWeightRule.canProcess) {
      res.status(400).json({
        message: processingWeightRule.message,
        processingWeightRule,
      });
      return;
    }

    const batch = await prisma.$transaction(async (tx) => {
      const updated = await tx.coffeeBatch.update({
        where: { batchId },
        data: { status: 'ready_for_quality' }
      });

      const warehouse = warehouseId
        ? await tx.warehouseLocation.findFirst({
          where: {
            locationId: warehouseId,
            name: updated.washingStation,
            type: 'Washing Station',
            status: 'active',
          }
        })
        : await tx.warehouseLocation.findFirst({
          where: {
            name: updated.washingStation,
            type: 'Washing Station',
            status: 'active',
          }
        });

      const targetWarehouse = warehouse || await tx.warehouseLocation.create({
        data: {
          name: stockLocation || updated.washingStation,
          type: 'Washing Station',
          address: stockLocation || updated.washingStation,
          district: updated.district,
          capacityKg: 100000,
          status: 'active',
        }
      });

      const inventory = await tx.inventoryItem.create({
        data: {
          batchId,
          warehouseId: targetWarehouse.locationId,
          quantityKg: greenCoffeeWeightKg,
          coffeeForm,
          fifoDate: new Date(),
          status: 'Awaiting QC',
          lotNo: `LOT-${Date.now()}`
        }
      });

      await tx.stockMovement.create({
        data: {
          itemId: inventory.itemId,
          movementType: 'Processing Output',
          quantityKg: greenCoffeeWeightKg,
          toLocationId: targetWarehouse.locationId,
          referenceNo: updated.qrCode,
        }
      });

      await tx.checkpointLog.create({
        data: {
          batchId,
          checkpointType: 'Processing Completed',
          locationName: targetWarehouse.name,
          timestamp: new Date(),
          scannedById: req.user!.userId,
          notes: JSON.stringify({
            pulpingHours,
            fermentationHours,
            washingCycles,
            dryingHours,
            initialMoisture,
            visualDefects,
            anomalies,
            downtimeMinutes,
            coffeeForm,
            outputWeightKg: greenCoffeeWeightKg,
            notes
          })
        }
      });

      return updated;
    });

    const qualityUsers = await prisma.user.findMany({
      where: { role: { roleName: 'QUALITY_CONTROLLER' }, status: 'active' },
      select: { userId: true }
    });
    await Promise.all(qualityUsers.map(user => createNotification(
      user.userId,
      'Quality Assessment Requested',
      `Processing is complete for batch ${batch.qrCode}. Please assess moisture, defects, and cupping readiness.`,
      'info'
    )));

    res.status(200).json({ success: true, data: batch });
  } catch (error) {
    console.error('Error completing process:', error);
    res.status(500).json({ message: 'Server error completing batch processing' });
  }
};

export const logProcessingStep = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const batchId = req.params.batchId as string;
    const { stepName, durationHours, moisture, defects, anomalies, downtimeMinutes, notes, locationName } = req.body;
    const access = await assertProcessorCanAccessBatch(req.user!.userId, batchId);
    if (!access.allowed) {
      res.status(404).json({ message: access.message });
      return;
    }

    const log = await prisma.checkpointLog.create({
      data: {
        batchId,
        checkpointType: stepName === 'maintenance' ? 'Maintenance Downtime' : stepName === 'quality_intake' ? 'Quality Intake' : 'Processing Step',
        locationName: locationName || access.batch.washingStation || 'Processing Station',
        timestamp: new Date(),
        scannedById: req.user!.userId,
        notes: JSON.stringify({ stepName, durationHours, moisture, defects, anomalies, downtimeMinutes, notes })
      }
    });
    res.status(201).json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ message: 'Server error logging processing step' });
  }
};

export const getProcessorInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "bin_code" VARCHAR(100) NULL`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "expiry_date" DATE NULL`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "reorder_level_kg" NUMERIC(12,2) NULL`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "alert_status" VARCHAR(50) NOT NULL DEFAULT 'OK'`);
    const stationNames = await getProcessorStationNames(req.user!.userId);
    if (stationNames.length === 0) {
      res.status(200).json({ success: true, data: [], movements: [] });
      return;
    }
    const stationList = quotedSqlList(stationNames);
    const rows = await prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT ii.item_id, ii.batch_id, ii.quantity_kg, ii.coffee_form, ii.fifo_date, ii.status, ii.lot_no,
             ii.bin_code, ii.expiry_date, ii.reorder_level_kg, ii.alert_status,
             cb.washing_station, cb.district, cb.farm_name, cb.weight_cherry, cb.status AS batch_status, cb.qr_code,
             wl.name AS warehouse_name
      FROM inventory_items ii
      JOIN coffee_batches cb ON cb.batch_id = ii.batch_id
      JOIN warehouse_locations wl ON wl.location_id = ii.warehouse_id
      WHERE cb.washing_station IN (${stationList})
      ORDER BY ii.fifo_date ASC
    `
    );
    const movements = await prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT sm.movement_id, sm.item_id, sm.movement_type, sm.quantity_kg, sm.movement_date, sm.reference_no,
             from_wl.name AS from_location,
             to_wl.name AS to_location,
             ii.batch_id,
             cb.qr_code,
             cb.farm_name
      FROM stock_movements sm
      JOIN inventory_items ii ON ii.item_id = sm.item_id
      JOIN coffee_batches cb ON cb.batch_id = ii.batch_id
      LEFT JOIN warehouse_locations from_wl ON from_wl.location_id = sm.from_location_id
      LEFT JOIN warehouse_locations to_wl ON to_wl.location_id = sm.to_location_id
      WHERE cb.washing_station IN (${stationList})
      ORDER BY sm.movement_date DESC
      LIMIT 50
    `
    );
    res.status(200).json({ success: true, data: rows.map((item: any) => {
      const ageInDays = Math.max(0, Math.floor((Date.now() - new Date(item.fifo_date).getTime()) / 86400000));
      const shelfLifeDays = String(item.coffee_form || '').toLowerCase().includes('cherry') ? 1 : String(item.coffee_form || '').toLowerCase().includes('parchment') ? 30 : 180;
      const expiryDate = item.expiry_date || new Date(new Date(item.fifo_date).getTime() + shelfLifeDays * 86400000);
      const lowStock = item.reorder_level_kg !== null && Number(item.quantity_kg) <= Number(item.reorder_level_kg);
      const expiringSoon = new Date(expiryDate).getTime() <= Date.now() + 30 * 86400000;
      return {
        id: item.item_id,
        batchId: item.batch_id,
        qrCode: item.qr_code,
        farmName: item.farm_name,
        washingStation: item.washing_station,
        originalCherryKg: Number(item.weight_cherry || 0),
        batchStatus: item.batch_status,
        coffeeType: String(item.coffee_form || '').toLowerCase().includes('green') ? 'green' : String(item.coffee_form || '').toLowerCase().includes('parchment') ? 'parchment' : 'cherry',
        coffeeForm: item.coffee_form,
        weight: Number(item.quantity_kg),
        location: item.warehouse_name || item.washing_station,
        district: item.district,
        status: item.status,
        lotNo: item.lot_no,
        binCode: item.bin_code || 'Unassigned',
        expiryDate,
        reorderLevelKg: item.reorder_level_kg === null ? null : Number(item.reorder_level_kg),
        alertStatus: lowStock ? 'LOW_STOCK' : expiringSoon ? 'EXPIRING_SOON' : item.alert_status,
        fifoDate: item.fifo_date,
        ageInDays,
        shelfLifeDays,
        grade: item.status?.includes('Grade') ? item.status.replace('QC Passed - ', '') : null,
      };
    }), movements: movements.map((movement: any) => ({
      movementId: movement.movement_id,
      itemId: movement.item_id,
      batchId: movement.batch_id,
      qrCode: movement.qr_code,
      farmName: movement.farm_name,
      movementType: movement.movement_type,
      quantityKg: Number(movement.quantity_kg || 0),
      fromLocation: movement.from_location || 'Source',
      toLocation: movement.to_location || 'Station stock',
      movementDate: movement.movement_date,
      referenceNo: movement.reference_no,
    })) });
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving processor inventory' });
  }
};

export const updateInventoryItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const itemId = req.params.itemId as string;
    const { binCode, expiryDate, reorderLevelKg, status } = req.body;
    const item = await prisma.inventoryItem.findUnique({ where: { itemId } });
    if (!item) {
      res.status(404).json({ message: 'Inventory item not found' });
      return;
    }
    const access = await assertProcessorCanAccessBatch(req.user!.userId, item.batchId);
    if (!access.allowed) {
      res.status(404).json({ message: access.message });
      return;
    }

    const data: any = {};
    if (binCode !== undefined) data.binCode = binCode || null;
    if (expiryDate !== undefined) data.expiryDate = expiryDate ? new Date(expiryDate) : null;
    if (reorderLevelKg !== undefined) data.reorderLevelKg = reorderLevelKg === '' || reorderLevelKg === null ? null : Number(reorderLevelKg);
    if (status !== undefined) data.status = status;

    const updated = await prisma.inventoryItem.update({ where: { itemId }, data });
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'INVENTORY_ITEM_UPDATED',
        entityType: 'InventoryItem',
        entityId: itemId,
        details: data,
        ipAddress: req.ip,
      }
    });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({ message: 'Server error updating inventory item' });
  }
};

export const reconcileInventoryItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureInventoryWorkflowTables();
    const itemId = req.params.itemId as string;
    const { physicalQuantityKg, notes } = req.body;
    const physical = Number(physicalQuantityKg);
    if (!Number.isFinite(physical) || physical < 0) {
      res.status(400).json({ message: 'Physical quantity must be a valid non-negative number' });
      return;
    }

    const item = await prisma.inventoryItem.findUnique({ where: { itemId } });
    if (!item) {
      res.status(404).json({ message: 'Inventory item not found' });
      return;
    }
    const access = await assertProcessorCanAccessBatch(req.user!.userId, item.batchId);
    if (!access.allowed) {
      res.status(404).json({ message: access.message });
      return;
    }

    const system = Number(item.quantityKg);
    const variance = Number((physical - system).toFixed(2));
    const result = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<any>>`
        INSERT INTO inventory_reconciliations (
          item_id, system_quantity_kg, physical_quantity_kg, variance_kg, notes, created_by
        )
        VALUES (${itemId}, ${system}, ${physical}, ${variance}, ${notes || null}, ${req.user!.userId})
        RETURNING *
      `;
      await tx.inventoryItem.update({
        where: { itemId },
        data: { quantityKg: physical, alertStatus: variance === 0 ? 'OK' : 'RECONCILED' }
      });
      if (variance !== 0) {
        await tx.stockMovement.create({
          data: {
            itemId,
            movementType: 'Reconciliation Adjustment',
            quantityKg: Math.abs(variance),
            referenceNo: rows[0].reconciliation_id,
          }
        });
      }
      await tx.auditLog.create({
        data: {
          userId: req.user!.userId,
          action: 'INVENTORY_RECONCILED',
          entityType: 'InventoryItem',
          entityId: itemId,
          details: { systemQuantityKg: system, physicalQuantityKg: physical, varianceKg: variance, notes },
          ipAddress: req.ip,
        }
      });
      return rows[0];
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error reconciling inventory item:', error);
    res.status(500).json({ message: 'Server error reconciling inventory item' });
  }
};
