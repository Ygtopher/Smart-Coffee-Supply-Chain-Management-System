import { Router } from 'express';
import {
  createUser, getAllUsers, updateUser, deleteUser, getAuditLogs, getSystemAnalytics,
  getAdminOperations, updateSupportTicket, getCooperatives, createCooperative, updateCooperative,
  getWorkStations, createWorkStation, updateWorkStation,
  getTruckCompanies, createTruckCompany, updateTruckCompany,
  getAdminSampleWorkflow,
  getAdminRoles, updateRolePermissions, resetRolePermissionsToDefault, resetRolePermissionsToDefaults, getSystemSettings, updateSystemSettings,
  updateIntegrationConfig, runBackupJob, exportAuditLogs, bulkImportFarmers, getRequirementCompletion,
  createAuditSchedule, updateAccessRequest, createSustainabilityMetric, generateCustomReport,
  syncBusinessDirectory, createRfidScanEvent, createWarehouseBin, createMobileInventoryScan,
  runComplianceEvaluation, generateAuditPackage, runSecurityMonitoring, createBuyerFeedback,
  createTradeFinanceRecord, runSustainabilityCalculation, createBiToolExport, anchorBlockchainLedger,
  runPredictiveModel, generateJitPlan, verifySustainabilityMetrics, runRetentionArchive,
  getEudrProtectedAreas, createEudrProtectedArea, getEudrRiskAssessments,
  assessEudrFarmRisk, runAllEudrRiskAssessments, searchEudrSupplierLocations,
  getImpactMonitoring, updateImpactIndicator, createImpactEvaluationRun
} from '../controllers/adminController';
import { authenticate, requireAnyPermission, requirePermission, requireRole } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticate);
// User Management
router.post('/users', requireRole(['ADMIN']), requirePermission('System Configuration'), createUser);
router.get('/users', requireRole(['ADMIN', 'AGGREGATOR']), requireAnyPermission(['System Configuration', 'Farmer Management']), getAllUsers);
router.patch('/users/:userId', requireRole(['ADMIN']), requirePermission('System Configuration'), updateUser);
router.delete('/users/:userId', requireRole(['ADMIN']), requirePermission('System Configuration'), deleteUser);

// Audit Logs
router.get('/audit-logs', requireRole(['ADMIN']), requirePermission('Security & Audit'), getAuditLogs);
router.get('/audit-logs/export', requireRole(['ADMIN']), requirePermission('Security & Audit'), exportAuditLogs);

// System Analytics
router.get('/analytics', requireRole(['ADMIN']), requirePermission('Analytics & Reporting'), getSystemAnalytics);
router.get('/operations', requireRole(['ADMIN']), requirePermission('System Configuration'), getAdminOperations);
router.get('/requirements/completion', requireRole(['ADMIN']), requirePermission('System Configuration'), getRequirementCompletion);
router.get('/sample-workflow', requireRole(['ADMIN']), requirePermission('System Configuration'), getAdminSampleWorkflow);
router.post('/farmers/bulk-import', requireRole(['ADMIN']), requirePermission('System Configuration'), bulkImportFarmers);
router.post('/audit-schedules', requireRole(['ADMIN']), requirePermission('Security & Audit'), createAuditSchedule);
router.patch('/access-requests/:requestId', requireRole(['ADMIN']), requirePermission('Security & Audit'), updateAccessRequest);
router.post('/sustainability-metrics', requireRole(['ADMIN']), requirePermission('Analytics & Reporting'), createSustainabilityMetric);
router.post('/reports/generate', requireRole(['ADMIN']), requirePermission('Analytics & Reporting'), generateCustomReport);
router.post('/business-directory/sync', requireRole(['ADMIN']), requirePermission('API Integrations'), syncBusinessDirectory);
router.post('/rfid/scan-events', requireRole(['ADMIN']), requirePermission('API Integrations'), createRfidScanEvent);
router.post('/warehouse-bins', requireRole(['ADMIN']), requirePermission('Database & Backup'), createWarehouseBin);
router.post('/mobile-inventory-scans', requireRole(['ADMIN']), requirePermission('Database & Backup'), createMobileInventoryScan);
router.post('/compliance/evaluate', requireRole(['ADMIN']), requirePermission('Compliance Documentation'), runComplianceEvaluation);
router.post('/audit-packages', requireRole(['ADMIN']), requirePermission('Security & Audit'), generateAuditPackage);
router.post('/security/monitor', requireRole(['ADMIN']), requirePermission('Security & Audit'), runSecurityMonitoring);
router.post('/buyer-feedback', requireRole(['ADMIN']), requirePermission('Analytics & Reporting'), createBuyerFeedback);
router.post('/trade-finance', requireRole(['ADMIN']), requirePermission('Analytics & Reporting'), createTradeFinanceRecord);
router.post('/sustainability/calculate', requireRole(['ADMIN']), requirePermission('Analytics & Reporting'), runSustainabilityCalculation);
router.post('/bi/exports', requireRole(['ADMIN']), requirePermission('API Integrations'), createBiToolExport);
router.post('/blockchain/anchor', requireRole(['ADMIN']), requirePermission('Security & Audit'), anchorBlockchainLedger);
router.post('/predictive/run', requireRole(['ADMIN']), requirePermission('Analytics & Reporting'), runPredictiveModel);
router.post('/jit/plans', requireRole(['ADMIN']), requirePermission('Analytics & Reporting'), generateJitPlan);
router.post('/sustainability/verify', requireRole(['ADMIN']), requirePermission('Analytics & Reporting'), verifySustainabilityMetrics);
router.post('/retention/archive', requireRole(['ADMIN']), requirePermission('Security & Audit'), runRetentionArchive);
router.get('/eudr/protected-areas', requireRole(['ADMIN']), requirePermission('System Configuration'), getEudrProtectedAreas);
router.post('/eudr/protected-areas', requireRole(['ADMIN']), requirePermission('System Configuration'), createEudrProtectedArea);
router.get('/eudr/risk-assessments', requireRole(['ADMIN']), requirePermission('System Configuration'), getEudrRiskAssessments);
router.get('/eudr/supplier-locations', requireRole(['ADMIN']), requirePermission('System Configuration'), searchEudrSupplierLocations);
router.post('/eudr/assess-farm', requireRole(['ADMIN']), requirePermission('System Configuration'), assessEudrFarmRisk);
router.post('/eudr/run-all', requireRole(['ADMIN']), requirePermission('System Configuration'), runAllEudrRiskAssessments);
router.get('/impact-monitoring', requireRole(['ADMIN']), requirePermission('Analytics & Reporting'), getImpactMonitoring);
router.patch('/impact-monitoring/indicators/:indicatorKey', requireRole(['ADMIN']), requirePermission('Analytics & Reporting'), updateImpactIndicator);
router.post('/impact-monitoring/runs', requireRole(['ADMIN']), requirePermission('Analytics & Reporting'), createImpactEvaluationRun);
router.get('/roles', requireRole(['ADMIN']), requirePermission('Security & Audit'), getAdminRoles);
router.post('/roles/permissions/defaults', requireRole(['ADMIN']), resetRolePermissionsToDefaults);
router.post('/roles/:roleName/permissions/default', requireRole(['ADMIN']), requirePermission('Security & Audit'), resetRolePermissionsToDefault);
router.patch('/roles/:roleName/permissions', requireRole(['ADMIN']), requirePermission('Security & Audit'), updateRolePermissions);
router.get('/settings', requireRole(['ADMIN']), requirePermission('System Configuration'), getSystemSettings);
router.patch('/settings/:key', requireRole(['ADMIN']), requirePermission('System Configuration'), updateSystemSettings);
router.patch('/integrations/:name', requireRole(['ADMIN']), requirePermission('API Integrations'), updateIntegrationConfig);
router.post('/backups/:target/run', requireRole(['ADMIN']), requirePermission('Database & Backup'), runBackupJob);
router.patch('/support-tickets/:ticketId', requireRole(['ADMIN']), requirePermission('Support Administration'), updateSupportTicket);
router.get('/cooperatives', requireRole(['ADMIN']), requirePermission('System Configuration'), getCooperatives);
router.post('/cooperatives', requireRole(['ADMIN']), requirePermission('System Configuration'), createCooperative);
router.patch('/cooperatives/:coopId', requireRole(['ADMIN']), requirePermission('System Configuration'), updateCooperative);
router.get('/work-stations', requireRole(['ADMIN']), requirePermission('System Configuration'), getWorkStations);
router.post('/work-stations', requireRole(['ADMIN']), requirePermission('System Configuration'), createWorkStation);
router.patch('/work-stations/:locationId', requireRole(['ADMIN']), requirePermission('System Configuration'), updateWorkStation);
router.get('/truck-companies', requireRole(['ADMIN']), requirePermission('System Configuration'), getTruckCompanies);
router.post('/truck-companies', requireRole(['ADMIN']), requirePermission('System Configuration'), createTruckCompany);
router.patch('/truck-companies/:truckCompanyId', requireRole(['ADMIN']), requirePermission('System Configuration'), updateTruckCompany);

export default router;
