import { Request, Response } from 'express';
import MealEntry from '../models/MealEntry';
import { Op } from 'sequelize';

const DIETARY_LIMITS = {
  calories: 2000,
  sodium: 2300,
  cholesterol: 300,
  saturatedFat: 20
};

export const getMeals = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.query.userId;
    const { date, start, end, mealType } = req.query;
    const where: any = { userId };

    if (date) {
      const dayStart = new Date(date as string);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date as string);
      dayEnd.setHours(23, 59, 59, 999);
      where.timestamp = { [Op.gte]: dayStart, [Op.lte]: dayEnd };
    } else if (start || end) {
      where.timestamp = {};
      if (start) where.timestamp[Op.gte] = new Date(start as string);
      if (end) where.timestamp[Op.lte] = new Date(end as string);
    }

    if (mealType) where.mealType = mealType;

    const meals = await MealEntry.findAll({ where, order: [['timestamp', 'DESC']] });
    res.json({ data: meals });
  } catch (error) {
    console.error('Error fetching meals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addMeal = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const withinSpec = checkCompliance(req.body);
    const mealData = { userId, ...req.body, withinSpec, timestamp: req.body.timestamp || new Date() };
    const meal = await MealEntry.create(mealData);
    res.status(201).json(meal);
  } catch (error) {
    console.error('Error adding meal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDailySummary = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const meals = await MealEntry.findAll({
      where: { userId, timestamp: { [Op.gte]: dayStart, [Op.lte]: dayEnd } }
    });

    const totals = { calories: 0, sodium: 0, cholesterol: 0, saturatedFat: 0, totalFat: 0, fiber: 0, sugar: 0, protein: 0, carbohydrates: 0 };
    meals.forEach(meal => {
      totals.calories += meal.calories || 0;
      totals.sodium += meal.sodium || 0;
      totals.cholesterol += meal.cholesterol || 0;
      totals.saturatedFat += meal.saturatedFat || 0;
      totals.totalFat += meal.totalFat || 0;
      totals.fiber += meal.fiber || 0;
      totals.sugar += meal.sugar || 0;
      totals.protein += meal.protein || 0;
      totals.carbohydrates += meal.carbohydrates || 0;
    });

    const mealsLogged = meals.length;
    const compliantMeals = meals.filter(m => m.withinSpec).length;
    const compliancePercentage = mealsLogged > 0 ? Math.round((compliantMeals / mealsLogged) * 100) : 100;

    res.json({ date, totals, limits: DIETARY_LIMITS, mealsLogged, compliancePercentage });
  } catch (error) {
    console.error('Error fetching daily summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCompliance = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { start, end } = req.query;
    const startDate = start ? new Date(start as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end as string) : new Date();

    const meals = await MealEntry.findAll({
      where: { userId, timestamp: { [Op.gte]: startDate, [Op.lte]: endDate } }
    });

    const totalMeals = meals.length;
    const compliantMeals = meals.filter(m => m.withinSpec).length;
    const complianceRate = totalMeals > 0 ? (compliantMeals / totalMeals) * 100 : 0;

    const trends = {
      sodium: { average: totalMeals > 0 ? Math.round(meals.reduce((s, m) => s + (m.sodium || 0), 0) / totalMeals) : 0, overLimitDays: 0 },
      cholesterol: { average: totalMeals > 0 ? Math.round(meals.reduce((s, m) => s + (m.cholesterol || 0), 0) / totalMeals) : 0, overLimitDays: 0 },
      saturatedFat: { average: totalMeals > 0 ? Math.round(meals.reduce((s, m) => s + (m.saturatedFat || 0), 0) / totalMeals) : 0, overLimitDays: 0 }
    };

    res.json({ totalMeals, compliantMeals, complianceRate: Math.round(complianceRate), trends });
  } catch (error) {
    console.error('Error fetching compliance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMeal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const meal = await MealEntry.findOne({ where: { id, userId } });
    if (!meal) return res.status(404).json({ error: 'Meal not found' });
    res.json(meal);
  } catch (error) {
    console.error('Error fetching meal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateMeal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const meal = await MealEntry.findOne({ where: { id, userId } });
    if (!meal) return res.status(404).json({ error: 'Meal not found' });
    const withinSpec = checkCompliance(req.body);
    await meal.update({ ...req.body, withinSpec });
    res.json(meal);
  } catch (error) {
    console.error('Error updating meal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteMeal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const meal = await MealEntry.findOne({ where: { id, userId } });
    if (!meal) return res.status(404).json({ error: 'Meal not found' });
    await meal.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting meal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

function checkCompliance(mealData: any): boolean {
  const sodium = mealData.sodium || 0;
  const cholesterol = mealData.cholesterol || 0;
  const saturatedFat = mealData.saturatedFat || 0;
  return sodium <= DIETARY_LIMITS.sodium / 4 && cholesterol <= DIETARY_LIMITS.cholesterol / 4 && saturatedFat <= DIETARY_LIMITS.saturatedFat / 4;
}
