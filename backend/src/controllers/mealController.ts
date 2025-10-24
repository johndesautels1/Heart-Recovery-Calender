import { Request, Response } from 'express';
import MealEntry from '../models/MealEntry';

export const getMeals = async (req: Request, res: Response) => {
  const { userId } = req.query;
  const meals = await MealEntry.findAll({ where: { userId } });
  res.json(meals);
};

export const addMeal = async (req: Request, res: Response) => {
  const meal = await MealEntry.create(req.body);
  res.status(201).json(meal);
};