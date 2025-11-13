import { Request, Response } from 'express';
import CAIReport from '../models/CAIReport';
import CAIReportComment from '../models/CAIReportComment';
import Patient from '../models/Patient';
import Provider from '../models/Provider';
import User from '../models/User';
import Alert from '../models/Alert';
import CAIDataAggregationService from '../services/CAIDataAggregationService';
import CAIAnalysisService from '../services/CAIAnalysisService';
import { sendSMS, sendEmail } from '../services/notificationService';
import { Op } from 'sequelize';

/**
 * POST /api/CAI/analyze
 * Generate a new CAI report for the authenticated user or target user (admin/therapist only)
 * Query param: targetUserId (optional) - for admin/therapist to analyze other patients
 */
export const generateCAIReport = async (req: Request, res: Response) => {
  try {
    const requestingUserId = req.user?.id;

    if (!requestingUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get requesting user
    const requestingUser = await User.findByPk(requestingUserId);
    if (!requestingUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Determine target user (self or another patient if admin/therapist)
    const targetUserId = req.query.targetUserId
      ? parseInt(req.query.targetUserId as string)
      : requestingUserId;

    // Check if requesting to analyze another user
    if (targetUserId !== requestingUserId) {
      // Only admin/therapist can analyze other users
      if (requestingUser.role !== 'admin' && requestingUser.role !== 'therapist') {
        return res.status(403).json({ error: 'Only admin/therapist can generate reports for other users' });
      }
    }

    // Check eligibility (30-day rule) - bypassed for admin/therapist
    const isAdminOrTherapist = requestingUser.role === 'admin' || requestingUser.role === 'therapist';
    if (!isAdminOrTherapist) {
      const eligibility = await checkEligibility(targetUserId);
      if (!eligibility.eligible) {
        return res.status(400).json({
          error: 'Not eligible for report generation',
          reason: eligibility.reason,
          nextEligibleDate: eligibility.nextEligibleDate,
        });
      }
    }

    // Get patient profile
    const patient = await Patient.findOne({ where: { userId: targetUserId } });
    const patientId = patient?.id || null;

    // Create report record with 'generating' status
    const report = await CAIReport.create({
      userId: targetUserId,
      patientId,
      surgeryDate: patient?.surgeryDate || null,
      analysisStartDate: new Date(), // Will be updated after aggregation
      analysisEndDate: new Date(),
      status: 'generating',
      aiModel: 'claude-sonnet-4-20250514',
      aiPromptVersion: 'v1.0',
    });

    // Aggregate patient data (async operation)
    try {
      console.log(`[CAI] Starting data aggregation for user ${targetUserId}, report ${report.id}`);
      const aggregatedData = await CAIDataAggregationService.aggregatePatientData(targetUserId);

      // Update report with actual analysis dates
      await report.update({
        analysisStartDate: aggregatedData.analysisStartDate,
        analysisEndDate: aggregatedData.analysisEndDate,
        daysPostSurgery: aggregatedData.daysPostSurgery,
        dataCompleteness: aggregatedData.dataCompleteness,
        metricsAnalyzed: aggregatedData.dataCompleteness.dataCategories,
      });

      console.log(`[CAI] Data aggregation complete. Starting AI analysis...`);

      // Perform AI analysis
      const analysis = await CAIAnalysisService.analyzePatientData(aggregatedData);

      console.log(`[CAI] AI analysis complete. Recovery score: ${analysis.recoveryScore}`);

      // Update report with analysis results
      await report.update({
        recoveryScore: analysis.recoveryScore,
        summary: analysis.summary,
        riskAssessment: analysis.riskAssessment,
        unusualFindings: analysis.unusualFindings,
        actionPlan: analysis.actionPlan,
        reportData: analysis.detailedAnalysis,
        status: 'completed',
      });

      // 🚨 AUTO-ALERT CREATION: Create alerts from CAI risk findings
      console.log(`[CAI] Processing risk assessment for auto-alerts...`);
      await createAlertsFromRiskAssessment(targetUserId, analysis, report.id);
      console.log(`[CAI] Auto-alerts processed successfully`);

      // Return completed report
      const completedReport = await CAIReport.findByPk(report.id, {
        include: [
          { model: Patient, as: 'patient' },
          {
            model: CAIReportComment,
            as: 'comments',
            include: [{ model: Provider, as: 'provider' }],
          },
        ],
      });

      res.status(201).json({ report: completedReport });
    } catch (analysisError: any) {
      console.error('[CAI] Error during analysis:', analysisError);

      // Mark report as error
      await report.update({
        status: 'error',
        errorMessage: analysisError.message || 'Analysis failed',
      });

      res.status(500).json({
        error: 'Report generation failed',
        message: analysisError.message,
        reportId: report.id,
      });
    }
  } catch (error: any) {
    console.error('[CAI] Error generating report:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

/**
 * GET /api/CAI/reports
 * Get all CAI reports for the authenticated user or target user (admin/therapist only)
 * Query params: limit, includeError, targetUserId (optional - for admin/therapist)
 */
export const getCAIReports = async (req: Request, res: Response) => {
  try {
    const requestingUserId = req.user?.id;

    if (!requestingUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get requesting user
    const requestingUser = await User.findByPk(requestingUserId);
    if (!requestingUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Determine target user (self or another patient if admin/therapist)
    const targetUserId = req.query.targetUserId
      ? parseInt(req.query.targetUserId as string)
      : requestingUserId;

    // Check if requesting reports for another user
    if (targetUserId !== requestingUserId) {
      // Only admin/therapist can view other users' reports
      if (requestingUser.role !== 'admin' && requestingUser.role !== 'therapist') {
        return res.status(403).json({ error: 'Only admin/therapist can view reports for other users' });
      }
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const includeError = req.query.includeError === 'true';

    const whereClause: any = { userId: targetUserId };
    if (!includeError) {
      whereClause.status = { [Op.ne]: 'error' };
    }

    const reports = await CAIReport.findAll({
      where: whereClause,
      include: [
        { model: Patient, as: 'patient' },
        {
          model: CAIReportComment,
          as: 'comments',
          where: { isPrivate: false },
          required: false,
          include: [{ model: Provider, as: 'provider' }],
        },
      ],
      order: [['generatedAt', 'DESC']],
      limit,
    });

    res.json({ reports });
  } catch (error: any) {
    console.error('[CAI] Error fetching reports:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

/**
 * GET /api/CAI/reports/:reportId
 * Get a specific CAI report by ID
 */
export const getCAIReportById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const reportId = parseInt(req.params.reportId);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const report = await CAIReport.findOne({
      where: { id: reportId, userId },
      include: [
        { model: Patient, as: 'patient' },
        {
          model: CAIReportComment,
          as: 'comments',
          where: { isPrivate: false },
          required: false,
          include: [{ model: Provider, as: 'provider' }],
        },
      ],
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ report });
  } catch (error: any) {
    console.error('[CAI] Error fetching report:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

/**
 * POST /api/CAI/reports/:reportId/comments
 * Add a provider comment to a CAI report
 */
export const addReportComment = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const reportId = parseInt(req.params.reportId);
    const { comment, commentType, isPrivate } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify the report exists
    const report = await CAIReport.findByPk(reportId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Find provider record for this user
    const provider = await Provider.findOne({ where: { userId } });
    if (!provider) {
      return res.status(403).json({ error: 'Only providers can comment on reports' });
    }

    // Create comment
    const reportComment = await CAIReportComment.create({
      reportId,
      providerId: provider.id,
      userId,
      comment,
      commentType: commentType || 'feedback',
      isPrivate: isPrivate || false,
    });

    // Return comment with provider info
    const commentWithProvider = await CAIReportComment.findByPk(reportComment.id, {
      include: [{ model: Provider, as: 'provider' }],
    });

    res.status(201).json({ comment: commentWithProvider });
  } catch (error: any) {
    console.error('[CAI] Error adding comment:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

/**
 * DELETE /api/CAI/reports/:reportId
 * Delete a specific CAI report
 */
export const deleteCAIReport = async (req: Request, res: Response) => {
  try {
    const requestingUserId = req.user?.id;
    const reportId = parseInt(req.params.reportId);

    if (!requestingUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get requesting user
    const requestingUser = await User.findByPk(requestingUserId);
    if (!requestingUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Find the report
    const report = await CAIReport.findByPk(reportId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Check permissions
    const isAdminOrTherapist = requestingUser.role === 'admin' || requestingUser.role === 'therapist';
    const isOwner = report.userId === requestingUserId;

    if (!isOwner && !isAdminOrTherapist) {
      return res.status(403).json({ error: 'You do not have permission to delete this report' });
    }

    // Delete the report (cascade will delete comments)
    await report.destroy();

    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (error: any) {
    console.error('[CAI] Error deleting report:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

/**
 * GET /api/CAI/eligibility
 * Check if user is eligible to generate a new CAI report (30-day rule bypassed for admin/therapist)
 * Query param: targetUserId (optional) - for admin/therapist to check other patients
 */
export const checkReportEligibility = async (req: Request, res: Response) => {
  try {
    const requestingUserId = req.user?.id;

    if (!requestingUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get requesting user
    const requestingUser = await User.findByPk(requestingUserId);
    if (!requestingUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Determine target user (self or another patient if admin/therapist)
    const targetUserId = req.query.targetUserId
      ? parseInt(req.query.targetUserId as string)
      : requestingUserId;

    // Check if checking eligibility for another user
    if (targetUserId !== requestingUserId) {
      // Only admin/therapist can check other users' eligibility
      if (requestingUser.role !== 'admin' && requestingUser.role !== 'therapist') {
        return res.status(403).json({ error: 'Only admin/therapist can check eligibility for other users' });
      }
    }

    // Admin/therapist always eligible (no 30-day rule)
    const isAdminOrTherapist = requestingUser.role === 'admin' || requestingUser.role === 'therapist';
    if (isAdminOrTherapist) {
      res.json({
        eligible: true,
        reason: 'Admin/Therapist - unlimited report generation',
        isUnlimited: true,
      });
      return;
    }

    // Check standard eligibility for patients
    const eligibility = await checkEligibility(targetUserId);

    res.json(eligibility);
  } catch (error: any) {
    console.error('[CAI] Error checking eligibility:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

/**
 * Helper function to create alerts from CAI risk assessment
 * Parses risk findings and creates Alert records with notifications
 */
async function createAlertsFromRiskAssessment(
  userId: number,
  analysis: any,
  reportId: number
): Promise<void> {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      console.warn(`[CAI Auto-Alert] User ${userId} not found, skipping alerts`);
      return;
    }

    // Parse risk assessment (expected format: JSON string or object with risk items)
    let riskItems: any[] = [];
    if (typeof analysis.riskAssessment === 'string') {
      try {
        const parsed = JSON.parse(analysis.riskAssessment);
        riskItems = Array.isArray(parsed) ? parsed : parsed.risks || [];
      } catch {
        // If not JSON, try to extract risks from text
        riskItems = parseRiskAssessmentText(analysis.riskAssessment);
      }
    } else if (Array.isArray(analysis.riskAssessment)) {
      riskItems = analysis.riskAssessment;
    } else if (analysis.riskAssessment?.risks) {
      riskItems = analysis.riskAssessment.risks;
    }

    // Also check unusual findings for critical items
    if (analysis.unusualFindings) {
      const unusualItems = parseUnusualFindings(analysis.unusualFindings);
      riskItems = [...riskItems, ...unusualItems];
    }

    console.log(`[CAI Auto-Alert] Found ${riskItems.length} risk items to process`);

    let alertsCreated = 0;
    let notificationsSent = 0;

    for (const risk of riskItems) {
      const severity = mapSeverityToAlertLevel(risk.severity || risk.level || 'info');

      // Only create alerts for warning and critical severity
      if (severity !== 'warning' && severity !== 'critical') {
        continue;
      }

      const alertType = mapCategoryToAlertType(risk.category || risk.type || 'other');
      const title = risk.title || risk.finding || `CAI Report Risk: ${risk.category || 'General'}`;
      const message = risk.description || risk.message || risk.recommendation || 'Please review your CAI report for details.';

      // Create alert
      const alert = await Alert.create({
        userId,
        alertType,
        severity,
        title,
        message,
        relatedEntityType: 'CAI_report',
        relatedEntityId: reportId,
        resolved: false,
        notificationSent: false,
      });

      alertsCreated++;
      console.log(`[CAI Auto-Alert] Created ${severity} alert: ${title}`);

      // Send notifications for critical alerts
      if (severity === 'critical') {
        try {
          const notificationMethods: string[] = [];

          // SMS notification
          if (user.phoneNumber) {
            const smsText = `🚨 CRITICAL HEART HEALTH ALERT: ${title}. ${message.substring(0, 120)}... Log in to view full details. - Heart Recovery Calendar`;
            const smsSent = await sendSMS(user.phoneNumber, smsText);
            if (smsSent) {
              notificationMethods.push('sms');
              notificationsSent++;
            }
          }

          // Email notification
          const emailSubject = `🚨 Critical Health Alert from CAI Report`;
          const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .alert-box { border-left: 5px solid #ef4444; background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .alert-header { font-size: 24px; font-weight: bold; color: #dc2626; margin-bottom: 10px; }
    .alert-body { font-size: 16px; color: #991b1b; }
    .cta-button { display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 15px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee; font-size: 12px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="alert-box">
      <div class="alert-header">🚨 Critical Health Alert</div>
      <div class="alert-body">
        <p><strong>${title}</strong></p>
        <p>${message}</p>
      </div>
    </div>
    <p>Your latest CAI (Cardiac Intelligence Analysis) report has identified a critical health concern that requires immediate attention.</p>
    <center>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/CAI" class="cta-button">View Full CAI Report →</a>
    </center>
    <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 3px solid #f59e0b;">
      <strong>⚠️ Important:</strong> If you experience chest pain, severe shortness of breath, or other emergency symptoms, call 911 immediately. This alert is for informational purposes and does not replace emergency medical care.
    </div>
    <div class="footer">
      <p><strong>Heart Recovery Calendar - CAI Report Alert</strong></p>
      <p>You received this alert because your latest CAI report identified a critical health concern.</p>
    </div>
  </div>
</body>
</html>`;

          const emailSent = await sendEmail(user.email, emailSubject, emailHtml);
          if (emailSent) {
            notificationMethods.push('email');
            notificationsSent++;
          }

          // Update alert with notification status
          if (notificationMethods.length > 0) {
            await alert.update({
              notificationSent: true,
              notificationMethods,
            });
          }
        } catch (notifError: any) {
          console.error(`[CAI Auto-Alert] Error sending notifications for alert ${alert.id}:`, notifError.message);
        }
      }
    }

    console.log(`[CAI Auto-Alert] Summary: Created ${alertsCreated} alerts, sent ${notificationsSent} notifications`);
  } catch (error: any) {
    console.error('[CAI Auto-Alert] Error creating alerts:', error.message);
    // Don't throw - alert creation failure shouldn't block report generation
  }
}

/**
 * Parse risk assessment text to extract risk items
 */
function parseRiskAssessmentText(text: string): any[] {
  const risks: any[] = [];

  // Look for common patterns indicating severity
  const criticalPatterns = /\b(critical|severe|dangerous|emergency|immediate|urgent)\b/gi;
  const warningPatterns = /\b(warning|concern|elevated|high|moderate)\b/gi;

  // Split by common delimiters
  const lines = text.split(/\n|\.(?=\s[A-Z])/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 10) continue; // Skip very short lines

    let severity = 'info';
    if (criticalPatterns.test(trimmed)) {
      severity = 'critical';
    } else if (warningPatterns.test(trimmed)) {
      severity = 'warning';
    }

    // Only include warning and critical items
    if (severity === 'warning' || severity === 'critical') {
      risks.push({
        severity,
        category: detectCategory(trimmed),
        title: trimmed.substring(0, 100),
        description: trimmed,
      });
    }
  }

  return risks;
}

/**
 * Parse unusual findings for critical items
 */
function parseUnusualFindings(findings: string): any[] {
  if (!findings) return [];

  const risks: any[] = [];
  const lines = findings.split(/\n|\.(?=\s[A-Z])/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 10) continue;

    // Unusual findings are typically concerning
    risks.push({
      severity: 'warning',
      category: detectCategory(trimmed),
      title: `Unusual Finding: ${trimmed.substring(0, 80)}`,
      description: trimmed,
    });
  }

  return risks;
}

/**
 * Detect category from text
 */
function detectCategory(text: string): string {
  const lower = text.toLowerCase();

  if (/\b(heart rate|hr|pulse|rhythm|arrhythmia|afib|bradycardia|tachycardia)\b/.test(lower)) return 'vitals';
  if (/\b(blood pressure|bp|hypertension|systolic|diastolic)\b/.test(lower)) return 'vitals';
  if (/\b(medication|drug|prescription|dose)\b/.test(lower)) return 'medication';
  if (/\b(exercise|activity|physical|walking|steps)\b/.test(lower)) return 'exercise';
  if (/\b(weight|edema|fluid|retention|swelling)\b/.test(lower)) return 'vitals';
  if (/\b(meal|food|nutrition|diet|sodium|cholesterol)\b/.test(lower)) return 'nutrition';

  return 'other';
}

/**
 * Map severity text to Alert severity enum
 */
function mapSeverityToAlertLevel(severity: string): 'info' | 'warning' | 'critical' {
  const lower = severity.toLowerCase();

  if (/\b(critical|severe|emergency|danger)\b/.test(lower)) return 'critical';
  if (/\b(warning|high|elevated|concern|moderate)\b/.test(lower)) return 'warning';

  return 'info';
}

/**
 * Map category to Alert alertType enum
 */
function mapCategoryToAlertType(category: string): 'medication_missed' | 'activity_issue' | 'vital_concern' | 'goal_overdue' | 'routine_skipped' | 'other' {
  const lower = category.toLowerCase();

  if (/\b(vital|heart|blood|pressure|hr|bp|weight|oxygen)\b/.test(lower)) return 'vital_concern';
  if (/\b(medication|drug|prescription)\b/.test(lower)) return 'medication_missed';
  if (/\b(exercise|activity|physical)\b/.test(lower)) return 'activity_issue';
  if (/\b(goal|milestone|target)\b/.test(lower)) return 'goal_overdue';
  if (/\b(routine|habit|schedule)\b/.test(lower)) return 'routine_skipped';

  return 'other';
}

/**
 * Helper function to check report generation eligibility
 */
async function checkEligibility(userId: number): Promise<{
  eligible: boolean;
  reason?: string;
  nextEligibleDate?: Date;
  daysSinceSurgery?: number;
  lastReportDate?: Date;
}> {
  // Get patient profile to check surgery date
  const patient = await Patient.findOne({ where: { userId } });

  if (!patient || !patient.surgeryDate) {
    return {
      eligible: true,
      reason: 'No surgery date set - can generate exploratory report',
    };
  }

  const surgeryDate = new Date(patient.surgeryDate);
  const now = new Date();
  const daysSinceSurgery = Math.floor((now.getTime() - surgeryDate.getTime()) / (1000 * 60 * 60 * 24));

  // Rule: Cannot generate report until 30 days post-surgery
  if (daysSinceSurgery < 30) {
    const eligibleDate = new Date(surgeryDate);
    eligibleDate.setDate(eligibleDate.getDate() + 30);

    return {
      eligible: false,
      reason: 'Must wait at least 30 days post-surgery for first report',
      nextEligibleDate: eligibleDate,
      daysSinceSurgery,
    };
  }

  // Check for most recent completed report
  const lastReport = await CAIReport.findOne({
    where: {
      userId,
      status: 'completed',
    },
    order: [['generatedAt', 'DESC']],
  });

  if (!lastReport) {
    // No previous reports - eligible
    return {
      eligible: true,
      daysSinceSurgery,
    };
  }

  // Rule: Cannot generate new report within 30 days of last report
  const lastReportDate = new Date(lastReport.generatedAt);
  const daysSinceLastReport = Math.floor((now.getTime() - lastReportDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceLastReport < 30) {
    const nextEligibleDate = new Date(lastReportDate);
    nextEligibleDate.setDate(nextEligibleDate.getDate() + 30);

    return {
      eligible: false,
      reason: 'Must wait at least 30 days between reports',
      nextEligibleDate,
      daysSinceSurgery,
      lastReportDate,
    };
  }

  // Eligible!
  return {
    eligible: true,
    daysSinceSurgery,
    lastReportDate,
  };
}
