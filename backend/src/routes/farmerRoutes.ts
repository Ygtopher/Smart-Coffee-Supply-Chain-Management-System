import { Router } from 'express';
import {
  getFarmerDashboard, getFarmerPickups, requestPickup, getFarmerPickupRequests, getFarmerTraceability,
  updateFarmerProfile,
  getCooperativeMemberFarms, createCooperativeMemberFarm,
  getPriceTrends, getCommunityTopics, createCommunityPost, createCommunityReply, toggleCommunityLike, getKnowledgeArticles,
  getSupportTickets, createSupportTicket, getServiceRequests, createServiceRequest,
  getWashingStationConnection, createWashingStationRequest, getFarmerPaymentReceipts,
  getFarmerEudrStatus
} from '../controllers/farmerController';
import { authenticate, requirePermission, requireRole } from '../middlewares/authMiddleware';

const router = Router();

// Protect all farmer routes
router.use(authenticate);
router.use(requireRole(['FARMER']));

// GET /api/farmers/dashboard
router.get('/dashboard', getFarmerDashboard);
router.patch('/profile', requirePermission('Farm Profile'), updateFarmerProfile);
router.get('/cooperative-farms', requirePermission('Farm Profile'), getCooperativeMemberFarms);
router.post('/cooperative-farms', requirePermission('Farm Profile'), createCooperativeMemberFarm);

// GET /api/farmers/pickups
router.get('/pickups', requirePermission('Pickup Scheduling'), getFarmerPickups);
router.get('/payment-receipts', requirePermission('Payments'), getFarmerPaymentReceipts);
router.get('/eudr-status', requirePermission('Batch Traceability'), getFarmerEudrStatus);

// Pickup Requests
router.post('/pickup-requests', requirePermission('Pickup Scheduling'), requestPickup);
router.get('/pickup-requests', requirePermission('Pickup Scheduling'), getFarmerPickupRequests);
// Traceability
router.get('/traceability', requirePermission('Batch Traceability'), getFarmerTraceability);

// Market prices
router.get('/price-trends', requirePermission('Price Trends'), getPriceTrends);

// Community & Knowledge
router.get('/community', requirePermission('Community Discussion'), getCommunityTopics);
router.post('/community', requirePermission('Community Discussion'), createCommunityPost);
router.post('/community/:postId/replies', requirePermission('Community Discussion'), createCommunityReply);
router.post('/community/:postId/like', requirePermission('Community Discussion'), toggleCommunityLike);
router.get('/knowledge', requirePermission('Knowledge Base'), getKnowledgeArticles);

// Input and cooperative service requests
router.get('/service-requests', requirePermission('Input and Service Requests'), getServiceRequests);
router.post('/service-requests', requirePermission('Input and Service Requests'), createServiceRequest);

// Washing station connection requests
router.get('/washing-station-requests', requirePermission('Washing Station Connection'), getWashingStationConnection);
router.post('/washing-station-requests', requirePermission('Washing Station Connection'), createWashingStationRequest);

// Support Tickets
router.get('/support-tickets', requirePermission('Help & Support'), getSupportTickets);
router.post('/support-tickets', requirePermission('Help & Support'), createSupportTicket);

export default router;
