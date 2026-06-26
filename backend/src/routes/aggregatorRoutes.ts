import { Router } from 'express';
import {
  getAggregatorDashboard,
  recordPickup,
  markPickupPaymentPaid,
  getPickupCurrentWashingStation,
  createBatch,
  getPickupRequests,
  updatePickupRequest,
  completePickupRequest,
  getAggregatorProfile,
  updateAggregatorProfile,
  registerFarmerByAggregator,
  createCheckpointLog,
  createTransportLog,
  getAggregatorSupportTickets,
  createAggregatorSupportTicket,
} from '../controllers/aggregatorController';
import { authenticate, requirePermission, requireRole } from '../middlewares/authMiddleware';

const router = Router();

// Protect all aggregator routes
router.use(authenticate);
router.use(requireRole(['AGGREGATOR']));

// GET /api/aggregators/dashboard
router.get('/dashboard', requireRole(['AGGREGATOR']), getAggregatorDashboard);

router.get('/profile', requirePermission('Profile'), getAggregatorProfile);
router.patch('/profile', requirePermission('Profile'), updateAggregatorProfile);

router.post('/farmers', requirePermission('Farmer Management'), registerFarmerByAggregator);

// POST /api/aggregators/pickups
router.post('/pickups', requirePermission('Record Pickup'), recordPickup);
router.patch('/pickups/:deliveryId/payment/paid', requirePermission('Payments'), markPickupPaymentPaid);
router.get('/pickups/:deliveryId/washing-station', requirePermission('Batch Creation'), getPickupCurrentWashingStation);

// POST /api/aggregators/batches
router.post('/batches', requirePermission('Batch Creation'), createBatch);
router.post('/checkpoints', requirePermission('Checkpoint & Transport Logging'), createCheckpointLog);
router.post('/transport-logs', requirePermission('Checkpoint & Transport Logging'), createTransportLog);

router.get('/support-tickets', requirePermission('Help & Support'), getAggregatorSupportTickets);
router.post('/support-tickets', requirePermission('Help & Support'), createAggregatorSupportTicket);

// Pickup Requests management
router.get('/pickup-requests', requirePermission('Pickup Schedule'), getPickupRequests);
router.post('/pickup-requests/:requestId/complete', requirePermission('Record Pickup'), completePickupRequest);
router.patch('/pickup-requests/:requestId', requirePermission('Pickup Schedule'), updatePickupRequest);

export default router;
