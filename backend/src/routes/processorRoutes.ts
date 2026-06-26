import { Router } from 'express';
import {
  getProcessorBatches,
  getProcessorDashboard,
  getProcessorInventory,
  updateBatchStatus,
  completeProcessing,
  logProcessingStep,
  updateInventoryItem,
  reconcileInventoryItem,
  getSupplierAssignments,
  assignSupplierAggregator,
  getProcessorSupportTickets,
  createProcessorSupportTicket,
  getProcessorCorrectiveActions,
  submitProcessorCorrectiveAction
} from '../controllers/processorController';
import { authenticate, requireAnyPermission, requirePermission, requireRole } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticate);
router.use(requireRole(['PROCESSOR']));

router.get('/batches', requirePermission('Incoming Batches'), getProcessorBatches);
router.get('/dashboard', getProcessorDashboard);
router.get('/inventory', requirePermission('Inventory Management'), getProcessorInventory);
router.get('/supplier-assignments', requirePermission('Supplier Assignment'), getSupplierAssignments);
router.patch('/supplier-assignments/:profileId', requirePermission('Supplier Assignment'), assignSupplierAggregator);
router.get('/support-tickets', requirePermission('Help & Support'), getProcessorSupportTickets);
router.post('/support-tickets', requirePermission('Help & Support'), createProcessorSupportTicket);
router.get('/corrective-actions', requireAnyPermission(['Corrective Actions', 'Batch Transformation Tracking']), getProcessorCorrectiveActions);
router.patch('/corrective-actions/:actionId/submit', requireAnyPermission(['Corrective Actions', 'Batch Transformation Tracking']), submitProcessorCorrectiveAction);
router.patch('/inventory/:itemId', requirePermission('Inventory Management'), updateInventoryItem);
router.post('/inventory/:itemId/reconcile', requirePermission('Inventory Management'), reconcileInventoryItem);
router.patch('/batches/:batchId/status', requirePermission('Processing Queue'), updateBatchStatus);
router.post('/batches/:batchId/complete', requirePermission('Processing Queue'), completeProcessing);
router.post('/batches/:batchId/logs', requirePermission('Batch Transformation Tracking'), logProcessingStep);

export default router;
