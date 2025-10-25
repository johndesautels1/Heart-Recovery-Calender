import { Request, Response } from 'express';
import TherapyGoal from '../models/TherapyGoal';
import User from '../models/User';
import { Op } from 'sequelize';

// GET /api/therapy-goals - Get all therapy goals
export const getTherapyGoals = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { status, goalType, therapistId } = req.query;

    const where: any = {
      [Op.or]: [
        { userId },
        { therapistId: userId } // Can also see goals where user is the therapist
      ]
    };

    if (status) {
      where.status = status;
    }

    if (goalType) {
      where.goalType = goalType;
    }

    if (therapistId) {
      where.therapistId = therapistId;
    }

    const goals = await TherapyGoal.findAll({
      where,
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'therapist',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [
        ['priority', 'DESC'],
        ['targetDate', 'ASC'],
        ['createdAt', 'DESC']
      ]
    });

    res.json({ data: goals });
  } catch (error) {
    console.error('Error fetching therapy goals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/therapy-goals/:id - Get single therapy goal
export const getTherapyGoal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const goal = await TherapyGoal.findOne({
      where: {
        id,
        [Op.or]: [
          { userId },
          { therapistId: userId }
        ]
      },
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'therapist',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!goal) {
      return res.status(404).json({ error: 'Therapy goal not found' });
    }

    res.json(goal);
  } catch (error) {
    console.error('Error fetching therapy goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/therapy-goals - Create new therapy goal
export const createTherapyGoal = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      therapistId,
      goalTitle,
      goalDescription,
      goalType,
      targetValue,
      currentValue,
      unit,
      targetDate,
      priority,
      recurring,
      frequency,
      notes
    } = req.body;

    if (!goalTitle || !goalDescription || !therapistId) {
      return res.status(400).json({
        error: 'Goal title, description, and therapist are required'
      });
    }

    const goal = await TherapyGoal.create({
      userId,
      therapistId,
      goalTitle,
      goalDescription,
      goalType: goalType || 'other',
      targetValue,
      currentValue,
      unit,
      targetDate: targetDate ? new Date(targetDate) : null,
      status: 'not_started',
      progressPercentage: 0,
      priority: priority || 'medium',
      recurring: recurring || false,
      frequency,
      notes
    });

    const createdGoal = await TherapyGoal.findByPk(goal.id, {
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'therapist',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json(createdGoal);
  } catch (error) {
    console.error('Error creating therapy goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/therapy-goals/:id - Update therapy goal
export const updateTherapyGoal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const goal = await TherapyGoal.findOne({
      where: {
        id,
        [Op.or]: [
          { userId },
          { therapistId: userId }
        ]
      }
    });

    if (!goal) {
      return res.status(404).json({ error: 'Therapy goal not found' });
    }

    const {
      goalTitle,
      goalDescription,
      goalType,
      targetValue,
      currentValue,
      unit,
      targetDate,
      status,
      progressPercentage,
      milestones,
      notes,
      priority,
      recurring,
      frequency
    } = req.body;

    await goal.update({
      ...(goalTitle && { goalTitle }),
      ...(goalDescription && { goalDescription }),
      ...(goalType && { goalType }),
      ...(targetValue !== undefined && { targetValue }),
      ...(currentValue !== undefined && { currentValue }),
      ...(unit !== undefined && { unit }),
      ...(targetDate !== undefined && { targetDate: targetDate ? new Date(targetDate) : null }),
      ...(status && { status }),
      ...(progressPercentage !== undefined && { progressPercentage }),
      ...(milestones !== undefined && { milestones }),
      ...(notes !== undefined && { notes }),
      ...(priority && { priority }),
      ...(recurring !== undefined && { recurring }),
      ...(frequency !== undefined && { frequency })
    });

    // If status changed to achieved, set achievedAt
    if (status === 'achieved' && !goal.achievedAt) {
      await goal.update({ achievedAt: new Date() });
    }

    const updatedGoal = await TherapyGoal.findByPk(id, {
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'therapist',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json(updatedGoal);
  } catch (error) {
    console.error('Error updating therapy goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/therapy-goals/:id - Delete therapy goal
export const deleteTherapyGoal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const goal = await TherapyGoal.findOne({
      where: {
        id,
        [Op.or]: [
          { userId },
          { therapistId: userId }
        ]
      }
    });

    if (!goal) {
      return res.status(404).json({ error: 'Therapy goal not found' });
    }

    await goal.destroy();

    res.json({ message: 'Therapy goal deleted successfully' });
  } catch (error) {
    console.error('Error deleting therapy goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/therapy-goals/:id/progress - Update goal progress
export const updateGoalProgress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { currentValue, progressPercentage, milestone } = req.body;

    const goal = await TherapyGoal.findOne({
      where: {
        id,
        [Op.or]: [
          { userId },
          { therapistId: userId }
        ]
      }
    });

    if (!goal) {
      return res.status(404).json({ error: 'Therapy goal not found' });
    }

    const updates: any = {};

    if (currentValue !== undefined) {
      updates.currentValue = currentValue;
    }

    if (progressPercentage !== undefined) {
      updates.progressPercentage = Math.min(100, Math.max(0, progressPercentage));

      // Auto-update status based on progress
      if (updates.progressPercentage === 100) {
        updates.status = 'achieved';
        updates.achievedAt = new Date();
      } else if (updates.progressPercentage > 0 && goal.status === 'not_started') {
        updates.status = 'in_progress';
      }
    }

    // Add milestone if provided
    if (milestone) {
      const milestones = goal.milestones || [];
      milestones.push({
        ...milestone,
        recordedAt: new Date()
      });
      updates.milestones = milestones;
    }

    await goal.update(updates);

    const updatedGoal = await TherapyGoal.findByPk(id, {
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'therapist',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json(updatedGoal);
  } catch (error) {
    console.error('Error updating goal progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
