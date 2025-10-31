import { Request, Response } from 'express';
import ExerciseLog from '../models/ExerciseLog';
import Exercise from '../models/Exercise';
import User from '../models/User';
import VitalsSample from '../models/VitalsSample';
import { Op } from 'sequelize';

// GET /api/exercise-logs - Get all exercise logs with filters
export const getExerciseLogs = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { exerciseId, prescriptionId, startDate, endDate, userId: queryUserId } = req.query;

    const where: any = {};

    // If patient role, only show their own logs
    if (userRole === 'patient') {
      where.patientId = userId;
    } else if (queryUserId) {
      // Therapists can query specific patient's logs
      where.patientId = queryUserId;
    }

    if (exerciseId) {
      where.exerciseId = exerciseId;
    }

    if (prescriptionId) {
      where.prescriptionId = prescriptionId;
    }

    // Date range filtering
    if (startDate || endDate) {
      where.completedAt = {};
      if (startDate) {
        where.completedAt[Op.gte] = new Date(startDate as string);
      }
      if (endDate) {
        where.completedAt[Op.lte] = new Date(endDate as string);
      }
    }

    const logs = await ExerciseLog.findAll({
      where,
      include: [
        {
          model: Exercise,
          as: 'exercise',
          attributes: ['id', 'name', 'category', 'difficulty'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['completedAt', 'DESC']],
    });

    res.json({ data: logs });
  } catch (error) {
    console.error('Error fetching exercise logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/exercise-logs/:id - Get specific exercise log
export const getExerciseLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const log = await ExerciseLog.findByPk(id, {
      include: [
        {
          model: Exercise,
          as: 'exercise',
        },
        {
          model: User,
          as: 'user',
        },
      ],
    });

    if (!log) {
      return res.status(404).json({ error: 'Exercise log not found' });
    }

    // Authorization: patients can only view their own logs
    if (userRole === 'patient' && log.patientId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(log);
  } catch (error) {
    console.error('Error fetching exercise log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/exercise-logs - Create new exercise log
export const createExerciseLog = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    console.log('[EXERCISE-LOGS] Creating exercise log for user:', userId);
    console.log('[EXERCISE-LOGS] Request body:', JSON.stringify(req.body, null, 2));

    // Patients can only create logs for themselves
    if (userRole === 'patient' && req.body.userId && req.body.userId !== userId) {
      return res.status(403).json({ error: 'Patients can only log their own exercises' });
    }

    // If no userId provided in body, use authenticated user's ID
    const logData = {
      ...req.body,
      userId: req.body.userId || userId,
      completedAt: req.body.completedAt || new Date(),
    };

    // Validate required fields
    if (!logData.userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    console.log('[EXERCISE-LOGS] Creating log with data:', JSON.stringify(logData, null, 2));

    const log = await ExerciseLog.create(logData);

    console.log('[EXERCISE-LOGS] Exercise log created successfully:', log.id);
    console.log('[EXERCISE-LOGS] postSurgeryDay:', log.postSurgeryDay);

    // Save vitals snapshots to VitalsSample records
    if (req.body.vitalSnapshots && Array.isArray(req.body.vitalSnapshots) && req.body.vitalSnapshots.length > 0) {
      console.log('[EXERCISE-LOGS] Saving', req.body.vitalSnapshots.length, 'vitals snapshots');

      for (const snap of req.body.vitalSnapshots) {
        try {
          await VitalsSample.create({
            userId: logData.userId,
            timestamp: new Date(snap.timestamp),
            bloodPressureSystolic: snap.bpSystolic,
            bloodPressureDiastolic: snap.bpDiastolic,
            heartRate: snap.pulse,
            respiratoryRate: snap.respiration,
            source: 'manual',
            notes: `During exercise: ${req.body.exerciseName || req.body.notes || 'Exercise session'}`,
            medicationsTaken: false,
          });
          console.log('[EXERCISE-LOGS] Saved vitals snapshot at', snap.timestamp);
        } catch (vitalError: any) {
          console.error('[EXERCISE-LOGS] Error saving vitals snapshot:', vitalError);
          // Don't fail the whole request if vitals saving fails
        }
      }
    }

    // Load full log with associations
    const fullLog = await ExerciseLog.findByPk(log.id, {
      include: [
        {
          model: Exercise,
          as: 'exercise',
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    res.status(201).json(fullLog);
  } catch (error: any) {
    console.error('[EXERCISE-LOGS] Error creating exercise log:', error);
    console.error('[EXERCISE-LOGS] Error details:', error.message);
    console.error('[EXERCISE-LOGS] Stack trace:', error.stack);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// PUT /api/exercise-logs/:id - Update exercise log
export const updateExerciseLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const log = await ExerciseLog.findByPk(id);

    if (!log) {
      return res.status(404).json({ error: 'Exercise log not found' });
    }

    // Authorization: patients can only update their own logs
    if (userRole === 'patient' && log.patientId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Don't allow changing userId or postSurgeryDay (auto-calculated)
    const updateData = { ...req.body };
    delete updateData.userId;
    delete updateData.postSurgeryDay;

    await log.update(updateData);

    // Reload with associations
    const updatedLog = await ExerciseLog.findByPk(log.id, {
      include: [
        {
          model: Exercise,
          as: 'exercise',
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    res.json(updatedLog);
  } catch (error) {
    console.error('Error updating exercise log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/exercise-logs/:id - Delete exercise log
export const deleteExerciseLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const log = await ExerciseLog.findByPk(id);

    if (!log) {
      return res.status(404).json({ error: 'Exercise log not found' });
    }

    // Authorization: patients can only delete their own logs, therapists can delete any
    if (userRole === 'patient' && log.patientId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await log.destroy();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting exercise log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/exercise-logs/stats - Get exercise log statistics
export const getExerciseLogStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { userId: queryUserId, startDate, endDate } = req.query;

    const where: any = {};

    // Determine which user's stats to fetch
    if (userRole === 'patient') {
      where.patientId = userId;
    } else if (queryUserId) {
      where.patientId = queryUserId;
    } else {
      return res.status(400).json({ error: 'userId query parameter required for therapists' });
    }

    // Date range filtering
    if (startDate || endDate) {
      where.completedAt = {};
      if (startDate) {
        where.completedAt[Op.gte] = new Date(startDate as string);
      }
      if (endDate) {
        where.completedAt[Op.lte] = new Date(endDate as string);
      }
    }

    // Total logs
    const totalLogs = await ExerciseLog.count({ where });

    // Average performance score
    const avgScoreResult = await ExerciseLog.findOne({
      where,
      attributes: [
        [ExerciseLog.sequelize!.fn('AVG', ExerciseLog.sequelize!.col('performanceScore')), 'avgScore'],
      ],
      raw: true,
    });
    const avgPerformanceScore = avgScoreResult ? parseFloat((avgScoreResult as any).avgScore || '0') : 0;

    // Average duration
    const avgDurationResult = await ExerciseLog.findOne({
      where,
      attributes: [
        [ExerciseLog.sequelize!.fn('AVG', ExerciseLog.sequelize!.col('durationMinutes')), 'avgDuration'],
      ],
      raw: true,
    });
    const avgDuration = avgDurationResult ? parseFloat((avgDurationResult as any).avgDuration || '0') : 0;

    // Total distance
    const totalDistanceResult = await ExerciseLog.findOne({
      where,
      attributes: [
        [ExerciseLog.sequelize!.fn('SUM', ExerciseLog.sequelize!.col('distanceMiles')), 'totalDistance'],
      ],
      raw: true,
    });
    const totalDistance = totalDistanceResult ? parseFloat((totalDistanceResult as any).totalDistance || '0') : 0;

    // Total calories
    const totalCaloriesResult = await ExerciseLog.findOne({
      where,
      attributes: [
        [ExerciseLog.sequelize!.fn('SUM', ExerciseLog.sequelize!.col('caloriesBurned')), 'totalCalories'],
      ],
      raw: true,
    });
    const totalCalories = totalCaloriesResult ? parseInt((totalCaloriesResult as any).totalCalories || '0') : 0;

    // Logs by exercise type
    const byExerciseType = await ExerciseLog.findAll({
      where,
      attributes: [
        'exerciseId',
        [ExerciseLog.sequelize!.fn('COUNT', ExerciseLog.sequelize!.col('ExerciseLog.id')), 'count'],
      ],
      include: [
        {
          model: Exercise,
          as: 'exercise',
          attributes: ['name', 'category'],
        },
      ],
      group: ['exerciseId', 'exercise.id', 'exercise.name', 'exercise.category'],
    });

    // Performance score distribution
    const scoreDistribution = await ExerciseLog.findAll({
      where,
      attributes: [
        'performanceScore',
        [ExerciseLog.sequelize!.fn('COUNT', ExerciseLog.sequelize!.col('id')), 'count'],
      ],
      group: ['performanceScore'],
      order: [['performanceScore', 'ASC']],
    });

    res.json({
      totalLogs,
      avgPerformanceScore: Math.round(avgPerformanceScore * 100) / 100,
      avgDuration: Math.round(avgDuration * 10) / 10,
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalCalories,
      byExerciseType,
      scoreDistribution,
    });
  } catch (error) {
    console.error('Error fetching exercise log stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
