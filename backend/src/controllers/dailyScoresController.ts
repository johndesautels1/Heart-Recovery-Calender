import { Request, Response } from 'express';
import DailyScore from '../models/DailyScore';
import User from '../models/User';
import { Op } from 'sequelize';

// GET /api/daily-scores - Get all daily scores with filters
export const getDailyScores = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { startDate, endDate, minScore, maxScore, userId: queryUserId } = req.query;

    const where: any = {};

    // If patient role, only show their own scores
    if (userRole === 'patient') {
      where.userId = userId;
    } else if (queryUserId) {
      // Therapists can query specific patient's scores
      where.userId = queryUserId;
    }

    // Date range filtering
    if (startDate || endDate) {
      where.scoreDate = {};
      if (startDate) {
        where.scoreDate[Op.gte] = startDate;
      }
      if (endDate) {
        where.scoreDate[Op.lte] = endDate;
      }
    }

    // Score range filtering
    if (minScore || maxScore) {
      where.totalDailyScore = {};
      if (minScore) {
        where.totalDailyScore[Op.gte] = parseFloat(minScore as string);
      }
      if (maxScore) {
        where.totalDailyScore[Op.lte] = parseFloat(maxScore as string);
      }
    }

    const scores = await DailyScore.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['scoreDate', 'DESC']],
    });

    res.json({ data: scores });
  } catch (error) {
    console.error('Error fetching daily scores:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/daily-scores/:id - Get specific daily score
export const getDailyScore = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const score = await DailyScore.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
        },
      ],
    });

    if (!score) {
      return res.status(404).json({ error: 'Daily score not found' });
    }

    // Authorization: patients can only view their own scores
    if (userRole === 'patient' && score.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(score);
  } catch (error) {
    console.error('Error fetching daily score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/daily-scores/date/:date - Get daily score for specific date
export const getDailyScoreByDate = async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { userId: queryUserId } = req.query;

    const where: any = { scoreDate: date };

    // Determine which user's score to fetch
    if (userRole === 'patient') {
      where.userId = userId;
    } else if (queryUserId) {
      where.userId = queryUserId;
    } else {
      return res.status(400).json({ error: 'userId query parameter required for therapists' });
    }

    const score = await DailyScore.findOne({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    if (!score) {
      return res.status(404).json({ error: 'No daily score found for this date' });
    }

    res.json(score);
  } catch (error) {
    console.error('Error fetching daily score by date:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/daily-scores - Create or update daily score (upsert)
export const createOrUpdateDailyScore = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    console.log('[DAILY-SCORES] Creating/updating daily score for user:', userId);
    console.log('[DAILY-SCORES] Request body:', JSON.stringify(req.body, null, 2));

    // Patients can only create scores for themselves
    if (userRole === 'patient' && req.body.userId && req.body.userId !== userId) {
      return res.status(403).json({ error: 'Patients can only log their own scores' });
    }

    // If no userId provided in body, use authenticated user's ID
    const scoreData = {
      ...req.body,
      userId: req.body.userId || userId,
    };

    // Validate required fields
    if (!scoreData.userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    if (!scoreData.scoreDate) {
      return res.status(400).json({ error: 'scoreDate is required' });
    }

    // Calculate totalDailyScore as weighted average of category scores
    const scores = [
      scoreData.exerciseScore || 0,
      scoreData.nutritionScore || 0,
      scoreData.medicationScore || 0,
      scoreData.sleepScore || 0,
      scoreData.vitalsScore || 0,
      scoreData.hydrationScore || 0,
    ];

    // Count non-zero scores to calculate average
    const validScores = scores.filter(s => s > 0);
    if (validScores.length > 0) {
      scoreData.totalDailyScore = validScores.reduce((a, b) => a + b, 0) / validScores.length;
    } else {
      scoreData.totalDailyScore = 0;
    }

    console.log('[DAILY-SCORES] Calculated totalDailyScore:', scoreData.totalDailyScore);

    // Check if score already exists for this date (upsert behavior)
    const existing = await DailyScore.findOne({
      where: {
        userId: scoreData.userId,
        scoreDate: scoreData.scoreDate,
      },
    });

    let score;
    if (existing) {
      console.log('[DAILY-SCORES] Updating existing score for date:', scoreData.scoreDate);
      await existing.update(scoreData);
      score = existing;
    } else {
      console.log('[DAILY-SCORES] Creating new score');
      score = await DailyScore.create(scoreData);
    }

    console.log('[DAILY-SCORES] Daily score created/updated successfully:', score.id);
    console.log('[DAILY-SCORES] postSurgeryDay:', score.postSurgeryDay);

    // Load full score with associations
    const fullScore = await DailyScore.findByPk(score.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    res.status(existing ? 200 : 201).json(fullScore);
  } catch (error: any) {
    console.error('[DAILY-SCORES] Error creating/updating daily score:', error);
    console.error('[DAILY-SCORES] Error details:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// DELETE /api/daily-scores/:id - Delete daily score
export const deleteDailyScore = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const score = await DailyScore.findByPk(id);

    if (!score) {
      return res.status(404).json({ error: 'Daily score not found' });
    }

    // Authorization: patients can only delete their own scores, therapists can delete any
    if (userRole === 'patient' && score.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await score.destroy();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting daily score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/daily-scores/stats - Get daily score statistics
export const getDailyScoreStats = async (req: Request, res: Response) => {
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
      where.scoreDate = {};
      if (startDate) {
        where.scoreDate[Op.gte] = startDate;
      }
      if (endDate) {
        where.scoreDate[Op.lte] = endDate;
      }
    }

    // Total days logged
    const totalDays = await DailyScore.count({ where });

    // Average scores by category
    const avgScores = await DailyScore.findOne({
      where,
      attributes: [
        [DailyScore.sequelize!.fn('AVG', DailyScore.sequelize!.col('exerciseScore')), 'avgExercise'],
        [DailyScore.sequelize!.fn('AVG', DailyScore.sequelize!.col('nutritionScore')), 'avgNutrition'],
        [DailyScore.sequelize!.fn('AVG', DailyScore.sequelize!.col('medicationScore')), 'avgMedication'],
        [DailyScore.sequelize!.fn('AVG', DailyScore.sequelize!.col('sleepScore')), 'avgSleep'],
        [DailyScore.sequelize!.fn('AVG', DailyScore.sequelize!.col('vitalsScore')), 'avgVitals'],
        [DailyScore.sequelize!.fn('AVG', DailyScore.sequelize!.col('hydrationScore')), 'avgHydration'],
        [DailyScore.sequelize!.fn('AVG', DailyScore.sequelize!.col('totalDailyScore')), 'avgTotal'],
      ],
      raw: true,
    });

    const roundScore = (val: any) => Math.round(parseFloat(val || '0') * 10) / 10;

    // Days with excellent scores (>= 80)
    const excellentDays = await DailyScore.count({
      where: {
        ...where,
        totalDailyScore: { [Op.gte]: 80 },
      },
    });

    // Days with good scores (60-79)
    const goodDays = await DailyScore.count({
      where: {
        ...where,
        totalDailyScore: { [Op.gte]: 60, [Op.lt]: 80 },
      },
    });

    // Days with fair scores (40-59)
    const fairDays = await DailyScore.count({
      where: {
        ...where,
        totalDailyScore: { [Op.gte]: 40, [Op.lt]: 60 },
      },
    });

    // Days with poor scores (< 40)
    const poorDays = await DailyScore.count({
      where: {
        ...where,
        totalDailyScore: { [Op.lt]: 40 },
      },
    });

    res.json({
      totalDays,
      averageScores: {
        exercise: roundScore((avgScores as any)?.avgExercise),
        nutrition: roundScore((avgScores as any)?.avgNutrition),
        medication: roundScore((avgScores as any)?.avgMedication),
        sleep: roundScore((avgScores as any)?.avgSleep),
        vitals: roundScore((avgScores as any)?.avgVitals),
        hydration: roundScore((avgScores as any)?.avgHydration),
        total: roundScore((avgScores as any)?.avgTotal),
      },
      scoreDistribution: {
        excellent: excellentDays, // >= 80
        good: goodDays, // 60-79
        fair: fairDays, // 40-59
        poor: poorDays, // < 40
      },
    });
  } catch (error) {
    console.error('Error fetching daily score stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/daily-scores/trends - Get score trends over time
export const getTrends = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { userId: queryUserId, startDate, endDate, interval = 'week' } = req.query;

    const where: any = {};

    // Determine which user's trends to fetch
    if (userRole === 'patient') {
      where.userId = userId;
    } else if (queryUserId) {
      where.userId = queryUserId;
    } else {
      return res.status(400).json({ error: 'userId query parameter required for therapists' });
    }

    // Date range filtering
    if (startDate || endDate) {
      where.scoreDate = {};
      if (startDate) {
        where.scoreDate[Op.gte] = startDate;
      }
      if (endDate) {
        where.scoreDate[Op.lte] = endDate;
      }
    }

    // Get all scores in date range, ordered by date
    const scores = await DailyScore.findAll({
      where,
      order: [['scoreDate', 'ASC']],
      attributes: [
        'scoreDate',
        'exerciseScore',
        'nutritionScore',
        'medicationScore',
        'sleepScore',
        'vitalsScore',
        'hydrationScore',
        'totalDailyScore',
        'postSurgeryDay',
      ],
    });

    // Group by interval (week or month)
    let trendData: any[] = [];
    if (interval === 'week') {
      // Group by ISO week
      const weekGroups: { [key: string]: any[] } = {};
      scores.forEach((score: any) => {
        const date = new Date(score.scoreDate);
        // Get ISO week number
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const daysSinceStart = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
        const weekNum = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);
        const weekKey = `${date.getFullYear()}-W${weekNum}`;

        if (!weekGroups[weekKey]) {
          weekGroups[weekKey] = [];
        }
        weekGroups[weekKey].push(score);
      });

      // Calculate averages for each week
      trendData = Object.entries(weekGroups).map(([week, weekScores]) => ({
        period: week,
        avgExercise: Math.round((weekScores.reduce((sum, s) => sum + (s.exerciseScore || 0), 0) / weekScores.length) * 10) / 10,
        avgNutrition: Math.round((weekScores.reduce((sum, s) => sum + (s.nutritionScore || 0), 0) / weekScores.length) * 10) / 10,
        avgMedication: Math.round((weekScores.reduce((sum, s) => sum + (s.medicationScore || 0), 0) / weekScores.length) * 10) / 10,
        avgSleep: Math.round((weekScores.reduce((sum, s) => sum + (s.sleepScore || 0), 0) / weekScores.length) * 10) / 10,
        avgVitals: Math.round((weekScores.reduce((sum, s) => sum + (s.vitalsScore || 0), 0) / weekScores.length) * 10) / 10,
        avgHydration: Math.round((weekScores.reduce((sum, s) => sum + (s.hydrationScore || 0), 0) / weekScores.length) * 10) / 10,
        avgTotal: Math.round((weekScores.reduce((sum, s) => sum + (s.totalDailyScore || 0), 0) / weekScores.length) * 10) / 10,
        daysLogged: weekScores.length,
      }));
    } else {
      // Return daily data
      trendData = scores.map((score: any) => ({
        date: score.scoreDate,
        exerciseScore: score.exerciseScore,
        nutritionScore: score.nutritionScore,
        medicationScore: score.medicationScore,
        sleepScore: score.sleepScore,
        vitalsScore: score.vitalsScore,
        hydrationScore: score.hydrationScore,
        totalDailyScore: score.totalDailyScore,
        postSurgeryDay: score.postSurgeryDay,
      }));
    }

    res.json({ data: trendData });
  } catch (error) {
    console.error('Error fetching score trends:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
