import { Request, Response } from 'express';
import { Op } from 'sequelize';
import MealEntry from '../models/MealEntry';
import ExerciseLog from '../models/ExerciseLog';
import Patient from '../models/Patient';
import sequelize from '../models/database';

/**
 * GET /api/calories/summary
 * Get calorie summary (consumed, burned, net) for a date range
 * Query params: startDate, endDate, userId (optional for therapists)
 */
export const getCalorieSummary = async (req: Request, res: Response) => {
  try {
    const currentUserId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { startDate, endDate, userId: queryUserId } = req.query;

    // Determine which user's data to fetch
    let targetUserId = currentUserId;
    if (userRole !== 'patient' && queryUserId) {
      targetUserId = parseInt(queryUserId as string);
    }

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter[Op.gte] = new Date(startDate as string);
    }
    if (endDate) {
      dateFilter[Op.lte] = new Date(endDate as string);
    }

    // Get total calories consumed from meals
    const mealsResult = await MealEntry.findOne({
      where: {
        userId: targetUserId,
        ...(Object.keys(dateFilter).length > 0 ? { timestamp: dateFilter } : {}),
      },
      attributes: [[sequelize.fn('SUM', sequelize.col('calories')), 'totalCalories']],
      raw: true,
    });

    const caloriesConsumed = parseInt((mealsResult as any)?.totalCalories || '0');

    // Get total calories burned from exercises
    const exercisesResult = await ExerciseLog.findOne({
      where: {
        patientId: targetUserId,
        ...(Object.keys(dateFilter).length > 0 ? { completedAt: dateFilter } : {}),
      },
      attributes: [[sequelize.fn('SUM', sequelize.col('caloriesBurned')), 'totalCalories']],
      raw: true,
    });

    const caloriesBurned = parseInt((exercisesResult as any)?.totalCalories || '0');

    // Calculate net calories
    const netCalories = caloriesConsumed - caloriesBurned;

    res.json({
      caloriesConsumed,
      caloriesBurned,
      netCalories,
      status: netCalories < -200 ? 'deficit' : netCalories > 200 ? 'surplus' : 'neutral',
    });
  } catch (error) {
    console.error('Error fetching calorie summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/calories/daily
 * Get daily calorie breakdown for a date range
 * Query params: startDate, endDate, userId (optional for therapists)
 */
export const getDailyCalories = async (req: Request, res: Response) => {
  try {
    const currentUserId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { startDate, endDate, userId: queryUserId } = req.query;

    // Determine which user's data to fetch
    let targetUserId = currentUserId;
    if (userRole !== 'patient' && queryUserId) {
      targetUserId = parseInt(queryUserId as string);
    }

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter[Op.gte] = new Date(startDate as string);
    }
    if (endDate) {
      dateFilter[Op.lte] = new Date(endDate as string);
    }

    // Get daily calories consumed
    const mealsData = await MealEntry.findAll({
      where: {
        userId: targetUserId,
        ...(Object.keys(dateFilter).length > 0 ? { timestamp: dateFilter } : {}),
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('timestamp')), 'date'],
        [sequelize.fn('SUM', sequelize.col('calories')), 'calories'],
      ],
      group: [sequelize.fn('DATE', sequelize.col('timestamp'))],
      order: [[sequelize.fn('DATE', sequelize.col('timestamp')), 'ASC']],
      raw: true,
    });

    // Get daily calories burned
    const exerciseData = await ExerciseLog.findAll({
      where: {
        patientId: targetUserId,
        ...(Object.keys(dateFilter).length > 0 ? { completedAt: dateFilter } : {}),
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('completedAt')), 'date'],
        [sequelize.fn('SUM', sequelize.col('caloriesBurned')), 'calories'],
      ],
      group: [sequelize.fn('DATE', sequelize.col('completedAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('completedAt')), 'ASC']],
      raw: true,
    });

    // Merge data by date
    const dailyData: Record<
      string,
      { date: string; consumed: number; burned: number; net: number }
    > = {};

    // Add meals data
    for (const meal of mealsData as any[]) {
      const date = meal.date;
      if (!dailyData[date]) {
        dailyData[date] = { date, consumed: 0, burned: 0, net: 0 };
      }
      dailyData[date].consumed = parseInt(meal.calories || '0');
    }

    // Add exercise data
    for (const exercise of exerciseData as any[]) {
      const date = exercise.date;
      if (!dailyData[date]) {
        dailyData[date] = { date, consumed: 0, burned: 0, net: 0 };
      }
      dailyData[date].burned = parseInt(exercise.calories || '0');
    }

    // Calculate net calories
    const result = Object.values(dailyData).map((day) => ({
      ...day,
      net: day.consumed - day.burned,
    }));

    res.json({ data: result });
  } catch (error) {
    console.error('Error fetching daily calories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/calories/weight-correlation
 * Get weight trajectory correlated with net calories
 * Query params: userId (optional for therapists)
 */
export const getWeightCorrelation = async (req: Request, res: Response) => {
  try {
    const currentUserId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { userId: queryUserId } = req.query;

    // Determine which user's data to fetch
    let targetUserId = currentUserId;
    if (userRole !== 'patient' && queryUserId) {
      targetUserId = parseInt(queryUserId as string);
    }

    // Get patient info
    const patient = await Patient.findOne({ where: { userId: targetUserId } });

    if (!patient) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }

    res.json({
      currentWeight: patient.currentWeight,
      targetWeight: patient.targetWeight,
      startingWeight: patient.startingWeight,
      weightUnit: patient.weightUnit || 'lbs',
      surgeryDate: patient.surgeryDate,
    });
  } catch (error) {
    console.error('Error fetching weight correlation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
