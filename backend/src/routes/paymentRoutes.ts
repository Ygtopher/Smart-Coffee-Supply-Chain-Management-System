import { Router } from 'express';
import { checkPaymentStatus } from '../controllers/paymentController';
import { authenticate, requirePermission } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticate);

// POST /api/payments/status
router.post('/status', requirePermission('Payments'), checkPaymentStatus);

export default router;
