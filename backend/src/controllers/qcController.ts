import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import prisma from '../config/db';
import { createNotification } from './notificationController';

const ensureQualityRequirementTables = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "lab_sync_records" (
      "sync_id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "batch_id" TEXT NULL REFERENCES "coffee_batches"("batch_id") ON DELETE SET NULL,
      "lab_name" VARCHAR(150) NOT NULL,
      "sample_code" VARCHAR(100) NOT NULL,
      "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "status" VARCHAR(50) NOT NULL DEFAULT 'Received',
      "synced_at" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "buyer_quality_requirements" (
      "requirement_id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "order_id" TEXT NULL REFERENCES "export_orders"("order_id") ON DELETE SET NULL,
      "buyer" VARCHAR(150) NOT NULL,
      "grade" VARCHAR(50) NOT NULL,
      "min_cupping_score" NUMERIC(4,2) NOT NULL DEFAULT 80,
      "moisture_min" NUMERIC(5,2) NOT NULL DEFAULT 10,
      "moisture_max" NUMERIC(5,2) NOT NULL DEFAULT 12,
      "max_defects" INTEGER NOT NULL DEFAULT 10,
      "notes" TEXT NULL,
      "status" VARCHAR(50) NOT NULL DEFAULT 'Active',
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
};

const ensureCorrectiveActionTable = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "corrective_actions" (
      "action_id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "assessment_id" TEXT NULL REFERENCES "quality_assessments"("assessment_id") ON DELETE SET NULL,
      "batch_id" TEXT NOT NULL REFERENCES "coffee_batches"("batch_id") ON DELETE CASCADE,
      "issue_type" VARCHAR(80) NOT NULL,
      "severity" VARCHAR(30) NOT NULL DEFAULT 'Medium',
      "responsible_role" VARCHAR(50) NOT NULL DEFAULT 'PROCESSOR',
      "required_action" TEXT NOT NULL,
      "deadline" TIMESTAMP NULL,
      "status" VARCHAR(50) NOT NULL DEFAULT 'Assigned',
      "submitted_notes" TEXT NULL,
      "evidence" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "created_by" TEXT NULL REFERENCES "users"("user_id") ON DELETE SET NULL,
      "submitted_by" TEXT NULL REFERENCES "users"("user_id") ON DELETE SET NULL,
      "reviewed_by" TEXT NULL REFERENCES "users"("user_id") ON DELETE SET NULL,
      "review_notes" TEXT NULL,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "submitted_at" TIMESTAMP NULL,
      "reviewed_at" TIMESTAMP NULL
    )
  `);
};

const ensureSamplePreparationStorage = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "sample_preparations" (
      "sample_id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "order_id" TEXT NOT NULL REFERENCES "export_orders"("order_id") ON DELETE CASCADE,
      "batch_id" TEXT NULL REFERENCES "coffee_batches"("batch_id") ON DELETE SET NULL,
      "sample_quantity_g" INTEGER NULL,
      "status" VARCHAR(60) NOT NULL DEFAULT 'Awaiting QC Verification',
      "qc_notes" TEXT NULL,
      "verified_by" TEXT NULL REFERENCES "users"("user_id") ON DELETE SET NULL,
      "verified_at" TIMESTAMP NULL,
      "dispatch_carrier" VARCHAR(150) NULL,
      "tracking_no" VARCHAR(150) NULL,
      "dispatch_notes" TEXT NULL,
      "dispatched_by" TEXT NULL REFERENCES "users"("user_id") ON DELETE SET NULL,
      "dispatched_at" TIMESTAMP NULL,
      "created_by" TEXT NULL REFERENCES "users"("user_id") ON DELETE SET NULL,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "sample_preparations_order_id_key" ON "sample_preparations" ("order_id")`);
};

const samplePreparationView = (row: any) => ({
  sampleId: row.sample_id,
  orderId: row.order_id,
  referenceCode: row.reference_code,
  buyer: row.buyer,
  customerEmail: row.customer_email,
  country: row.country,
  grade: row.grade,
  batchId: row.batch_id,
  qrCode: row.qr_code,
  farmName: row.farm_name,
  washingStation: row.washing_station,
  sampleQuantityG: row.sample_quantity_g,
  status: row.status,
  qcNotes: row.qc_notes,
  verifiedByName: row.verified_by_name,
  verifiedAt: row.verified_at,
  dispatchCarrier: row.dispatch_carrier,
  trackingNo: row.tracking_no,
  dispatchedAt: row.dispatched_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const defectTotal = (defects: any): number => {
  if (defects == null) return 0;
  if (typeof defects === 'number') return defects;
  if (typeof defects === 'string') return Number(defects) || 0;
  if (Array.isArray(defects)) return defects.reduce((s, v) => s + (Number(v.count ?? v) || 0), 0);
  if (typeof defects === 'object') return Object.values(defects).reduce((s: number, v: any) => s + (Number(v) || 0), 0);
  return 0;
};

const assignTier = (score: number, moisture: number, defects: any) => {
  const totalDefects = defectTotal(defects);
  if (score >= 85 && totalDefects <= 5 && moisture >= 10 && moisture <= 12) return 'Premium';
  if (score >= 75 && score < 85 && totalDefects <= 10) return 'Standard';
  return 'Low';
};

const tierToGrade = (tier: string) => {
  if (tier === 'Premium') return 'A1';
  if (tier === 'Standard') return 'A2';
  return 'A3';
};

const inferCorrectiveIssue = (score: number, moisture: number, defects: number, buyerFailures: any[]) => {
  if (buyerFailures.length) return 'Buyer requirement mismatch';
  if (moisture < 10 || moisture > 12) return 'Moisture outside threshold';
  if (defects > 10) return 'High defect count';
  if (score < 75) return 'Low cupping score';
  return 'Quality non-conformance';
};

const inferCorrectiveSeverity = (score: number, moisture: number, defects: number) => {
  if (score < 70 || moisture < 9 || moisture > 13 || defects > 15) return 'High';
  if (score < 75 || moisture < 10 || moisture > 12 || defects > 10) return 'Medium';
  return 'Low';
};

const defaultCorrectiveAction = (issueType: string, buyerFailures: any[]) => {
  if (buyerFailures.length) {
    return `Review buyer quality requirement failures: ${buyerFailures.map(f => `${f.buyer} - ${f.issue}`).join('; ')}. Correct the batch or separate it from this buyer requirement before resubmission.`;
  }
  if (issueType.includes('Moisture')) return 'Re-dry the batch to 10-12% moisture, record the drying action, and resubmit for QC review.';
  if (issueType.includes('defect')) return 'Sort and remove defective beans, document the defect reduction, and resubmit for QC review.';
  if (issueType.includes('cupping')) return 'Review processing conditions, separate weak lots if needed, and resubmit the corrected batch for QC review.';
  return 'Perform remediation, upload evidence, and resubmit the batch for QC review.';
};

const evaluateBuyerRequirements = (requirements: any[], score: number, moisture: number, defects: number, tier: string) => {
  const grade = tierToGrade(tier);
  const relevant = requirements.filter((requirement) => {
    const requirementGrade = String(requirement.grade || '').toUpperCase();
    return !requirementGrade || requirementGrade === grade || requirementGrade === String(tier).toUpperCase();
  });
  const failures = relevant.flatMap((requirement) => {
    const issues: string[] = [];
    if (score < Number(requirement.min_cupping_score || requirement.minCuppingScore || 0)) issues.push(`cupping below ${requirement.min_cupping_score}`);
    if (moisture < Number(requirement.moisture_min || 0) || moisture > Number(requirement.moisture_max || 100)) issues.push(`moisture outside ${requirement.moisture_min}-${requirement.moisture_max}%`);
    if (defects > Number(requirement.max_defects ?? 9999)) issues.push(`defects above ${requirement.max_defects}`);
    return issues.map((issue) => ({
      buyer: requirement.buyer,
      requirementId: requirement.requirement_id,
      issue,
    }));
  });
  return { checked: relevant.length, failures };
};

const certificateNo = (assessmentId: string) => `QC-${assessmentId.replace(/-/g, '').slice(0, 12).toUpperCase()}`;

const includeBatchTraceability = {
  inventoryItems: { include: { warehouse: true, stockMovements: true } },
  checkpointLogs: { orderBy: { timestamp: 'asc' as const }, include: { scannedBy: { select: { fullName: true, role: true } } } },
  transportLogs: { orderBy: { departureTime: 'desc' as const } },
  qualityAssessments: { orderBy: { createdAt: 'desc' as const } },
};

const enrichAssessment = (assessment: any) => {
  const score = Number(assessment.cuppingScore);
  const moisture = Number(assessment.moisture);
  const tier = assignTier(score, moisture, assessment.defects);
  return {
    ...assessment,
    qualityTier: tier,
    defectTotal: defectTotal(assessment.defects),
    certificate: {
      certificateNo: certificateNo(assessment.assessmentId),
      status: tier === 'Low' ? 'Corrective Action Required' : 'Issued',
      issuedAt: assessment.createdAt,
      assessorId: assessment.assessorId,
      batchId: assessment.batchId,
    }
  };
};

export const getPendingAssessments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const batches = await prisma.coffeeBatch.findMany({
      where: { status: 'ready_for_quality' },
      include: includeBatchTraceability
    });

    res.status(200).json({ success: true, data: batches });
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving pending assessments' });
  }
};

export const submitQualityAssessment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const batchId = req.params.batchId as string;
    const {
      cuppingScore,
      moisture,
      defects,
      notes,
      density,
      screenSize,
      scaScores,
      evidence,
      correctiveAction
    } = req.body;
    const assessorId = req.user!.userId;

    const score = Number(cuppingScore);
    const moistureValue = Number(moisture);
    const totalDefects = defectTotal(defects);
    if (!Number.isFinite(score) || score < 0 || score > 100 || !Number.isFinite(moistureValue) || moistureValue < 0 || moistureValue > 100) {
      res.status(400).json({ message: 'Cupping score and moisture must be valid numeric values' });
      return;
    }
    const assignedTier = assignTier(score, moistureValue, defects);
    await ensureQualityRequirementTables();
    const buyerRequirements = await prisma.$queryRaw<Array<any>>`
      SELECT bqr.*, eo.batch_id
      FROM buyer_quality_requirements bqr
      LEFT JOIN export_orders eo ON eo.order_id = bqr.order_id
      WHERE bqr.status = 'Active'
        AND (eo.batch_id IS NULL OR eo.batch_id = ${batchId})
    `;
    const buyerRequirementResult = evaluateBuyerRequirements(buyerRequirements, score, moistureValue, totalDefects, assignedTier);
    const approved = assignedTier !== 'Low' && buyerRequirementResult.failures.length === 0;

    const result = await prisma.$transaction(async (tx) => {
      const assessment = await tx.qualityAssessment.create({
        data: {
          batchId,
          cuppingScore: score,
          moisture: moistureValue,
          defects,
          assessorId,
          notes: JSON.stringify({
            notes,
            density,
            screenSize,
            scaScores,
            evidence,
            tier: assignedTier,
            defectTotal: totalDefects,
            buyerRequirementsChecked: buyerRequirementResult.checked,
            buyerRequirementFailures: buyerRequirementResult.failures,
            correctiveAction: approved ? null : correctiveAction,
          }),
        }
      });

      const batch = await tx.coffeeBatch.update({
        where: { batchId },
        data: { status: approved ? 'export_ready' : 'corrective_action_required' }
      });

      await tx.inventoryItem.updateMany({
        where: { batchId, status: 'Awaiting QC' },
        data: { status: approved ? `QC Passed - ${assignedTier}` : 'QC Failed - Corrective Action' }
      });

      await tx.auditLog.create({
        data: {
          userId: assessorId,
          action: 'QUALITY_ASSESSMENT_SUBMITTED',
          entityType: 'QualityAssessment',
          entityId: assessment.assessmentId,
          details: { batchId, score, moisture: moistureValue, totalDefects, assignedTier, approved, buyerRequirementResult },
          ipAddress: req.ip,
        }
      });

      return { assessment, batch };
    });

    if (approved) {
      await ensureCorrectiveActionTable();
      await prisma.$executeRawUnsafe(
        `UPDATE corrective_actions
         SET status = 'Resolved',
             reviewed_by = $1,
             reviewed_at = NOW(),
             review_notes = COALESCE(review_notes, 'Resolved by successful QC reassessment.'),
             updated_at = NOW()
         WHERE batch_id = $2 AND status IN ('Assigned', 'In Progress', 'Submitted for Review', 'Ready for Reassessment', 'Rejected', 'Overdue')`,
        assessorId,
        batchId
      );
      const exporterUsers = await prisma.user.findMany({
        where: { role: { roleName: 'EXPORTER' }, status: 'active' },
        select: { userId: true }
      });
      await Promise.all(exporterUsers.map(user => createNotification(
        user.userId,
        'Batch Awaiting Shipment Authorization',
        `Batch ${result.batch.qrCode} has been certified ${assignedTier}. Review it and authorize Logistics to prepare shipment details.`,
        'success'
      )));
    } else {
      await ensureCorrectiveActionTable();
      await prisma.$executeRawUnsafe(
        `UPDATE corrective_actions
         SET status = 'Rejected',
             reviewed_by = $1,
             reviewed_at = NOW(),
             review_notes = COALESCE(review_notes, 'QC reassessment still failed. A new corrective action was opened.'),
             updated_at = NOW()
         WHERE batch_id = $2 AND status IN ('Submitted for Review', 'Ready for Reassessment')`,
        assessorId,
        batchId
      );
      const issueType = inferCorrectiveIssue(score, moistureValue, totalDefects, buyerRequirementResult.failures);
      const severity = inferCorrectiveSeverity(score, moistureValue, totalDefects);
      const requiredAction = correctiveAction || defaultCorrectiveAction(issueType, buyerRequirementResult.failures);
      const deadline = new Date(Date.now() + 72 * 60 * 60 * 1000);
      await prisma.$queryRawUnsafe(
        `INSERT INTO corrective_actions
          (assessment_id, batch_id, issue_type, severity, responsible_role, required_action, deadline, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'Assigned', $8)`,
        result.assessment.assessmentId,
        batchId,
        issueType,
        severity,
        'PROCESSOR',
        requiredAction,
        deadline,
        assessorId
      );
      await prisma.checkpointLog.create({
        data: {
          batchId,
          checkpointType: 'Corrective Action',
          locationName: result.batch.washingStation,
          timestamp: new Date(),
          scannedById: assessorId,
          notes: requiredAction,
        }
      });
      const recipients = await prisma.user.findMany({
        where: { role: { roleName: { in: ['PROCESSOR', 'AGGREGATOR'] } }, status: 'active' },
        select: { userId: true }
      });
      await Promise.all(recipients.map(user => createNotification(
        user.userId,
        'Corrective Action Required',
        `Batch ${result.batch.qrCode} needs correction: ${issueType}. Submit evidence within 72 hours.`,
        'warning'
      )));
    }

    res.status(201).json({ success: true, data: { ...result, qualityTier: assignedTier, defectTotal: totalDefects, approved, buyerRequirementResult } });
  } catch (error) {
    console.error('Error submitting QC assessment:', error);
    res.status(500).json({ message: 'Server error submitting assessment' });
  }
};

export const getCorrectiveActions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureCorrectiveActionTable();
    const rows = await prisma.$queryRaw<Array<any>>`
      SELECT ca.*,
             cb.qr_code, cb.farm_name, cb.district, cb.washing_station, cb.status AS batch_status,
             qa.cupping_score, qa.moisture, qa.defects, qa.notes AS assessment_notes,
             creator.full_name AS created_by_name,
             submitter.full_name AS submitted_by_name,
             reviewer.full_name AS reviewed_by_name
      FROM corrective_actions ca
      JOIN coffee_batches cb ON cb.batch_id = ca.batch_id
      LEFT JOIN quality_assessments qa ON qa.assessment_id = ca.assessment_id
      LEFT JOIN users creator ON creator.user_id = ca.created_by
      LEFT JOIN users submitter ON submitter.user_id = ca.submitted_by
      LEFT JOIN users reviewer ON reviewer.user_id = ca.reviewed_by
      ORDER BY
        CASE ca.status
          WHEN 'Ready for Reassessment' THEN 1
          WHEN 'Submitted for Review' THEN 2
          WHEN 'Overdue' THEN 2
          WHEN 'Assigned' THEN 3
          WHEN 'In Progress' THEN 4
          WHEN 'Rejected' THEN 5
          ELSE 6
        END,
        ca.created_at DESC
    `;
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching corrective actions:', error);
    res.status(500).json({ message: 'Server error retrieving corrective actions' });
  }
};

export const reviewCorrectiveAction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureCorrectiveActionTable();
    const actionId = req.params.actionId as string;
    const { decision, reviewNotes } = req.body;
    const normalized = String(decision || '').toLowerCase();
    if (!['resolved', 'rejected'].includes(normalized)) {
      res.status(400).json({ message: 'decision must be resolved or rejected' });
      return;
    }

    const existing = await prisma.$queryRaw<Array<any>>`
      SELECT ca.*, cb.qr_code
      FROM corrective_actions ca
      JOIN coffee_batches cb ON cb.batch_id = ca.batch_id
      WHERE ca.action_id = ${actionId}
      LIMIT 1
    `;
    if (!existing.length) {
      res.status(404).json({ message: 'Corrective action not found' });
      return;
    }
    const action = existing[0];
    const nextStatus = normalized === 'resolved' ? 'Resolved' : 'Rejected';
    const nextBatchStatus = normalized === 'resolved' ? 'ready_for_quality' : 'corrective_action_required';

    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `UPDATE corrective_actions
         SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_notes = $3, updated_at = NOW()
         WHERE action_id = $4`,
        nextStatus,
        req.user!.userId,
        reviewNotes || null,
        actionId
      );
      await tx.coffeeBatch.update({
        where: { batchId: action.batch_id },
        data: { status: nextBatchStatus }
      });
      await tx.checkpointLog.create({
        data: {
          batchId: action.batch_id,
          checkpointType: normalized === 'resolved' ? 'Corrective Action Resolved' : 'Corrective Action Rejected',
          locationName: action.washing_station || 'Quality Lab',
          timestamp: new Date(),
          scannedById: req.user!.userId,
          notes: reviewNotes || (normalized === 'resolved'
            ? 'Corrective action accepted by QC. Batch returned to quality queue for final assessment.'
            : 'Corrective evidence rejected by QC. More remediation is required.'),
        }
      });
    });

    if (action.submitted_by) {
      await createNotification(
        action.submitted_by,
        normalized === 'resolved' ? 'Corrective Action Accepted' : 'Corrective Action Rejected',
        normalized === 'resolved'
          ? `Correction evidence for batch ${action.qr_code || action.batch_id} was accepted. Batch is ready for QC reassessment.`
          : `Correction evidence for batch ${action.qr_code || action.batch_id} was rejected. Please correct and resubmit.`,
        normalized === 'resolved' ? 'success' : 'warning'
      );
    }

    res.status(200).json({ success: true, data: { actionId, status: nextStatus, batchStatus: nextBatchStatus } });
  } catch (error) {
    console.error('Error reviewing corrective action:', error);
    res.status(500).json({ message: 'Server error reviewing corrective action' });
  }
};

export const getQCHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const history = await prisma.qualityAssessment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        batch: { include: includeBatchTraceability },
        assessor: true
      }
    });
    res.status(200).json({ success: true, data: history.map(enrichAssessment) });
  } catch (error) {
    console.error('Error fetching QC history:', error);
    res.status(500).json({ message: 'Server error retrieving QC history' });
  }
};

export const getQCDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const assessments = await prisma.qualityAssessment.findMany({
      include: { batch: { include: includeBatchTraceability }, assessor: true },
      orderBy: { createdAt: 'desc' }
    });
    const enriched = assessments.map(enrichAssessment);
    const pending = await prisma.coffeeBatch.count({ where: { status: 'ready_for_quality' } });
    const completeDefects = enriched.filter((a: any) => defectTotal(a.defects) >= 0 && typeof a.defects === 'object').length;
    const certificates = enriched.filter((a: any) => a.qualityTier !== 'Low').length;
    await ensureCorrectiveActionTable();
    const correctiveActions = await prisma.$queryRaw<Array<{ status: string }>>`SELECT status FROM corrective_actions`;
    const resolvedCorrective = correctiveActions.filter(a => a.status === 'Resolved').length;
    const turnaroundValues = enriched.map((a: any) => {
      const ready = a.batch?.checkpointLogs?.find((l: any) => l.checkpointType === 'Processing Completed');
      return ready ? Math.max(0, (new Date(a.createdAt).getTime() - new Date(ready.timestamp).getTime()) / 3600000) : null;
    }).filter((v: any) => typeof v === 'number');
    const byRegion = Object.values(enriched.reduce((acc: any, a: any) => {
      const key = a.batch?.district || 'Unknown';
      acc[key] = acc[key] || { region: key, count: 0, avgScore: 0 };
      acc[key].count += 1;
      acc[key].avgScore += Number(a.cuppingScore);
      return acc;
    }, {})).map((r: any) => ({ ...r, avgScore: Number((r.avgScore / r.count).toFixed(1)) }));

    res.status(200).json({
      success: true,
      data: {
        pending,
        assessments: enriched,
        analytics: { byRegion },
        kpis: {
          assessmentTurnaroundHours: turnaroundValues.length ? Number((turnaroundValues.reduce((s: number, v: number) => s + v, 0) / turnaroundValues.length).toFixed(1)) : 0,
          cuppingConsistencyRate: 100,
          defectLoggingAccuracy: enriched.length ? Math.round((completeDefects / enriched.length) * 100) : 100,
          certificateGenerationSuccessRate: enriched.length ? Math.round((certificates / enriched.length) * 100) : 100,
          correctiveActionResolutionRate: correctiveActions.length ? Math.round((resolvedCorrective / correctiveActions.length) * 100) : 100,
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving QC dashboard' });
  }
};

export const getQCSupportTickets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { farmerId: req.user!.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, data: tickets });
  } catch {
    res.status(500).json({ message: 'Server error retrieving QC support tickets' });
  }
};

export const createQCSupportTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subject, category, description } = req.body;
    const ticket = await prisma.supportTicket.create({
      data: { farmerId: req.user!.userId, subject, category, description, status: 'Open' }
    });
    res.status(201).json({ success: true, data: ticket });
  } catch {
    res.status(500).json({ message: 'Server error creating QC support ticket' });
  }
};

export const generateQualityCertificate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const assessmentId = req.params.assessmentId as string;
    const assessment = await prisma.qualityAssessment.findUnique({
      where: { assessmentId },
      include: { batch: true, assessor: true }
    });
    if (!assessment) {
      res.status(404).json({ message: 'Assessment not found' });
      return;
    }
    const enriched = enrichAssessment(assessment);
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'QUALITY_CERTIFICATE_GENERATED',
        entityType: 'QualityAssessment',
        entityId: assessment.assessmentId,
        details: enriched.certificate,
        ipAddress: req.ip,
      }
    });
    res.status(200).json({ success: true, data: enriched.certificate });
  } catch {
    res.status(500).json({ message: 'Server error generating quality certificate' });
  }
};

export const getLabSyncRecords = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureQualityRequirementTables();
    const rows = await prisma.$queryRaw<Array<any>>`
      SELECT lsr.*, cb.qr_code, cb.farm_name
      FROM lab_sync_records lsr
      LEFT JOIN coffee_batches cb ON cb.batch_id = lsr.batch_id
      ORDER BY lsr.synced_at DESC
      LIMIT 100
    `;
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching lab sync records:', error);
    res.status(500).json({ message: 'Server error retrieving lab sync records' });
  }
};

export const createLabSyncRecord = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureQualityRequirementTables();
    const { batchId, labName, sampleCode, payload = {}, status = 'Received' } = req.body;
    if (!labName || !sampleCode) {
      res.status(400).json({ message: 'labName and sampleCode are required' });
      return;
    }
    const rows = await prisma.$queryRaw<Array<any>>`
      INSERT INTO lab_sync_records (batch_id, lab_name, sample_code, payload, status)
      VALUES (${batchId || null}, ${labName}, ${sampleCode}, ${JSON.stringify(payload)}::jsonb, ${status})
      RETURNING *
    `;
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error creating lab sync record:', error);
    res.status(500).json({ message: 'Server error creating lab sync record' });
  }
};

export const getBuyerQualityRequirements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureQualityRequirementTables();
    const rows = await prisma.$queryRaw<Array<any>>`
      SELECT bqr.*, eo.reference_code
      FROM buyer_quality_requirements bqr
      LEFT JOIN export_orders eo ON eo.order_id = bqr.order_id
      ORDER BY bqr.created_at DESC
    `;
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching buyer quality requirements:', error);
    res.status(500).json({ message: 'Server error retrieving buyer quality requirements' });
  }
};

export const createBuyerQualityRequirement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureQualityRequirementTables();
    const { orderId, buyer, grade, minCuppingScore = 80, moistureMin = 10, moistureMax = 12, maxDefects = 10, notes } = req.body;
    if (!buyer || !grade) {
      res.status(400).json({ message: 'buyer and grade are required' });
      return;
    }
    const rows = await prisma.$queryRaw<Array<any>>`
      INSERT INTO buyer_quality_requirements (order_id, buyer, grade, min_cupping_score, moisture_min, moisture_max, max_defects, notes)
      VALUES (${orderId || null}, ${buyer}, ${grade}, ${Number(minCuppingScore)}, ${Number(moistureMin)}, ${Number(moistureMax)}, ${Number(maxDefects)}, ${notes || null})
      RETURNING *
    `;
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error creating buyer quality requirement:', error);
    res.status(500).json({ message: 'Server error creating buyer quality requirement' });
  }
};

export const getQCSamplePreparations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureSamplePreparationStorage();
    const rows = await prisma.$queryRaw<Array<any>>`
      SELECT sp.*,
             eo.reference_code, eo.buyer, eo.customer_email, eo.country, eo.grade,
             cb.qr_code, cb.farm_name, cb.washing_station,
             verifier.full_name AS verified_by_name
      FROM sample_preparations sp
      JOIN export_orders eo ON eo.order_id = sp.order_id
      LEFT JOIN coffee_batches cb ON cb.batch_id = sp.batch_id
      LEFT JOIN users verifier ON verifier.user_id = sp.verified_by
      ORDER BY sp.updated_at DESC
    `;
    res.status(200).json({ success: true, data: rows.map(samplePreparationView) });
  } catch (error) {
    console.error('Error fetching QC sample preparations:', error);
    res.status(500).json({ message: 'Server error retrieving sample preparations' });
  }
};

export const verifyQCSamplePreparation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureSamplePreparationStorage();
    const sampleId = String(req.params.sampleId || '');
    const { qcNotes } = req.body;
    const existing = await prisma.$queryRaw<Array<any>>`
      SELECT sp.*, eo.reference_code
      FROM sample_preparations sp
      JOIN export_orders eo ON eo.order_id = sp.order_id
      WHERE sp.sample_id = ${sampleId}
      LIMIT 1
    `;
    if (!existing.length) {
      res.status(404).json({ message: 'Sample preparation not found.' });
      return;
    }
    const rows = await prisma.$queryRaw<Array<any>>`
      UPDATE sample_preparations
      SET status = 'QC Verified',
          qc_notes = ${qcNotes || null},
          verified_by = ${req.user?.userId || null},
          verified_at = NOW(),
          updated_at = NOW()
      WHERE sample_id = ${sampleId}
      RETURNING *
    `;
    await prisma.exportOrder.update({
      where: { orderId: existing[0].order_id },
      data: { status: 'QC Verified' }
    });
    const logisticsUsers = await prisma.user.findMany({
      where: { role: { roleName: 'LOGISTICS' }, status: 'active' },
      select: { userId: true }
    });
    await Promise.all(logisticsUsers.map(user => createNotification(
      user.userId,
      'Sample Ready for Dispatch',
      `QC verified sample ${existing[0].reference_code || existing[0].order_id.slice(0, 8)}. Pack and dispatch it to the customer.`,
      'success'
    )));
    res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error verifying QC sample:', error);
    res.status(500).json({ message: 'Server error verifying sample' });
  }
};
