import { Request, Response } from 'express';
import HydrationLog from '../models/HydrationLog';
import User from '../models/User';
import Patient from '../models/Patient';
import { Op } from 'sequelize';
import { calculateDailyWaterIntake } from '../services/hydrationCalculationService';

// GET /api/hydration-logs - Get all hydration logs with filters
export const getHydrationLogs = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { startDate, endDate, date, userId: queryUserId } = req.query;

    const where: any = {};

    // If patient role, only show their own logs
    if (userRole === 'patient') {
      where.userId = userId;
    } else if (queryUserId) {
      // Therapists can query specific patient's logs
      where.userId = queryUserId;
    }

    // Date filtering
    if (date) {
      where.date = date;
    } else if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date[Op.gte] = startDate;
      }
      if (endDate) {
        where.date[Op.lte] = endDate;
      }
    }

    const logs = await HydrationLog.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['date', 'DESC']],
    });

    res.json({ data: logs });
  } catch (error) {
    console.error('Error fetching hydration logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/hydration-logs/:id - Get specific hydration log
export const getHydrationLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const log = await HydrationLog.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    if (!log) {
      return res.status(404).json({ error: 'Hydration log not found' });
    }

    // Authorization: patients can only view their own logs
    if (userRole === 'patient' && log.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(log);
  } catch (error) {
    console.error('Error fetching hydration log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/hydration-logs/date/:date - Get hydration log for specific date
export const getHydrationLogByDate = async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { userId: queryUserId } = req.query;

    const where: any = { date };

    // Determine which user's log to fetch
    if (userRole === 'patient') {
      where.userId = userId;
    } else if (queryUserId) {
      where.userId = queryUserId;
    } else {
      return res.status(400).json({ error: 'userId query parameter required for therapists' });
    }

    const log = await HydrationLog.findOne({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    if (!log) {
      return res.status(404).json({ error: 'No hydration log found for this date' });
    }

    res.json(log);
  } catch (error) {
    console.error('Error fetching hydration log by date:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/hydration-logs - Create new hydration log
export const createHydrationLog = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    console.log('[HYDRATION-LOGS] Creating hydration log for user:', userId);
    console.log('[HYDRATION-LOGS] Request body:', JSON.stringify(req.body, null, 2));

    // Patients can only create logs for themselves
    if (userRole === 'patient' && req.body.userId && req.body.userId !== userId) {
      return res.status(403).json({ error: 'Patients can only log their own hydration' });
    }

    // If no userId provided in body, use authenticated user's ID
    const logData = {
      ...req.body,
      userId: req.body.userId || userId,
    };

    // Validate required fields
    if (!logData.userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    if (!logData.date) {
      return res.status(400).json({ error: 'date is required' });
    }
    if (logData.totalOunces === undefined || logData.totalOunces === null) {
      return res.status(400).json({ error: 'totalOunces is required' });
    }

    // Auto-calculate targetOunces if not provided using clinical formula
    if (!logData.targetOunces) {
      // Try to get patient data for calculation
      const patient = await Patient.findOne({ where: { userId: logData.userId } });
      if (patient && patient.currentWeight && patient.age) {
        const hydrationCalc = calculateDailyWaterIntake({
          weight: patient.currentWeight,
          age: patient.age,
          height: patient.height,
          gender: patient.gender,
          // Could add activity level from daily data if available
          // hasHeartFailure: check if patient has heart failure diagnosis
          // onDiuretics: check if patient is on diuretic medications
        });

        logData.targetOunces = hydrationCalc.targetOunces;
        console.log(`[HYDRATION-LOGS] Auto-calculated targetOunces: ${logData.targetOunces} oz using clinical formula`);
        console.log(`[HYDRATION-LOGS] Range: ${hydrationCalc.minOunces}-${hydrationCalc.maxOunces} oz`);
        console.log(`[HYDRATION-LOGS] Patient: weight=${patient.currentWeight}lbs, age=${patient.age}, gender=${patient.gender || 'unknown'}`);

        if (hydrationCalc.warning) {
          console.log(`[HYDRATION-LOGS] WARNING: ${hydrationCalc.warning}`);
        }
      }
    }

    // Check if log already exists for this date (upsert behavior)
    const existing = await HydrationLog.findOne({
      where: {
        userId: logData.userId,
        date: logData.date,
      },
    });

    let log;
    if (existing) {
      console.log('[HYDRATION-LOGS] Updating existing log for date:', logData.date);
      await existing.update(logData);
      log = existing;
    } else {
      console.log('[HYDRATION-LOGS] Creating new log');
      log = await HydrationLog.create(logData);
    }

    console.log('[HYDRATION-LOGS] Hydration log created/updated successfully:', log.id);
    console.log('[HYDRATION-LOGS] postSurgeryDay:', log.postSurgeryDay);

    // Load full log with associations
    const fullLog = await HydrationLog.findByPk(log.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    res.status(existing ? 200 : 201).json(fullLog);
  } catch (error: any) {
    console.error('[HYDRATION-LOGS] Error creating hydration log:', error);
    console.error('[HYDRATION-LOGS] Error details:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// PUT /api/hydration-logs/:id - Update hydration log
export const updateHydrationLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const log = await HydrationLog.findByPk(id);

    if (!log) {
      return res.status(404).json({ error: 'Hydration log not found' });
    }

    // Authorization: patients can only update their own logs
    if (userRole === 'patient' && log.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Don't allow changing userId or postSurgeryDay (auto-calculated)
    const updateData = { ...req.body };
    delete updateData.userId;
    delete updateData.postSurgeryDay;

    await log.update(updateData);

    // Reload with associations
    const updatedLog = await HydrationLog.findByPk(log.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    res.json(updatedLog);
  } catch (error) {
    console.error('Error updating hydration log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/hydration-logs/:id - Delete hydration log
export const deleteHydrationLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const log = await HydrationLog.findByPk(id);

    if (!log) {
      return res.status(404).json({ error: 'Hydration log not found' });
    }

    // Authorization: patients can only delete their own logs
    if (userRole === 'patient' && log.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await log.destroy();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting hydration log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/hydration-logs/stats - Get hydration statistics
export const getHydrationStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { userId: queryUserId, startDate, endDate } = req.query;

    const where: any = {};

    // Determine which user's stats to fetch
    if (userRole === 'patient') {
      where.userId = userId;
    } else if (queryUserId) {
      where.userId = queryUserId;
    } else {
      return res.status(400).json({ error: 'userId query parameter required for therapists' });
    }

    // Date range filtering
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date[Op.gte] = startDate;
      }
      if (endDate) {
        where.date[Op.lte] = endDate;
      }
    }

    // Total logs
    const totalLogs = await HydrationLog.count({ where });

    // Average daily intake
    const avgIntakeResult = await HydrationLog.findOne({
      where,
      attributes: [[HydrationLog.sequelize!.fn('AVG', HydrationLog.sequelize!.col('totalOunces')), 'avgIntake']],
      raw: true,
    });
    const avgDailyIntake = avgIntakeResult ? parseFloat((avgIntakeResult as any).avgIntake || '0') : 0;

    // Average target
    const avgTargetResult = await HydrationLog.findOne({
      where,
      attributes: [[HydrationLog.sequelize!.fn('AVG', HydrationLog.sequelize!.col('targetOunces')), 'avgTarget']],
      raw: true,
    });
    const avgDailyTarget = avgTargetResult ? parseFloat((avgTargetResult as any).avgTarget || '0') : 0;

    // Days meeting target
    const logsWithTarget = await HydrationLog.findAll({
      where: {
        ...where,
        totalOunces: { [Op.gte]: HydrationLog.sequelize!.col('targetOunces') },
      },
      attributes: ['id'],
    });
    const daysMetTarget = logsWithTarget.length;
    const complianceRate = totalLogs > 0 ? Math.round((daysMetTarget / totalLogs) * 100) : 0;

    // Total ounces consumed
    const totalOuncesResult = await HydrationLog.findOne({
      where,
      attributes: [[HydrationLog.sequelize!.fn('SUM', HydrationLog.sequelize!.col('totalOunces')), 'totalOunces']],
      raw: true,
    });
    const totalOunces = totalOuncesResult ? parseFloat((totalOuncesResult as any).totalOunces || '0') : 0;

    res.json({
      totalLogs,
      avgDailyIntake: Math.round(avgDailyIntake * 10) / 10,
      avgDailyTarget: Math.round(avgDailyTarget * 10) / 10,
      daysMetTarget,
      complianceRate,
      totalOunces: Math.round(totalOunces * 10) / 10,
    });
  } catch (error) {
    console.error('Error fetching hydration stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
