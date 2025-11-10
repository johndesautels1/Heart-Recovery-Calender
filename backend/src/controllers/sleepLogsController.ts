import { Request, Response } from 'express';
import SleepLog from '../models/SleepLog';
import { Op } from 'sequelize';

export const getSleepLogs = async (req: Request, res: Response) => {
  try {
    // Prioritize query userId (for therapists viewing patients) over authenticated user
    const userId = req.query.userId || req.user?.id;
    const { date, start, end } = req.query;
    const where: any = { userId };

    if (date) {
      where.date = date;
    } else if (start || end) {
      where.date = {};
      if (start) where.date[Op.gte] = start;
      if (end) where.date[Op.lte] = end;
    }

    const sleepLogs = await SleepLog.findAll({
      where,
      order: [['date', 'DESC']]
    });

    res.json({ data: sleepLogs });
  } catch (error) {
    console.error('Error fetching sleep logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addSleepLog = async (req: Request, res: Response) => {
  try {
    // Use userId from body if provided (for therapists adding for patients), otherwise use authenticated user's ID
    const userId = req.body.userId || req.user?.id;
    const { userId: _, ...bodyWithoutUserId } = req.body; // Remove userId from body to avoid duplication

    const sleepLogData = {
      userId,
      ...bodyWithoutUserId
    };

    const sleepLog = await SleepLog.create(sleepLogData);
    res.status(201).json(sleepLog);
  } catch (error: any) {
    console.error('Error adding sleep log:', error);

    // Handle unique constraint violation
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: 'A sleep log already exists for this date'
      });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSleepLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const sleepLog = await SleepLog.findOne({
      where: { id, userId }
    });

    if (!sleepLog) {
      return res.status(404).json({ error: 'Sleep log not found' });
    }

    res.json(sleepLog);
  } catch (error) {
    console.error('Error fetching sleep log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSleepLogByDate = async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const userId = req.user?.id;

    const sleepLog = await SleepLog.findOne({
      where: { date, userId }
    });

    if (!sleepLog) {
      return res.status(404).json({ error: 'Sleep log not found for this date' });
    }

    res.json(sleepLog);
  } catch (error) {
    console.error('Error fetching sleep log by date:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSleepLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const sleepLog = await SleepLog.findOne({
      where: { id, userId }
    });

    if (!sleepLog) {
      return res.status(404).json({ error: 'Sleep log not found' });
    }

    await sleepLog.update(req.body);
    res.json(sleepLog);
  } catch (error) {
    console.error('Error updating sleep log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteSleepLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const sleepLog = await SleepLog.findOne({
      where: { id, userId }
    });

    if (!sleepLog) {
      return res.status(404).json({ error: 'Sleep log not found' });
    }

    await sleepLog.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting sleep log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSleepStats = async (req: Request, res: Response) => {
  try {
    // Prioritize query userId (for therapists viewing patients) over authenticated user
    const userId = (req.query.userId as string) || req.user?.id;
    const { start, end } = req.query;

    const startDate = start
      ? new Date(start as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end as string) : new Date();

    const sleepLogs = await SleepLog.findAll({
      where: {
        userId,
        date: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      }
    });

    const totalLogs = sleepLogs.length;

    if (totalLogs === 0) {
      return res.json({
        totalLogs: 0,
        averageHours: 0,
        qualityDistribution: {
          excellent: 0,
          good: 0,
          fair: 0,
          poor: 0
        },
        trend: 'insufficient_data'
      });
    }

    const totalHours = sleepLogs.reduce((sum, log) => sum + parseFloat(log.hoursSlept.toString()), 0);
    const averageHours = totalHours / totalLogs;

    const qualityDistribution = {
      excellent: sleepLogs.filter(log => log.sleepQuality === 'excellent').length,
      good: sleepLogs.filter(log => log.sleepQuality === 'good').length,
      fair: sleepLogs.filter(log => log.sleepQuality === 'fair').length,
      poor: sleepLogs.filter(log => log.sleepQuality === 'poor').length
    };

    // Calculate trend (comparing recent logs vs older logs)
    // sleepLogs is sorted DESC (newest first), so:
    // - first half = newer logs
    // - second half = older logs
    const midpoint = Math.floor(totalLogs / 2);
    if (midpoint === 0) {
      // Not enough data for trend calculation
      return res.json({
        totalLogs,
        averageHours: Math.round(averageHours * 100) / 100,
        qualityDistribution,
        trend: 'insufficient_data',
        startDate,
        endDate
      });
    }

    const newerLogsAvg = sleepLogs.slice(0, midpoint)
      .reduce((sum, log) => sum + parseFloat(log.hoursSlept.toString()), 0) / midpoint;
    const olderLogsAvg = sleepLogs.slice(midpoint)
      .reduce((sum, log) => sum + parseFloat(log.hoursSlept.toString()), 0) / (totalLogs - midpoint);

    // FIXED: Compare newer vs older (was backwards before)
    const trend = newerLogsAvg > olderLogsAvg + 0.5
      ? 'improving'
      : newerLogsAvg < olderLogsAvg - 0.5
        ? 'declining'
        : 'stable';

    res.json({
      totalLogs,
      averageHours: Math.round(averageHours * 100) / 100,
      qualityDistribution,
      trend,
      startDate,
      endDate
    });
  } catch (error) {
    console.error('Error fetching sleep stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
