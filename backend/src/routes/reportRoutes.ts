import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/authMiddleware';
import { generateRoleReport, getReportTemplates } from '../controllers/reportController';

const router = Router();

router.use(authenticate);

router.get('/templates', requirePermission('Analytics & Reporting'), getReportTemplates);
router.post('/generate', requirePermission('Analytics & Reporting'), generateRoleReport);

export default router;
