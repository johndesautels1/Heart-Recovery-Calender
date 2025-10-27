import { Request, Response } from 'express';
import Exercise from '../models/Exercise';
import { Op } from 'sequelize';

// GET /api/exercises - Get all exercises with filters
export const getExercises = async (req: Request, res: Response) => {
  try {
    const { category, difficulty, postOpWeek, isActive, search, limit } = req.query;
    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (difficulty) {
      where.difficulty = difficulty;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Filter by post-op week compatibility
    if (postOpWeek) {
      const week = parseInt(postOpWeek as string);
      where[Op.or] = [
        {
          minPostOpWeek: { [Op.lte]: week },
          maxPostOpWeek: { [Op.gte]: week },
        },
        {
          minPostOpWeek: { [Op.lte]: week },
          maxPostOpWeek: null,
        },
        {
          minPostOpWeek: null,
          maxPostOpWeek: { [Op.gte]: week },
        },
        {
          minPostOpWeek: null,
          maxPostOpWeek: null,
        },
      ];
    }

    // Autocomplete search by name or description (case-insensitive)
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const queryOptions: any = {
      where,
      order: [
        ['category', 'ASC'],
        ['difficulty', 'ASC'],
        ['name', 'ASC'],
      ],
    };

    // Limit results for autocomplete
    if (limit) {
      queryOptions.limit = parseInt(limit as string);
    }

    const exercises = await Exercise.findAll(queryOptions);

    res.json({ data: exercises });
  } catch (error) {
    console.error('Error fetching exercises:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/exercises/:id - Get specific exercise
export const getExercise = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const exercise = await Exercise.findByPk(id);

    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    res.json(exercise);
  } catch (error) {
    console.error('Error fetching exercise:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/exercises - Create new exercise (therapists and admins only)
export const createExercise = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    console.log('CREATE EXERCISE - User ID:', userId, 'User Role:', userRole);

    // Only therapists and admins can create exercises
    if (userRole !== 'therapist' && userRole !== 'admin') {
      console.log('PERMISSION DENIED - Role:', userRole, 'is not therapist or admin');
      return res.status(403).json({ error: 'Only therapists and admins can create exercises' });
    }

    console.log('PERMISSION GRANTED - Creating exercise');

    const exerciseData = {
      ...req.body,
      createdBy: userId,
      isActive: true,
    };

    const exercise = await Exercise.create(exerciseData);

    res.status(201).json(exercise);
  } catch (error) {
    console.error('Error creating exercise:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/exercises/:id - Update exercise (therapists only)
export const updateExercise = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req as any).user.role;

    // Only therapists and admins can update exercises
    if (userRole !== 'therapist' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only therapists and admins can update exercises' });
    }

    const exercise = await Exercise.findByPk(id);

    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    await exercise.update(req.body);

    res.json(exercise);
  } catch (error) {
    console.error('Error updating exercise:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/exercises/:id - Delete exercise (therapists only)
export const deleteExercise = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req as any).user.role;

    // Only therapists and admins can delete exercises
    if (userRole !== 'therapist' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only therapists and admins can delete exercises' });
    }

    const exercise = await Exercise.findByPk(id);

    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    await exercise.destroy();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting exercise:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PATCH /api/exercises/:id/toggle-active - Toggle exercise active status (therapists only)
export const toggleActive = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req as any).user.role;

    // Only therapists and admins can toggle exercise status
    if (userRole !== 'therapist' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only therapists and admins can update exercises' });
    }

    const exercise = await Exercise.findByPk(id);

    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    await exercise.update({ isActive: !exercise.isActive });

    res.json(exercise);
  } catch (error) {
    console.error('Error toggling exercise status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/exercises/categories/list - Get list of all categories
export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = [
      { value: 'upper_body', label: 'Upper Body' },
      { value: 'lower_body', label: 'Lower Body' },
      { value: 'cardio', label: 'Cardio' },
      { value: 'flexibility', label: 'Flexibility' },
      { value: 'balance', label: 'Balance' },
      { value: 'breathing', label: 'Breathing' },
      { value: 'core', label: 'Core' },
    ];

    res.json({ data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/exercises/stats - Get exercise statistics
export const getExerciseStats = async (req: Request, res: Response) => {
  try {
    const totalExercises = await Exercise.count({ where: { isActive: true } });

    const byCategory = await Exercise.findAll({
      attributes: [
        'category',
        [Exercise.sequelize!.fn('COUNT', Exercise.sequelize!.col('id')), 'count'],
      ],
      where: { isActive: true },
      group: ['category'],
    });

    const byDifficulty = await Exercise.findAll({
      attributes: [
        'difficulty',
        [Exercise.sequelize!.fn('COUNT', Exercise.sequelize!.col('id')), 'count'],
      ],
      where: { isActive: true },
      group: ['difficulty'],
    });

    res.json({
      totalExercises,
      byCategory,
      byDifficulty,
    });
  } catch (error) {
    console.error('Error fetching exercise stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
