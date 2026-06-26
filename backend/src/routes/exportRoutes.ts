import { Router } from 'express';
import {
  createShippingRecord, generateComplianceDoc, getExporterStats, getApprovedBatches,
  getShipments, updateShipmentStatus, confirmProofOfDelivery, getComplianceDocs,
  getExportOrders, createExportOrder,
  getFarmerPayments, getQCAssessmentHistory,
  getLogisticsDashboard, logLogisticsEvent, syncNaebShipment,
  getLogisticsSupportTickets, createLogisticsSupportTicket,
  updateComplianceDocStatus, getExporterReporting,
  getExporterSupportTickets, createExporterSupportTicket,
  updateExportOrderStatus, createExportOrderMessage,
  getSampleDispatches, dispatchCustomerSample,
  getTruckCompanies,
  authorizeBatchForShipment, getRoadTransports, createRoadTransport, createRoadTransitCheckpoint, completeRoadTransportJourney,
  getDriverRoadTrip, createDriverRoadCheckpoint,
  getOrderMatchingBatches, allocateOrderBatches, getLogisticsAuthorizedOrders,
  getExporterEudrRiskAssessments
} from '../controllers/exportController';
import { authenticate, requireAnyPermission, requirePermission, requireRole } from '../middlewares/authMiddleware';

const router = Router();

// Driver links are scoped to one expiring transport assignment and do not expose the Logistics dashboard.
router.get('/driver-trips/:accessToken', getDriverRoadTrip);
router.post('/driver-trips/:accessToken/checkpoints', createDriverRoadCheckpoint);

router.use(authenticate);

// Exporter & Logistics are operational roles. ADMIN has separate platform routes.
router.get('/stats', requireRole(['EXPORTER', 'LOGISTICS']), requirePermission('Analytics & Reporting'), getExporterStats);
router.get('/reporting', requireRole(['EXPORTER']), requirePermission('Analytics & Reporting'), getExporterReporting);
router.get('/eudr/risk-assessments', requireRole(['EXPORTER']), requirePermission('Batch Traceability'), getExporterEudrRiskAssessments);
router.get('/logistics/dashboard', requireRole(['LOGISTICS', 'EXPORTER']), requirePermission('Logistics & Shipping'), getLogisticsDashboard);
router.get('/logistics/authorized-orders', requireRole(['LOGISTICS']), requirePermission('Logistics & Shipping'), getLogisticsAuthorizedOrders);
router.get('/batches/approved', requireRole(['EXPORTER', 'LOGISTICS']), requireAnyPermission(['Batch Traceability', 'Logistics & Shipping']), getApprovedBatches);
router.patch('/batches/:batchId/authorize-shipment', requireRole(['EXPORTER']), requirePermission('Logistics & Shipping'), authorizeBatchForShipment);
router.get('/shipments', requireRole(['EXPORTER', 'LOGISTICS']), requireAnyPermission(['Logistics & Shipping', 'Container Management', 'Transit Checkpoints', 'Transit Events', 'Route Tracking', 'Proof of Delivery', 'Delivery Confirmation']), getShipments);
router.post('/shipments', requireRole(['LOGISTICS']), requireAnyPermission(['Logistics & Shipping', 'Container Management']), createShippingRecord);
router.get('/truck-companies', requireRole(['LOGISTICS', 'EXPORTER']), requireAnyPermission(['Transit Checkpoints', 'Transit Events', 'Route Tracking', 'Logistics & Shipping']), getTruckCompanies);
router.patch('/shipments/:shipmentId/status', requireRole(['LOGISTICS']), requirePermission('Logistics & Shipping'), updateShipmentStatus);
router.post('/shipments/:shipmentId/proof-of-delivery', requireRole(['LOGISTICS']), requireAnyPermission(['Proof of Delivery', 'Delivery Confirmation', 'Logistics & Shipping']), confirmProofOfDelivery);
router.post('/shipments/:shipmentId/naeb-sync', requireRole(['LOGISTICS', 'EXPORTER']), requirePermission('Compliance Documentation'), syncNaebShipment);
router.post('/logistics/events', requireRole(['LOGISTICS']), requireAnyPermission(['Transit Checkpoints', 'Transit Events', 'Route Tracking', 'Logistics & Shipping']), logLogisticsEvent);
router.get('/logistics/road-transports', requireRole(['LOGISTICS', 'EXPORTER']), requireAnyPermission(['Transit Checkpoints', 'Transit Events', 'Route Tracking', 'Logistics & Shipping']), getRoadTransports);
router.post('/shipments/:shipmentId/road-transport', requireRole(['LOGISTICS']), requireAnyPermission(['Transit Checkpoints', 'Transit Events', 'Route Tracking', 'Logistics & Shipping']), createRoadTransport);
router.post('/road-transports/:roadTransportId/checkpoints', requireRole(['LOGISTICS']), requireAnyPermission(['Transit Checkpoints', 'Transit Events', 'Route Tracking', 'Logistics & Shipping']), createRoadTransitCheckpoint);
router.patch('/road-transports/:roadTransportId/complete', requireRole(['LOGISTICS']), requireAnyPermission(['Transit Checkpoints', 'Transit Events', 'Route Tracking', 'Logistics & Shipping']), completeRoadTransportJourney);
router.get('/compliance-docs', requireRole(['EXPORTER', 'LOGISTICS']), requirePermission('Compliance Documentation'), getComplianceDocs);
router.post('/compliance-docs', requireRole(['LOGISTICS']), requirePermission('Compliance Documentation'), generateComplianceDoc);
router.patch('/compliance-docs/:docId/status', requireRole(['EXPORTER']), requirePermission('Compliance Documentation'), updateComplianceDocStatus);
router.get('/logistics/support-tickets', requireRole(['LOGISTICS']), requirePermission('Help & Support'), getLogisticsSupportTickets);
router.post('/logistics/support-tickets', requireRole(['LOGISTICS']), requirePermission('Help & Support'), createLogisticsSupportTicket);
router.get('/support-tickets', requireRole(['EXPORTER']), requirePermission('Help & Support'), getExporterSupportTickets);
router.post('/support-tickets', requireRole(['EXPORTER']), requirePermission('Help & Support'), createExporterSupportTicket);
router.get('/orders', requireRole(['EXPORTER']), requirePermission('Order Management'), getExportOrders);
router.post('/orders', requireRole(['EXPORTER']), requirePermission('Order Management'), createExportOrder);
router.get('/orders/:orderId/matching-batches', requireRole(['EXPORTER']), requirePermission('Order Management'), getOrderMatchingBatches);
router.post('/orders/:orderId/allocations', requireRole(['EXPORTER']), requirePermission('Order Management'), allocateOrderBatches);
router.patch('/orders/:orderId/status', requireRole(['EXPORTER']), requirePermission('Order Management'), updateExportOrderStatus);
router.post('/orders/:orderId/messages', requireRole(['EXPORTER']), requirePermission('Order Management'), createExportOrderMessage);
router.get('/logistics/sample-dispatches', requireRole(['LOGISTICS', 'EXPORTER']), requireAnyPermission(['Logistics & Shipping', 'Proof of Delivery', 'Delivery Confirmation']), getSampleDispatches);
router.patch('/logistics/sample-dispatches/:sampleId/dispatch', requireRole(['LOGISTICS']), requireAnyPermission(['Logistics & Shipping', 'Proof of Delivery', 'Delivery Confirmation']), dispatchCustomerSample);

// Farmer payments (accessed via exports for code reuse)
router.get('/farmer-payments', requireRole(['FARMER']), requirePermission('Payments'), getFarmerPayments);

// QC history
router.get('/qc-history', requireRole(['QUALITY_CONTROLLER']), requirePermission('Quality Management'), getQCAssessmentHistory);

export default router;
