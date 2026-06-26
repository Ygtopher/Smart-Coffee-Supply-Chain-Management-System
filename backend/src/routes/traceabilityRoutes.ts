import { Router } from 'express';
import { getTraceabilityByQrCode } from '../controllers/traceabilityController';
import { authenticate, requirePermission, requireRole } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticate);

// Private, role-aware route for authorized supply-chain actors.
router.use(requireRole(['FARMER', 'AGGREGATOR', 'PROCESSOR', 'QUALITY_CONTROLLER', 'LOGISTICS', 'EXPORTER']));
router.get('/:qrCode', requirePermission('Batch Traceability'), getTraceabilityByQrCode);

export default router;
