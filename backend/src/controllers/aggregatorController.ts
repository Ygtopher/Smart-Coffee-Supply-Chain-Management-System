import { Response } from 'express';
import bcrypt from 'bcrypt';
import { AuthRequest } from '../middlewares/authMiddleware';
import prisma from '../config/db';
import { createNotification } from './notificationController';
import { deliveryTotalAmount, matchPaymentForDelivery, normalizedPaymentStatus } from '../utils/paymentMatching';
import { calculateDeforestationRisk, updateBatchDeforestationRisk } from '../services/eudrRiskService';

const buildQrCode = () => `QR-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
const buildBatchGroupId = () => `BG-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
const MIN_PROCESSING_CHERRY_KG = 100;
const MAX_PROCESSING_CHERRY_KG = 500;

const getAggregatorCooperativeIds = async (userId: string) => {
  const managed = await prisma.cooperative.findMany({
    where: { managerId: userId },
    select: { coopId: true },
  });
  const assigned = await prisma.$queryRaw<Array<{ coop_id: string }>>`
    SELECT coop_id FROM cooperative_aggregators WHERE user_id = ${userId}
  `;
  return [...new Set([...managed.map((cooperative) => cooperative.coopId), ...assigned.map((row) => row.coop_id)])];
};

const cooperativeFarmerAccessWhere = (userId: string, _cooperativeIds: string[]) => ({
  aggregatorId: userId,
});

const getBaselineFarmerRate = async () => {
  const rows = await prisma.$queryRaw<Array<{ value: any }>>`
    SELECT value FROM admin_settings WHERE key = 'systemConfiguration' LIMIT 1
  `;
  return Number(rows[0]?.value?.marketPrices?.baselineRatePerKg || 2600);
};

const calculateRecommendedSplits = (totalWeight: number) => {
  const batchCount = Math.ceil(totalWeight / MAX_PROCESSING_CHERRY_KG);
  const baseWeight = Math.floor((totalWeight / batchCount) * 100) / 100;
  const splits = Array(batchCount).fill(baseWeight);
  const remainder = Number((totalWeight - splits.reduce((sum, weight) => sum + weight, 0)).toFixed(2));
  splits[splits.length - 1] = Number((splits[splits.length - 1] + remainder).toFixed(2));
  return splits;
};

const evaluateProcessingBatchWeight = (weightKg: number) => {
  if (weightKg < MIN_PROCESSING_CHERRY_KG) {
    return {
      code: 'needs_consolidation',
      status: 'needs_consolidation',
      label: 'Needs Consolidation',
      canProcess: false,
      message: `Batch is below ${MIN_PROCESSING_CHERRY_KG} kg and must be consolidated before washing station processing.`,
    };
  }

  if (weightKg > MAX_PROCESSING_CHERRY_KG) {
    return {
      code: 'split_required',
      status: 'split_required',
      label: 'Split Required',
      canProcess: false,
      message: `Batch exceeds ${MAX_PROCESSING_CHERRY_KG} kg and must be split into smaller processing batches.`,
    };
  }

  return {
    code: 'valid_processing_cycle',
    status: 'pending_transport',
    label: 'Valid Processing Cycle',
    canProcess: true,
    message: `Batch is within the ${MIN_PROCESSING_CHERRY_KG}-${MAX_PROCESSING_CHERRY_KG} kg CWS processing range.`,
  };
};

export const getAggregatorDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    await prisma.$executeRawUnsafe(`ALTER TABLE delivery_records ADD COLUMN IF NOT EXISTS coffee_variety VARCHAR(100) NULL`);
    await prisma.$executeRawUnsafe(`ALTER TABLE coffee_batches ADD COLUMN IF NOT EXISTS coffee_variety VARCHAR(100) NULL`);

    const cooperativeIds = await getAggregatorCooperativeIds(userId!);
    const aggregatorZone = await prisma.cooperative.findMany({
      where: { coopId: { in: cooperativeIds } },
    });

    const washingStations = await prisma.warehouseLocation.findMany({
      where: { type: 'Washing Station', status: 'active' },
      orderBy: { name: 'asc' },
      select: {
        locationId: true,
        name: true,
        district: true,
        address: true,
        capacityKg: true,
        gpsLocation: true,
      }
    });

    const deliveries = await prisma.deliveryRecord.findMany({
      where: { buyer: userId },
      orderBy: { deliveryDate: 'desc' }
    });
    const deliveryVarietyRows = deliveries.length
      ? await prisma.$queryRawUnsafe<Array<{ delivery_id: string; coffee_variety: string | null }>>(
          `SELECT delivery_id, coffee_variety FROM delivery_records WHERE delivery_id IN (${deliveries.map(d => `'${d.deliveryId.replace(/'/g, "''")}'`).join(',')})`
        )
      : [];
    const varietyByDeliveryId = new Map(deliveryVarietyRows.map(row => [row.delivery_id, row.coffee_variety]));

    const deliveryProfiles = await Promise.all(deliveries.map(async d => {
      const profile = await prisma.farmerProfile.findUnique({
        where: { profileId: d.profileId },
        include: { user: true, cooperative: true }
      });
      return { delivery: d, profile };
    }));

    const profileIds = [...new Set(deliveryProfiles.map(({ profile }) => profile?.profileId).filter((id): id is string => Boolean(id)))];
    const quotedProfileIds = profileIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',');
    const stationAssignmentRows = profileIds.length > 0
      ? await prisma.$queryRawUnsafe<Array<{ profile_id: string; preferred_washing_station: string | null; assignment_status: string | null }>>(
          `SELECT fp.profile_id,
                  COALESCE(fp.preferred_washing_station, latest_request.washing_station_name) AS preferred_washing_station,
                  fp.assignment_status
           FROM farmer_profiles fp
           LEFT JOIN LATERAL (
             SELECT wr.washing_station_name
             FROM washing_station_requests wr
             WHERE wr.supplier_id = fp.user_id
               AND wr.status = 'APPROVED'
             ORDER BY wr.reviewed_at DESC NULLS LAST, wr.created_at DESC
             LIMIT 1
           ) latest_request ON TRUE
           WHERE fp.profile_id IN (${quotedProfileIds})`
        )
      : [];
    const stationAssignmentsByProfileId = new Map(stationAssignmentRows.map((row) => [row.profile_id, row]));

    const farmerUserIds = [...new Set(deliveryProfiles.map(({ profile }) => profile?.userId).filter((id): id is string => Boolean(id)))];
    const deliveryPayments = farmerUserIds.length > 0
      ? await prisma.paymentTransaction.findMany({ where: { payerId: { in: farmerUserIds } } })
      : [];
    const paymentsByPayer = new Map<string, typeof deliveryPayments>();
    deliveryPayments.forEach((payment) => {
      const payerPayments = paymentsByPayer.get(payment.payerId) || [];
      payerPayments.push(payment);
      paymentsByPayer.set(payment.payerId, payerPayments);
    });
    const usedPaymentIdsByPayer = new Map<string, Set<string>>();

    const pickups = deliveryProfiles.map(({ delivery: d, profile }) => {
      const farmerUserId = profile?.userId || 'unknown';

      const farmerPayments = paymentsByPayer.get(farmerUserId) || [];
      const usedPaymentIds = usedPaymentIdsByPayer.get(farmerUserId) || new Set<string>();
      const linkedPayment = farmerPayments.find((candidate) => candidate.deliveryId === d.deliveryId);
      const payment = linkedPayment || matchPaymentForDelivery(d, farmerPayments, usedPaymentIds);
      if (payment) {
        usedPaymentIds.add(payment.txId);
        usedPaymentIdsByPayer.set(farmerUserId, usedPaymentIds);
      }
      const stationAssignment = stationAssignmentsByProfileId.get(d.profileId) || null;
      
      return {
        id: `PKP-${d.deliveryId.substring(0, 6).toUpperCase()}`,
        receiptNo: `RCT-${d.deliveryId.slice(0, 8).toUpperCase()}`,
        realDeliveryId: d.deliveryId,
        profileId: d.profileId,
        farmerName: profile?.user?.fullName || 'Unknown Farmer',
        farmName: profile?.farmName || 'Unknown Farm',
        location: profile?.gpsLocation || 'Rwanda',
        district: profile?.gpsLocation || profile?.cooperative?.district || '',
        coordinates: profile?.coordinates || '',
        cooperative: profile?.cooperative?.name || '',
        preferredWashingStation: stationAssignment?.preferred_washing_station || '',
        preferred_washing_station: stationAssignment?.preferred_washing_station || '',
        currentWashingStation: stationAssignment?.preferred_washing_station || '',
        current_washing_station: stationAssignment?.preferred_washing_station || '',
        stationAssignmentStatus: stationAssignment?.assignment_status || '',
        scheduledDate: d.deliveryDate.toISOString(),
        weight: Number(d.weightKg),
        coffeeVariety: varietyByDeliveryId.get(d.deliveryId) || 'Red Bourbon',
        pricePerKg: Number(d.pricePerKg),
        totalAmount: deliveryTotalAmount(d),
        paymentStatus: normalizedPaymentStatus(payment),
        paymentMethod: payment ? payment.paymentMethod : 'MTN Mobile Money',
        quality: 'A1',
        batchId: d.batchId
      };
    });

    const assignedFarmers = await prisma.farmerProfile.count({
      where: cooperativeFarmerAccessWhere(userId!, cooperativeIds)
    });

    const batchIds = [...new Set(deliveries.map(d => d.batchId).filter(Boolean))];

    let resolvedBatchIds = batchIds;
    if (batchIds.length > 0) {
      const quotedBatchIds = batchIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',');
      const groupedRows = await prisma.$queryRawUnsafe<Array<{ batch_id: string }>>(
        `SELECT batch_id FROM coffee_batches WHERE batch_group_id IN (${quotedBatchIds})`
      );
      resolvedBatchIds = [...new Set([...batchIds, ...groupedRows.map((row) => row.batch_id)])];
    }

    const batches = await prisma.coffeeBatch.findMany({
      where: { batchId: { in: resolvedBatchIds } },
      include: {
        checkpointLogs: true,
        transportLogs: true,
        qualityAssessments: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' }
    });
    const batchGroupMap = new Map<string, string | null>();
    const batchVarietyMap = new Map<string, string | null>();
    if (batches.length > 0) {
      const quotedResolvedBatchIds = batches.map((batch) => `'${batch.batchId.replace(/'/g, "''")}'`).join(',');
      const groupRows = await prisma.$queryRawUnsafe<Array<{ batch_id: string; batch_group_id: string | null; coffee_variety: string | null }>>(
        `SELECT batch_id, batch_group_id, coffee_variety FROM coffee_batches WHERE batch_id IN (${quotedResolvedBatchIds})`
      );
      groupRows.forEach((row) => {
        batchGroupMap.set(row.batch_id, row.batch_group_id);
        batchVarietyMap.set(row.batch_id, row.coffee_variety);
      });
    }

    const totalBatches = batches.length;
    const completeLocationCount = batches.filter(b => b.farmName && b.district && b.washingStation).length;
    const transportLoggedCount = batches.filter(b => b.transportLogs.length > 0).length;
    const qrGeneratedCount = batches.filter(b => b.qrCode).length;

    res.status(200).json({
      success: true,
      data: {
        zone: aggregatorZone,
        washingStations: washingStations.map(station => ({
          id: station.locationId,
          name: station.name,
          district: station.district,
          address: station.address,
          capacityKg: Number(station.capacityKg),
          gpsLocation: station.gpsLocation,
        })),
        pickups,
        assignedFarmers,
        totalPickups: pickups.length,
        totalWeight: pickups.reduce((acc, p) => acc + p.weight, 0),
        pendingPayments: pickups.filter(p => ['pending', 'initiated'].includes(p.paymentStatus)).reduce((acc, p) => acc + p.totalAmount, 0),
        totalBatches,
        batches: batches.map(b => ({
          id: b.batchId.substring(0, 8).toUpperCase(),
          realId: b.batchId,
          name: b.farmName,
          origin: b.district,
          farmers: new Set(deliveries.filter(d => d.batchId === b.batchId).map(d => d.profileId)).size || 1,
          totalWeight: Number(b.weightCherry),
          coffeeVariety: batchVarietyMap.get(b.batchId) || 'Red Bourbon',
          processType: 'Fully Washed',
          status: b.status,
          batchGroupId: batchGroupMap.get(b.batchId) || null,
          processingWeightRule: evaluateProcessingBatchWeight(Number(b.weightCherry)),
          qrCode: b.qrCode,
          createdAt: b.createdAt.toISOString(),
          checkpoints: b.checkpointLogs.length,
          transportLogged: b.transportLogs.length > 0,
          latestQuality: b.qualityAssessments[0] ? {
            cuppingScore: Number(b.qualityAssessments[0].cuppingScore),
            moisture: Number(b.qualityAssessments[0].moisture),
            defects: b.qualityAssessments[0].defects,
            notes: b.qualityAssessments[0].notes,
            assessedAt: b.qualityAssessments[0].createdAt.toISOString(),
          } : null,
        })),
        kpis: {
          batchCreationAccuracy: totalBatches ? Math.round((completeLocationCount / totalBatches) * 100) : 0,
          qrCodeSuccessRate: totalBatches ? Math.round((qrGeneratedCount / totalBatches) * 100) : 0,
          offlineSyncCompletionRate: 100,
          farmerRegistrationTurnaroundHours: 0,
          transportLoggingCompleteness: totalBatches ? Math.round((transportLoggedCount / totalBatches) * 100) : 0,
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving dashboard' });
  }
};

export const recordPickup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { farmerId, weightKg } = req.body;
    const pricePerKg = await getBaselineFarmerRate();

    if (!farmerId || !weightKg || !pricePerKg) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }

    const farmer = await prisma.user.findUnique({
      where: { userId: farmerId },
      include: { farmerProfile: true }
    });

    if (!farmer || !farmer.farmerProfile) {
      res.status(404).json({ message: 'Farmer profile not found' });
      return;
    }

    const cooperativeIds = await getAggregatorCooperativeIds(req.user!.userId);
    const hasAccess = farmer.farmerProfile.aggregatorId === req.user!.userId;
    const assignmentRows = await prisma.$queryRaw<Array<{ assignment_status: string | null }>>`
      SELECT assignment_status FROM farmer_profiles WHERE profile_id = ${farmer.farmerProfile.profileId}
    `;
    if ((assignmentRows[0]?.assignment_status || 'PENDING_ASSIGNMENT') !== 'APPROVED') {
      res.status(403).json({ message: 'This supplier is waiting for processor assignment approval.' });
      return;
    }
    if (!hasAccess) {
      res.status(403).json({ message: 'This farmer is not assigned to your cooperative.' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create Delivery Record
      const delivery = await tx.deliveryRecord.create({
        data: {
          profileId: farmer.farmerProfile!.profileId,
          batchId: '', // To be updated when assigned to a batch
          deliveryDate: new Date(),
          weightKg,
          buyer: req.user!.userId,
          pricePerKg,
        }
      });
      
      return { delivery, receiptNo: `RCT-${delivery.deliveryId.slice(0, 8).toUpperCase()}` };
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error recording pickup:', error);
    res.status(500).json({ message: 'Server error recording pickup' });
  }
};

export const markPickupPaymentPaid = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const deliveryIdParam = req.params.deliveryId;
    const deliveryId = Array.isArray(deliveryIdParam) ? deliveryIdParam[0] : deliveryIdParam;

    if (!deliveryId) {
      res.status(400).json({ message: 'Delivery ID is required' });
      return;
    }

    const delivery = await prisma.deliveryRecord.findFirst({
      where: {
        deliveryId,
        buyer: req.user!.userId,
      },
    });

    if (!delivery) {
      res.status(404).json({ message: 'Pickup payment record not found for this aggregator.' });
      return;
    }

    const existingPayment = await prisma.paymentTransaction.findFirst({
      where: { deliveryId },
      orderBy: { processedAt: 'desc' },
    }) || await prisma.paymentTransaction.findFirst({
      where: {
        amount: Number(delivery.weightKg) * Number(delivery.pricePerKg),
        payer: {
          farmerProfile: {
            profileId: delivery.profileId,
          },
        },
      },
      orderBy: { processedAt: 'desc' },
    });

    if (!existingPayment) {
      res.status(404).json({ message: 'No payment transaction is linked to this pickup.' });
      return;
    }

    const payment = await prisma.paymentTransaction.update({
      where: { txId: existingPayment.txId },
      data: {
        deliveryId,
        status: 'PAID',
        processedAt: new Date(),
      },
    });

    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    console.error('Error marking pickup payment paid:', error);
    res.status(500).json({ message: 'Server error updating payment status' });
  }
};

export const getPickupCurrentWashingStation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const deliveryId = req.params.deliveryId as string;

    const rows = await prisma.$queryRaw<Array<{
      delivery_id: string;
      profile_id: string;
      current_washing_station: string | null;
      assignment_status: string | null;
      station_id: string | null;
      station_name: string | null;
      station_district: string | null;
      station_status: string | null;
    }>>`
      SELECT dr.delivery_id,
             fp.profile_id,
             COALESCE(fp.preferred_washing_station, latest_request.washing_station_name) AS current_washing_station,
             fp.assignment_status,
             wl.location_id AS station_id,
             wl.name AS station_name,
             wl.district AS station_district,
             wl.status AS station_status
      FROM delivery_records dr
      JOIN farmer_profiles fp ON fp.profile_id = dr.profile_id
      LEFT JOIN LATERAL (
        SELECT wr.washing_station_name
        FROM washing_station_requests wr
        WHERE wr.supplier_id = fp.user_id
          AND wr.status = 'APPROVED'
        ORDER BY wr.reviewed_at DESC NULLS LAST, wr.created_at DESC
        LIMIT 1
      ) latest_request ON TRUE
      LEFT JOIN warehouse_locations wl
        ON LOWER(wl.name) = LOWER(COALESCE(fp.preferred_washing_station, latest_request.washing_station_name))
       AND wl.type = 'Washing Station'
      WHERE dr.delivery_id = ${deliveryId}
        AND (dr.buyer = ${userId} OR fp.aggregator_id = ${userId})
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      res.status(404).json({ message: 'Pickup not found for this aggregator.' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        deliveryId: row.delivery_id,
        profileId: row.profile_id,
        currentWashingStation: row.current_washing_station || '',
        assignmentStatus: row.assignment_status || '',
        station: row.station_name ? {
          id: row.station_id,
          name: row.station_name,
          district: row.station_district,
          status: row.station_status,
        } : null,
      },
    });
  } catch (error) {
    console.error('Error resolving pickup washing station:', error);
    res.status(500).json({ message: 'Server error resolving current washing station' });
  }
};

export const createBatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE delivery_records ADD COLUMN IF NOT EXISTS coffee_variety VARCHAR(100) NULL`);
    await prisma.$executeRawUnsafe(`ALTER TABLE coffee_batches ADD COLUMN IF NOT EXISTS coffee_variety VARCHAR(100) NULL`);
    const userId = req.user?.userId;
    const { deliveryIds, district, washingStation, farmName, checkpointLocation, transportMethod, transporterName, departureTime, condition, coffeeVariety, harvestDate, splitWeights, rfidTag, certificationStatus } = req.body;

    const deliveries = await prisma.deliveryRecord.findMany({
      where: {
        deliveryId: { in: deliveryIds },
        batchId: '',
      }
    });

    if (deliveries.length === 0 || deliveries.length !== deliveryIds.length) {
      res.status(400).json({ message: 'Delivery selection is required' });
      return;
    }

    const deliveryProfileIds = [...new Set(deliveries.map((delivery) => delivery.profileId))];
    const quotedDeliveryProfileIds = deliveryProfileIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',');
    const accessRows = await prisma.$queryRawUnsafe<Array<{ profile_id: string; aggregator_id: string | null }>>(
      `SELECT profile_id, aggregator_id FROM farmer_profiles WHERE profile_id IN (${quotedDeliveryProfileIds})`
    );
    const aggregatorByProfileId = new Map(accessRows.map((row) => [row.profile_id, row.aggregator_id]));
    const unauthorizedDelivery = deliveries.find((delivery) => delivery.buyer !== userId && aggregatorByProfileId.get(delivery.profileId) !== userId);
    if (unauthorizedDelivery) {
      res.status(404).json({ message: 'One or more selected pickups are not assigned to this aggregator.' });
      return;
    }

    const uniqueProfileIds = [...new Set(deliveries.map((delivery) => delivery.profileId))];
    if (uniqueProfileIds.length > 1) {
      res.status(400).json({ message: 'A processing batch can only include pickups from one farm. Create separate batches for each farm.' });
      return;
    }

    const deliveryVarietyRows = await prisma.$queryRawUnsafe<Array<{ delivery_id: string; coffee_variety: string | null }>>(
      `SELECT delivery_id, coffee_variety FROM delivery_records WHERE delivery_id IN (${deliveryIds.map((id: string) => `'${id.replace(/'/g, "''")}'`).join(',')})`
    );
    const selectedDeliveryVarieties = [...new Set(deliveryVarietyRows.map(row => String(row.coffee_variety || '').trim()).filter(Boolean))];
    if (selectedDeliveryVarieties.length > 1) {
      res.status(400).json({ message: 'Selected pickups have different verified coffee varieties. Create separate batches by coffee variety.' });
      return;
    }
    const verifiedCoffeeVariety = selectedDeliveryVarieties[0] || String(coffeeVariety || 'Red Bourbon').trim();

    const firstProfile = await prisma.farmerProfile.findUnique({
      where: { profileId: deliveries[0].profileId },
      include: { cooperative: true },
    });
    const assignmentRows = await prisma.$queryRaw<Array<{ preferred_washing_station: string | null }>>`
      SELECT COALESCE(fp.preferred_washing_station, latest_request.washing_station_name) AS preferred_washing_station
      FROM farmer_profiles fp
      LEFT JOIN LATERAL (
        SELECT wr.washing_station_name
        FROM washing_station_requests wr
        WHERE wr.supplier_id = fp.user_id
          AND wr.status = 'APPROVED'
        ORDER BY wr.reviewed_at DESC NULLS LAST, wr.created_at DESC
        LIMIT 1
      ) latest_request ON TRUE
      WHERE fp.profile_id = ${deliveries[0].profileId}
      LIMIT 1
    `;
    const verifiedFarmName = firstProfile?.farmName || farmName;
    const verifiedDistrict = firstProfile?.gpsLocation || district || firstProfile?.cooperative?.district;
    const verifiedCheckpointLocation = firstProfile?.coordinates || checkpointLocation || firstProfile?.gpsLocation || verifiedFarmName;
    const assignedWashingStation = (assignmentRows[0]?.preferred_washing_station || '').trim();

    if (!verifiedFarmName || !verifiedDistrict) {
      res.status(400).json({ message: 'Farm origin and district could not be verified from the selected pickup records' });
      return;
    }

    if (!assignedWashingStation) {
      res.status(400).json({ message: 'This supplier has no current washing station connection yet. Approve the washing station connection before creating a batch.' });
      return;
    }

    if (washingStation && washingStation !== assignedWashingStation) {
      res.status(400).json({ message: `This supplier is currently connected to ${assignedWashingStation}. Batch transport must use the current washing station.` });
      return;
    }

    const selectedWashingStation = await prisma.warehouseLocation.findFirst({
      where: { name: assignedWashingStation, type: 'Washing Station', status: 'active' },
    });

    if (!selectedWashingStation) {
      res.status(400).json({ message: `Current washing station ${assignedWashingStation} is not active in Work Station Management.` });
      return;
    }

    const stationProcessorRows = await prisma.$queryRaw<Array<{ processor_id: string | null }>>`
      SELECT processor_id
      FROM warehouse_locations
      WHERE location_id = ${selectedWashingStation.locationId}
      LIMIT 1
    `;
    const assignedProcessorId = stationProcessorRows[0]?.processor_id || null;

    if (!assignedProcessorId) {
      res.status(400).json({ message: `Current washing station ${assignedWashingStation} has no processor assigned. Assign a processor before creating a batch.` });
      return;
    }

    const totalWeight = deliveries.reduce((acc: number, d: any) => acc + Number(d.weightKg), 0);
    const processingWeightRule = evaluateProcessingBatchWeight(totalWeight);
    const normalizedSplitWeights = Array.isArray(splitWeights)
      ? splitWeights.map((weight) => Number(weight)).filter((weight) => Number.isFinite(weight))
      : [];

    if (processingWeightRule.code === 'split_required' && normalizedSplitWeights.length === 0) {
      res.status(400).json({
        message: 'Delivery exceeds 500 kg. Split it into 100-500 kg processing batches before generating QR codes.',
        processingWeightRule,
        recommendedSplits: calculateRecommendedSplits(totalWeight),
      });
      return;
    }

    const targetWeights = normalizedSplitWeights.length > 0 ? normalizedSplitWeights : [totalWeight];
    const splitTotal = Number(targetWeights.reduce((sum, weight) => sum + weight, 0).toFixed(2));
    const invalidSplit = targetWeights.some((weight) => weight < MIN_PROCESSING_CHERRY_KG || weight > MAX_PROCESSING_CHERRY_KG);

    if (invalidSplit || Math.abs(splitTotal - totalWeight) > 0.01) {
      res.status(400).json({
        message: `Each split must be ${MIN_PROCESSING_CHERRY_KG}-${MAX_PROCESSING_CHERRY_KG} kg and split total must equal ${totalWeight} kg.`,
        recommendedSplits: calculateRecommendedSplits(totalWeight),
      });
      return;
    }

    const batchGroupId = targetWeights.length > 1 ? buildBatchGroupId() : null;
    const deforestationRisk = await calculateDeforestationRisk(verifiedCheckpointLocation);

    const batches = await prisma.$transaction(async (tx) => {
      const createdBatches = [];
      for (let index = 0; index < targetWeights.length; index += 1) {
        const weight = targetWeights[index];
        const rule = evaluateProcessingBatchWeight(weight);
        const batch = await tx.coffeeBatch.create({
          data: {
            qrCode: buildQrCode(),
            farmName: verifiedFarmName,
            washingStation: selectedWashingStation.name,
            district: verifiedDistrict,
            farmerId: firstProfile?.userId || userId!,
            weightCherry: weight,
            status: rule.status,
          }
        });

        if (batchGroupId) {
          await tx.$executeRaw`
            UPDATE coffee_batches
            SET batch_group_id = ${batchGroupId}
            WHERE batch_id = ${batch.batchId}
          `;
        }

        await tx.$executeRaw`
          UPDATE coffee_batches
          SET coffee_variety = ${verifiedCoffeeVariety}
          WHERE batch_id = ${batch.batchId}
        `;

        if (rfidTag || certificationStatus) {
          const batchRfidTag = rfidTag ? (targetWeights.length > 1 ? `${rfidTag}-${index + 1}` : rfidTag) : null;
          await tx.$executeRaw`
            UPDATE coffee_batches
            SET rfid_tag = ${batchRfidTag},
                certification_status = ${certificationStatus ? JSON.stringify(certificationStatus) : null}::jsonb
            WHERE batch_id = ${batch.batchId}
          `;
        }

        await tx.checkpointLog.create({
          data: {
            batchId: batch.batchId,
            checkpointType: 'Collection Point Intake',
            locationName: verifiedCheckpointLocation,
            timestamp: new Date(),
            scannedById: userId!,
            notes: [
              'Batch created and QR code generated by aggregator',
              batchGroupId ? `Batch group: ${batchGroupId}` : null,
              batchGroupId ? `Sub-batch ${index + 1} of ${targetWeights.length}` : null,
              `CWS processing weight rule: ${rule.label}`,
              rule.message,
              `Verified origin: ${verifiedFarmName}, ${verifiedDistrict}`,
              verifiedCoffeeVariety ? `Coffee variety: ${verifiedCoffeeVariety}` : null,
              `EUDR deforestation risk: ${deforestationRisk.riskLevel} (${deforestationRisk.riskScore}/100)`,
              deforestationRisk.nearestAreaName ? `Nearest protected area: ${deforestationRisk.nearestAreaName} (${deforestationRisk.nearestDistanceKm} km)` : null,
              harvestDate ? `Harvest date: ${harvestDate}` : null,
              rfidTag ? `RFID reference: ${rfidTag}${batchGroupId ? `-${index + 1}` : ''}` : null,
            ].filter(Boolean).join('\n'),
          }
        });

        if (rule.canProcess) {
          await tx.transportLog.create({
            data: {
              batchId: batch.batchId,
              transportMethod: transportMethod || 'Not specified',
              departureTime: departureTime ? new Date(departureTime) : new Date(),
              condition: condition || 'fresh',
              scannedById: userId!,
              notes: [
                transporterName ? `Transporter: ${transporterName}` : null,
                batchGroupId ? `Batch group: ${batchGroupId}` : null,
              ].filter(Boolean).join('\n') || null,
            }
          });
        }

        createdBatches.push({
          ...batch,
          batchGroupId,
          coffeeVariety: verifiedCoffeeVariety,
          processingWeightRule: rule,
          splitIndex: index + 1,
          splitCount: targetWeights.length,
          deforestationRisk,
        });
      }

      await tx.deliveryRecord.updateMany({
        where: { deliveryId: { in: deliveryIds } },
        data: { batchId: batchGroupId || createdBatches[0].batchId }
      });

      return createdBatches;
    });

    await Promise.all(batches.map((batch) => updateBatchDeforestationRisk(batch.batchId, deforestationRisk)));

    if (batches.some((batch) => batch.processingWeightRule.canProcess)) {
      const assignedProcessor = await prisma.user.findFirst({
        where: { userId: assignedProcessorId, role: { roleName: 'PROCESSOR' }, status: 'active' },
        select: { userId: true },
      });
      if (assignedProcessor) await createNotification(
        assignedProcessor.userId,
        batchGroupId ? 'New Split Batch Group Pending Intake' : 'New Batch Pending Intake',
        batchGroupId
          ? `Batch group ${batchGroupId} has ${batches.length} sub-batches from ${verifiedFarmName} pending transport to ${selectedWashingStation.name}.`
          : `Batch ${batches[0].qrCode} is pending transport to ${selectedWashingStation.name}.`,
        'info'
      );
    }

    res.status(201).json({
      success: true,
      data: {
        ...batches[0],
        batches,
        batchGroupId,
        isSplitGroup: Boolean(batchGroupId),
        totalWeight,
        processingWeightRule: batchGroupId ? {
          code: 'split_group_created',
          label: 'Split Group Created',
          canProcess: true,
          message: `${totalWeight} kg split into ${batches.length} compliant processing batches.`,
        } : batches[0].processingWeightRule,
        deforestationRisk,
      }
    });
  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({ message: 'Server error creating batch' });
  }
};

export const getAggregatorProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { userId: req.user!.userId },
      select: { userId: true, fullName: true, email: true, phone: true, mfaEnabled: true }
    });
    const cooperative = await prisma.cooperative.findFirst({
      where: { coopId: { in: await getAggregatorCooperativeIds(req.user!.userId) } },
    });
    res.status(200).json({ success: true, data: { user, cooperative } });
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving aggregator profile' });
  }
};

export const updateAggregatorProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fullName, phone, cooperativeName, district, zone } = req.body;
    const user = await prisma.user.update({
      where: { userId: req.user!.userId },
      data: { ...(fullName ? { fullName } : {}), ...(phone ? { phone } : {}) },
      select: { userId: true, fullName: true, email: true, phone: true, mfaEnabled: true }
    });

    const cooperative = await prisma.cooperative.findFirst({
      where: { coopId: { in: await getAggregatorCooperativeIds(req.user!.userId) } },
    });

    res.status(200).json({ success: true, data: { user, cooperative } });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating aggregator profile' });
  }
};

export const registerFarmerByAggregator = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fullName, email, phone, farmName, farmSizeHa, district, sector, coordinates, password } = req.body;
    if (!fullName || !email || !phone || !farmName || !district) {
      res.status(400).json({ message: 'Full name, email, phone, farm name, and district are required' });
      return;
    }

    const role = await prisma.role.findUnique({ where: { roleName: 'FARMER' } });
    if (!role) {
      res.status(500).json({ message: 'Farmer role not configured' });
      return;
    }
    const cooperative = await prisma.cooperative.findFirst({
      where: { coopId: { in: await getAggregatorCooperativeIds(req.user!.userId) } },
    });

    const passwordHash = await bcrypt.hash(password || 'Farmer@123', 10);
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        passwordHash,
        roleId: role.roleId,
        status: 'active',
        farmerProfile: {
          create: {
            farmName,
            farmSizeHa: Number(farmSizeHa || 0),
            gpsLocation: [district, sector].filter(Boolean).join(', '),
            coordinates: coordinates || null,
            status: 'active',
            aggregatorId: req.user!.userId,
            cooperativeId: cooperative?.coopId || null,
          }
        }
      },
      include: { farmerProfile: true }
    });

    await createNotification(user.userId, 'Welcome to CoffeeSCM', 'Your farmer profile has been registered by your cooperative aggregator.', 'success');
    res.status(201).json({ success: true, data: user });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ message: 'A user with this email already exists' });
      return;
    }
    res.status(500).json({ message: 'Server error registering farmer' });
  }
};

export const createCheckpointLog = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { batchId, checkpointType, locationName, timestamp, notes } = req.body;
    const ownedDelivery = await prisma.deliveryRecord.findFirst({
      where: { batchId, buyer: req.user!.userId }
    });
    if (!ownedDelivery) {
      res.status(403).json({ message: 'This batch does not belong to your cooperative.' });
      return;
    }
    const log = await prisma.checkpointLog.create({
      data: {
        batchId,
        checkpointType,
        locationName,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        scannedById: req.user!.userId,
        notes,
      }
    });
    res.status(201).json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ message: 'Server error creating checkpoint log' });
  }
};

export const createTransportLog = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { batchId, transportMethod, departureTime, arrivalTime, condition, notes } = req.body;
    const ownedDelivery = await prisma.deliveryRecord.findFirst({
      where: { batchId, buyer: req.user!.userId }
    });
    if (!ownedDelivery) {
      res.status(403).json({ message: 'This batch does not belong to your cooperative.' });
      return;
    }
    const log = await prisma.transportLog.create({
      data: {
        batchId,
        transportMethod,
        departureTime: departureTime ? new Date(departureTime) : new Date(),
        arrivalTime: arrivalTime ? new Date(arrivalTime) : null,
        condition,
        scannedById: req.user!.userId,
        notes,
      }
    });

    if (arrivalTime) {
      await prisma.coffeeBatch.update({ where: { batchId }, data: { status: 'arrived_washing_station' } });
    }

    res.status(201).json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ message: 'Server error creating transport log' });
  }
};

export const getAggregatorSupportTickets = async (req: AuthRequest, res: Response): Promise<void> => {
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

export const createAggregatorSupportTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ticket = await prisma.supportTicket.create({
      data: {
        farmerId: req.user!.userId,
        subject: req.body.subject,
        category: req.body.category || 'Technical',
        description: req.body.description,
      }
    });
    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ message: 'Server error creating support ticket' });
  }
};

export const getPickupRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE pickup_requests ADD COLUMN IF NOT EXISTS coffee_variety VARCHAR(100) NULL`);
    await prisma.$executeRawUnsafe(`ALTER TABLE farmer_profiles ADD COLUMN IF NOT EXISTS coffee_varieties TEXT NULL`);
    const statusFilter = req.query.status as string | undefined;
    const cooperativeIds = await getAggregatorCooperativeIds(req.user!.userId);
    const requests = await prisma.pickupRequest.findMany({
      where: {
        ...(statusFilter ? { status: statusFilter } : {}),
        farmer: { farmerProfile: cooperativeFarmerAccessWhere(req.user!.userId, cooperativeIds) }
      },
      include: {
        farmer: {
          select: {
            userId: true,
            fullName: true,
            phone: true,
            email: true,
            farmerProfile: {
              select: {
                farmName: true,
                farmSizeHa: true,
                gpsLocation: true,
                coordinates: true,
                status: true,
                cooperative: { select: { name: true, district: true, zone: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    const requestIds = requests.map((request) => request.requestId);
    const farmerIds = requests.map((request) => request.farmer.userId);
    let coordinateSnapshots = new Map<string, { farmCoordinates: string | null; farmLocation: string | null }>();
    let farmerProfileSnapshots = new Map<string, {
      farmName: string | null;
      farmSizeHa: number | null;
      gpsLocation: string | null;
      coordinates: string | null;
      coffeeVarieties: string | null;
    }>();
    let coffeeVarietySnapshots = new Map<string, string | null>();

    if (requestIds.length > 0) {
      const quotedRequestIds = requestIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',');
      const rows = await prisma.$queryRawUnsafe<Array<{
        request_id: string;
        farm_coordinates: string | null;
        farm_location: string | null;
        coffee_variety: string | null;
      }>>(
        `SELECT request_id, farm_coordinates, farm_location, coffee_variety FROM pickup_requests WHERE request_id IN (${quotedRequestIds})`
      );

      coordinateSnapshots = new Map(rows.map((row) => [
        row.request_id,
        {
          farmCoordinates: row.farm_coordinates,
          farmLocation: row.farm_location,
        },
      ]));
      coffeeVarietySnapshots = new Map(rows.map((row) => [row.request_id, row.coffee_variety]));
    }

    if (farmerIds.length > 0) {
      const quotedFarmerIds = farmerIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',');
      const profileRows = await prisma.$queryRawUnsafe<Array<{
        user_id: string;
        farm_name: string | null;
        farm_size_ha: number | null;
        gps_location: string | null;
        coordinates: string | null;
        coffee_varieties: string | null;
      }>>(
        `SELECT user_id, farm_name, farm_size_ha, gps_location, coordinates, coffee_varieties FROM public.farmer_profiles WHERE user_id IN (${quotedFarmerIds})`
      );

      farmerProfileSnapshots = new Map(profileRows.map((row) => [
        row.user_id,
        {
          farmName: row.farm_name,
          farmSizeHa: row.farm_size_ha === null || row.farm_size_ha === undefined ? null : Number(row.farm_size_ha),
          gpsLocation: row.gps_location,
          coordinates: row.coordinates,
          coffeeVarieties: row.coffee_varieties,
        },
      ]));
    }

    const normalizedRequests = requests.map((request) => {
      const snapshot = coordinateSnapshots.get(request.requestId);
      const profileSnapshot = farmerProfileSnapshots.get(request.farmer.userId);
      const farmCoordinates = profileSnapshot?.coordinates || snapshot?.farmCoordinates || request.farmer.farmerProfile?.coordinates || null;
      const farmLocation = profileSnapshot?.gpsLocation || snapshot?.farmLocation || request.farmer.farmerProfile?.gpsLocation || null;
      const farmName = profileSnapshot?.farmName || request.farmer.farmerProfile?.farmName || null;
      const farmSizeHa = profileSnapshot?.farmSizeHa ?? request.farmer.farmerProfile?.farmSizeHa ?? 0;
      const profileVarieties = profileSnapshot?.coffeeVarieties || null;
      const coffeeVariety = coffeeVarietySnapshots.get(request.requestId) || profileVarieties?.split(',').map(item => item.trim()).filter(Boolean)[0] || 'Red Bourbon';

      return {
        ...request,
        farmCoordinates,
        farmLocation,
        coffeeVariety,
        requestedCoffeeVariety: coffeeVariety,
        availableCoffeeVarieties: profileVarieties || coffeeVariety,
        farmer: {
          ...request.farmer,
          farmerProfile: request.farmer.farmerProfile
            ? {
                ...request.farmer.farmerProfile,
                farmName,
                farmSizeHa,
                coordinates: farmCoordinates,
                gpsLocation: farmLocation,
                farmDetails: {
                  coordinates: farmCoordinates,
                  gpsLocation: farmLocation,
                  farmName,
                  coffeeVarieties: profileVarieties,
                },
              }
            : request.farmer.farmerProfile,
        },
      };
    });
    res.status(200).json({ success: true, data: normalizedRequests });
  } catch (error) {
    console.error('Error fetching pickup requests:', error);
    res.status(500).json({ message: 'Server error fetching pickup requests' });
  }
};

export const completePickupRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE pickup_requests ADD COLUMN IF NOT EXISTS receipt_url TEXT NULL`);
    await prisma.$executeRawUnsafe(`ALTER TABLE pickup_requests ADD COLUMN IF NOT EXISTS receipt_file_name VARCHAR(255) NULL`);
    await prisma.$executeRawUnsafe(`ALTER TABLE pickup_requests ADD COLUMN IF NOT EXISTS coffee_variety VARCHAR(100) NULL`);
    await prisma.$executeRawUnsafe(`ALTER TABLE delivery_records ADD COLUMN IF NOT EXISTS coffee_variety VARCHAR(100) NULL`);
    await prisma.$executeRawUnsafe(`ALTER TABLE farmer_profiles ADD COLUMN IF NOT EXISTS coffee_varieties TEXT NULL`);
    const requestId = req.params.requestId as string;
    const {
      actualWeightKg,
      receiptUrl,
      receiptFileName,
      condition,
      coffeeVariety,
      notes,
    } = req.body;

    const weight = Number(actualWeightKg);
    const price = await getBaselineFarmerRate();
    if (!weight || weight <= 0 || !price || price <= 0) {
      res.status(400).json({ message: 'Actual weight and price per kg are required' });
      return;
    }

    const request = await prisma.pickupRequest.findFirst({
      where: {
        requestId,
        farmer: { farmerProfile: cooperativeFarmerAccessWhere(req.user!.userId, await getAggregatorCooperativeIds(req.user!.userId)) }
      },
      include: {
        farmer: {
          include: {
            farmerProfile: { include: { cooperative: true } }
          }
        }
      }
    });

    if (!request || !request.farmer.farmerProfile) {
      res.status(404).json({ message: 'Pickup request not found for your cooperative.' });
      return;
    }

    if (!['APPROVED', 'PENDING'].includes(request.status)) {
      res.status(400).json({ message: `Pickup request is already ${request.status.toLowerCase()}` });
      return;
    }

    const varietyRows = await prisma.$queryRaw<Array<{ request_variety: string | null; profile_varieties: string | null }>>`
      SELECT pr.coffee_variety AS request_variety,
             fp.coffee_varieties AS profile_varieties
      FROM pickup_requests pr
      JOIN farmer_profiles fp ON fp.user_id = pr.farmer_id
      WHERE pr.request_id = ${requestId}
      LIMIT 1
    `;
    const profileVarieties = String(varietyRows[0]?.profile_varieties || '').split(',').map(item => item.trim()).filter(Boolean);
    const verifiedCoffeeVariety = String(coffeeVariety || varietyRows[0]?.request_variety || profileVarieties[0] || 'Red Bourbon').trim();

    const totalAmount = weight * price;

    const result = await prisma.$transaction(async (tx) => {
      const delivery = await tx.deliveryRecord.create({
        data: {
          profileId: request.farmer.farmerProfile!.profileId,
          batchId: '',
          deliveryDate: new Date(),
          weightKg: weight,
          buyer: req.user!.userId,
          pricePerKg: price,
        }
      });
      await tx.$executeRaw`
        UPDATE delivery_records
        SET coffee_variety = ${verifiedCoffeeVariety}
        WHERE delivery_id = ${delivery.deliveryId}
      `;

      const details = [
        notes,
        condition ? `Condition: ${condition}` : null,
        verifiedCoffeeVariety ? `Verified coffee variety: ${verifiedCoffeeVariety}` : null,
        `Payment receipt: RCT-${delivery.deliveryId.slice(0, 8).toUpperCase()}`,
        receiptFileName ? `Uploaded payment receipt: ${receiptFileName}` : null,
      ].filter(Boolean).join('\n');

      const pickupRequest = await tx.pickupRequest.update({
        where: { requestId },
        data: {
          status: 'COLLECTED',
          pickupDate: new Date(),
          notes: details || request.notes,
        }
      });
      await tx.$executeRaw`
        UPDATE pickup_requests
        SET receipt_url = ${receiptUrl || null},
            receipt_file_name = ${receiptFileName || null},
            coffee_variety = ${verifiedCoffeeVariety}
        WHERE request_id = ${requestId}
      `;

      return {
        delivery,
        pickupRequest,
        receiptNo: `RCT-${delivery.deliveryId.slice(0, 8).toUpperCase()}`,
        totalAmount,
      };
    });

    await createNotification(
      request.farmerId,
      'Pickup Completed',
      `Your coffee pickup was completed for ${weight} kg. Payment receipt ${result.receiptNo} has been recorded.`,
      'success'
    );

    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error completing pickup request:', error);
    res.status(500).json({ message: 'Server error completing pickup request' });
  }
};

export const updatePickupRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const requestId = req.params.requestId as string;
    const { status, pickupDate } = req.body;

    const request = await prisma.pickupRequest.findFirst({
      where: {
        requestId,
        farmer: { farmerProfile: cooperativeFarmerAccessWhere(req.user!.userId, await getAggregatorCooperativeIds(req.user!.userId)) }
      }
    });
    if (!request) {
      res.status(404).json({ message: 'Pickup request not found for your cooperative.' });
      return;
    }

    const updated = await prisma.pickupRequest.update({
      where: { requestId },
      data: {
        status,
        ...(pickupDate ? { pickupDate: new Date(pickupDate) } : {}),
      }
    });

    // Notify the farmer
    if (status === 'APPROVED') {
      const dateStr = pickupDate ? new Date(pickupDate).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }) : 'TBD';
      await createNotification(
        updated.farmerId,
        '✅ Pickup Request Approved',
        `Your pickup request has been approved. Scheduled date: ${dateStr}.`,
        'success'
      );
    } else if (status === 'REJECTED') {
      await createNotification(
        updated.farmerId,
        '❌ Pickup Request Rejected',
        'Your pickup request has been reviewed and could not be accommodated at this time. Please submit a new request.',
        'warning'
      );
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating pickup request:', error);
    res.status(500).json({ message: 'Server error updating pickup request' });
  }
};
