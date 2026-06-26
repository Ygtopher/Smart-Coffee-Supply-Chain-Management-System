import { Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getTraceabilityByQrCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const qrCode = req.params.qrCode as string;

    const batch = await prisma.coffeeBatch.findUnique({
      where: { qrCode },
      include: {
        qualityAssessments: {
          orderBy: { createdAt: 'desc' }
        },
        checkpointLogs: {
          orderBy: { timestamp: 'asc' }
        },
        transportLogs: {
          orderBy: { departureTime: 'asc' }
        },
        shippingRecords: {
          include: { complianceDocs: true },
          orderBy: { shippedAt: 'desc' }
        },
        inventoryItems: {
          include: {
            warehouse: true,
            stockMovements: { orderBy: { movementDate: 'asc' } }
          },
          orderBy: { fifoDate: 'asc' }
        },
      }
    });

    if (!batch) {
      res.status(404).json({ message: 'Traceability data not found for the given QR code.' });
      return;
    }

    const role = req.user!.role;
    const userId = req.user!.userId;
    if (role === 'FARMER' && batch.farmerId !== userId) {
      res.status(403).json({ message: 'Access denied for this batch.' });
      return;
    }
    if (role === 'AGGREGATOR') {
      const deliveryReference = batch.batchGroupId || batch.batchId;
      const ownedDeliveries = await prisma.$queryRaw<Array<{ delivery_id: string }>>`
        SELECT dr.delivery_id
        FROM delivery_records dr
        JOIN farmer_profiles fp ON fp.profile_id = dr.profile_id
        WHERE dr.batch_id IN (${batch.batchId}, ${deliveryReference})
          AND (dr.buyer = ${userId} OR fp.aggregator_id = ${userId})
        LIMIT 1
      `;
      if (ownedDeliveries.length === 0) {
        res.status(403).json({ message: 'Access denied for this cooperative batch.' });
        return;
      }
    }
    if (role === 'PROCESSOR') {
      const assignedStations = await prisma.$queryRaw<Array<{ name: string }>>`
        SELECT name
        FROM warehouse_locations
        WHERE type = 'Washing Station'
          AND status = 'active'
          AND processor_id = ${userId}
      `;
      if (!assignedStations.some(station => station.name === batch.washingStation)) {
        res.status(403).json({ message: 'Access denied. This batch is assigned to another washing station.' });
        return;
      }
    }
    if (role === 'QUALITY_CONTROLLER') {
      const qualityVisibleStatuses = ['ready_for_quality', 'quality_assessed', 'corrective_action', 'export_ready', 'shipment_authorized'];
      if (batch.qualityAssessments.length === 0 && !qualityVisibleStatuses.includes(batch.status)) {
        res.status(403).json({ message: 'Access denied. This batch has not reached quality control.' });
        return;
      }
    }
    if (role === 'EXPORTER') {
      if (batch.qualityAssessments.length === 0) {
        res.status(403).json({ message: 'Access denied. This batch has not been quality assessed.' });
        return;
      }
    }
    if (role === 'LOGISTICS') {
      const logisticsVisibleStatuses = ['shipment_authorized', 'Export Scheduled', 'Dispatched', 'In Transit', 'Delivered'];
      if (batch.shippingRecords.length === 0 && !logisticsVisibleStatuses.includes(batch.status)) {
        res.status(403).json({ message: 'Access denied. This batch has not been authorized for logistics.' });
        return;
      }
    }

    // Get the farmer who produced this batch
    const farmer = await prisma.user.findUnique({
      where: { userId: batch.farmerId },
      include: { farmerProfile: true }
    });

    // Get the Delivery Records tied to this batch
    const deliveryRecords = await prisma.deliveryRecord.findMany({
      where: { batchId: batch.batchId }
    });

    res.status(200).json({
      success: true,
      data: {
        batchId: batch.batchId,
        qrCode: batch.qrCode,
        farmName: batch.farmName,
        district: batch.district,
        washingStation: batch.washingStation,
        weightCherry: batch.weightCherry,
        variety: (batch as any).coffeeVariety || "Red Bourbon",
        processType: "Fully Washed",
        stage: batch.status,
        
        quality: batch.qualityAssessments[0] || null,
        qualityHistory: batch.qualityAssessments,
        
        deliveries: deliveryRecords,
        
        checkpoints: batch.checkpointLogs,

        transport: batch.transportLogs,

        inventory: batch.inventoryItems,
        
        exportDetails: batch.shippingRecords[0] || null,
        shipmentHistory: batch.shippingRecords,
        
        farmer: farmer?.farmerProfile || null,
      }
    });
  } catch (error) {
    console.error('Error fetching traceability:', error);
    res.status(500).json({ message: 'Server error retrieving traceability data' });
  }
};
