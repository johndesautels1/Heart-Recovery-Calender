import { Request, Response } from 'express';
import GoalTemplate from '../models/GoalTemplate';

export const getGoalTemplates = async (req: Request, res: Response) => {
  try {
    const { category, goalType, isActive } = req.query;

    const whereClause: any = {};

    if (category) {
      whereClause.category = category;
    }

    if (goalType) {
      whereClause.goalType = goalType;
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    const templates = await GoalTemplate.findAll({
      where: whereClause,
      order: [['category', 'ASC'], ['name', 'ASC']],
    });

    res.json(templates);
  } catch (error: any) {
    console.error('Error fetching goal templates:', error);
    res.status(500).json({ message: 'Error fetching goal templates', error: error.message });
  }
};

export const getGoalTemplateById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const template = await GoalTemplate.findByPk(id);

    if (!template) {
      return res.status(404).json({ message: 'Goal template not found' });
    }

    res.json(template);
  } catch (error: any) {
    console.error('Error fetching goal template:', error);
    res.status(500).json({ message: 'Error fetching goal template', error: error.message });
  }
};

export const createGoalTemplate = async (req: Request, res: Response) => {
  try {
    const { name, description, goalType, targetValue, unit, timeframe, category } = req.body;

    if (!name || !description || !goalType || !category) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const template = await GoalTemplate.create({
      name,
      description,
      goalType,
      targetValue,
      unit,
      timeframe,
      category,
      isActive: true,
    });

    res.status(201).json(template);
  } catch (error: any) {
    console.error('Error creating goal template:', error);
    res.status(500).json({ message: 'Error creating goal template', error: error.message });
  }
};

export const updateGoalTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, goalType, targetValue, unit, timeframe, category, isActive } = req.body;

    const template = await GoalTemplate.findByPk(id);

    if (!template) {
      return res.status(404).json({ message: 'Goal template not found' });
    }

    await template.update({
      name,
      description,
      goalType,
      targetValue,
      unit,
      timeframe,
      category,
      isActive,
    });

    res.json(template);
  } catch (error: any) {
    console.error('Error updating goal template:', error);
    res.status(500).json({ message: 'Error updating goal template', error: error.message });
  }
};

export const deleteGoalTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const template = await GoalTemplate.findByPk(id);

    if (!template) {
      return res.status(404).json({ message: 'Goal template not found' });
    }

    // Soft delete - just mark as inactive
    await template.update({ isActive: false });

    res.json({ message: 'Goal template deactivated successfully' });
  } catch (error: any) {
    console.error('Error deleting goal template:', error);
    res.status(500).json({ message: 'Error deleting goal template', error: error.message });
  }
};
