import { Request, Response } from 'express';
import Habit from '../models/Habit';
import HabitLog from '../models/HabitLog';
import { Op } from 'sequelize';

export const getHabits = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { isActive, category } = req.query;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const whereClause: any = { userId };

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    if (category) {
      whereClause.category = category;
    }

    const habits = await Habit.findAll({
      where: whereClause,
      include: [
        {
          model: HabitLog,
          as: 'logs',
          limit: 10,
          order: [['completedAt', 'DESC']],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json(habits);
  } catch (error: any) {
    console.error('Error fetching habits:', error);
    res.status(500).json({ message: 'Error fetching habits', error: error.message });
  }
};

export const getHabitById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const habit = await Habit.findOne({
      where: { id, userId },
      include: [
        {
          model: HabitLog,
          as: 'logs',
          order: [['completedAt', 'DESC']],
        },
      ],
    });

    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    res.json(habit);
  } catch (error: any) {
    console.error('Error fetching habit:', error);
    res.status(500).json({ message: 'Error fetching habit', error: error.message });
  }
};

export const createHabit = async (req: Request, res: Response) => {
  try {
    const { name, description, frequency, targetDaysPerWeek, category } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!name || !frequency) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const habit = await Habit.create({
      userId,
      name,
      description,
      frequency,
      targetDaysPerWeek,
      category,
      streakCount: 0,
      isActive: true,
    });

    res.status(201).json(habit);
  } catch (error: any) {
    console.error('Error creating habit:', error);
    res.status(500).json({ message: 'Error creating habit', error: error.message });
  }
};

export const updateHabit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, frequency, targetDaysPerWeek, category, isActive } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const habit = await Habit.findOne({
      where: { id, userId },
    });

    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    await habit.update({
      name,
      description,
      frequency,
      targetDaysPerWeek,
      category,
      isActive,
    });

    res.json(habit);
  } catch (error: any) {
    console.error('Error updating habit:', error);
    res.status(500).json({ message: 'Error updating habit', error: error.message });
  }
};

export const deleteHabit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const habit = await Habit.findOne({
      where: { id, userId },
    });

    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    // Soft delete
    await habit.update({ isActive: false });

    res.json({ message: 'Habit deactivated successfully' });
  } catch (error: any) {
    console.error('Error deleting habit:', error);
    res.status(500).json({ message: 'Error deleting habit', error: error.message });
  }
};

export const logHabitCompletion = async (req: Request, res: Response) => {
  try {
    const { habitId } = req.params;
    const { completedAt, notes } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verify the habit belongs to the user
    const habit = await Habit.findOne({
      where: { id: habitId, userId },
    });

    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    // Create the log entry
    const log = await HabitLog.create({
      habitId: Number(habitId),
      userId,
      completedAt: completedAt || new Date(),
      notes,
    });

    // Update streak and last completed
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const lastCompletedDate = habit.lastCompleted ? new Date(habit.lastCompleted) : null;
    let newStreakCount = habit.streakCount;

    if (!lastCompletedDate) {
      // First completion
      newStreakCount = 1;
    } else {
      const lastCompletedDay = new Date(lastCompletedDate);
      lastCompletedDay.setHours(0, 0, 0, 0);

      if (lastCompletedDay.getTime() === yesterday.getTime()) {
        // Completed yesterday, increment streak
        newStreakCount = habit.streakCount + 1;
      } else if (lastCompletedDay.getTime() < yesterday.getTime()) {
        // Missed a day, reset streak
        newStreakCount = 1;
      }
      // If completed today already, don't change streak
    }

    await habit.update({
      lastCompleted: new Date(),
      streakCount: newStreakCount,
    });

    res.status(201).json({ log, habit });
  } catch (error: any) {
    console.error('Error logging habit completion:', error);
    res.status(500).json({ message: 'Error logging habit completion', error: error.message });
  }
};

export const getHabitLogs = async (req: Request, res: Response) => {
  try {
    const { habitId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verify the habit belongs to the user
    const habit = await Habit.findOne({
      where: { id: habitId, userId },
    });

    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    const logs = await HabitLog.findAll({
      where: { habitId, userId },
      order: [['completedAt', 'DESC']],
    });

    res.json(logs);
  } catch (error: any) {
    console.error('Error fetching habit logs:', error);
    res.status(500).json({ message: 'Error fetching habit logs', error: error.message });
  }
};
