import { Request, Response } from 'express';
import CIAReport from '../models/CIAReport';
import CIAReportComment from '../models/CIAReportComment';
import Patient from '../models/Patient';
import Provider from '../models/Provider';
import User from '../models/User';
import ciaDataAggregationService from '../services/ciaDataAggregationService';
import ciaAnalysisService from '../services/ciaAnalysisService';
import { Op } from 'sequelize';

/**
 * POST /api/cia/analyze
 * Generate a new CIA report for the authenticated user or target user (admin/therapist only)
 * Query param: targetUserId (optional) - for admin/therapist to analyze other patients
 */
export const generateCIAReport = async (req: Request, res: Response) => {
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
    const report = await CIAReport.create({
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
      console.log(`[CIA] Starting data aggregation for user ${targetUserId}, report ${report.id}`);
      const aggregatedData = await ciaDataAggregationService.aggregatePatientData(targetUserId);

      // Update report with actual analysis dates
      await report.update({
        analysisStartDate: aggregatedData.analysisStartDate,
        analysisEndDate: aggregatedData.analysisEndDate,
        daysPostSurgery: aggregatedData.daysPostSurgery,
        dataCompleteness: aggregatedData.dataCompleteness,
        metricsAnalyzed: aggregatedData.dataCompleteness.dataCategories,
      });

      console.log(`[CIA] Data aggregation complete. Starting AI analysis...`);

      // Perform AI analysis
      const analysis = await ciaAnalysisService.analyzePatientData(aggregatedData);

      console.log(`[CIA] AI analysis complete. Recovery score: ${analysis.recoveryScore}`);

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

      // Return completed report
      const completedReport = await CIAReport.findByPk(report.id, {
        include: [
          { model: Patient, as: 'patient' },
          {
            model: CIAReportComment,
            as: 'comments',
            include: [{ model: Provider, as: 'provider' }],
          },
        ],
      });

      res.status(201).json({ report: completedReport });
    } catch (analysisError: any) {
      console.error('[CIA] Error during analysis:', analysisError);

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
    console.error('[CIA] Error generating report:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

/**
 * GET /api/cia/reports
 * Get all CIA reports for the authenticated user or target user (admin/therapist only)
 * Query params: limit, includeError, targetUserId (optional - for admin/therapist)
 */
export const getCIAReports = async (req: Request, res: Response) => {
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

    const reports = await CIAReport.findAll({
      where: whereClause,
      include: [
        { model: Patient, as: 'patient' },
        {
          model: CIAReportComment,
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
    console.error('[CIA] Error fetching reports:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

/**
 * GET /api/cia/reports/:reportId
 * Get a specific CIA report by ID
 */
export const getCIAReportById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const reportId = parseInt(req.params.reportId);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const report = await CIAReport.findOne({
      where: { id: reportId, userId },
      include: [
        { model: Patient, as: 'patient' },
        {
          model: CIAReportComment,
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
    console.error('[CIA] Error fetching report:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

/**
 * POST /api/cia/reports/:reportId/comments
 * Add a provider comment to a CIA report
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
    const report = await CIAReport.findByPk(reportId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Find provider record for this user
    const provider = await Provider.findOne({ where: { userId } });
    if (!provider) {
      return res.status(403).json({ error: 'Only providers can comment on reports' });
    }

    // Create comment
    const reportComment = await CIAReportComment.create({
      reportId,
      providerId: provider.id,
      userId,
      comment,
      commentType: commentType || 'feedback',
      isPrivate: isPrivate || false,
    });

    // Return comment with provider info
    const commentWithProvider = await CIAReportComment.findByPk(reportComment.id, {
      include: [{ model: Provider, as: 'provider' }],
    });

    res.status(201).json({ comment: commentWithProvider });
  } catch (error: any) {
    console.error('[CIA] Error adding comment:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

/**
 * GET /api/cia/eligibility
 * Check if user is eligible to generate a new CIA report (30-day rule bypassed for admin/therapist)
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
    console.error('[CIA] Error checking eligibility:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

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
  const lastReport = await CIAReport.findOne({
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
