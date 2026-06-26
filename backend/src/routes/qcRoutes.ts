import { Router } from 'express';
import {
  getPendingAssessments,
  submitQualityAssessment,
  getQCHistory,
  getQCDashboard,
  getQCSupportTickets,
  createQCSupportTicket,
  generateQualityCertificate,
  getLabSyncRecords,
  createLabSyncRecord,
  getBuyerQualityRequirements,
  createBuyerQualityRequirement,
  getCorrectiveActions,
  reviewCorrectiveAction,
  getQCSamplePreparations,
  verifyQCSamplePreparation
} from '../controllers/qcController';
import { authenticate, requirePermission, requireRole } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticate);
router.use(requireRole(['QUALITY_CONTROLLER']));

router.get('/assessments/pending', requirePermission('Quality Management'), getPendingAssessments);
router.get('/assessments/history', requirePermission('Quality Management'), getQCHistory);
router.get('/dashboard', getQCDashboard);
router.get('/support-tickets', requirePermission('Help & Support'), getQCSupportTickets);
router.post('/support-tickets', requirePermission('Help & Support'), createQCSupportTicket);
router.get('/corrective-actions', requirePermission('Corrective Actions'), getCorrectiveActions);
router.patch('/corrective-actions/:actionId/review', requirePermission('Corrective Actions'), reviewCorrectiveAction);
router.get('/lab-sync', requirePermission('Lab & Buyer Requirements'), getLabSyncRecords);
router.post('/lab-sync', requirePermission('Lab & Buyer Requirements'), createLabSyncRecord);
router.get('/buyer-requirements', requirePermission('Lab & Buyer Requirements'), getBuyerQualityRequirements);
router.post('/buyer-requirements', requirePermission('Lab & Buyer Requirements'), createBuyerQualityRequirement);
router.get('/sample-preparations', requirePermission('Lab & Buyer Requirements'), getQCSamplePreparations);
router.patch('/sample-preparations/:sampleId/verify', requirePermission('Lab & Buyer Requirements'), verifyQCSamplePreparation);
router.post('/certificates/:assessmentId', requirePermission('Certification & Grading'), generateQualityCertificate);
router.post('/assessments/:batchId', requirePermission('Quality Management'), submitQualityAssessment);

export default router;
