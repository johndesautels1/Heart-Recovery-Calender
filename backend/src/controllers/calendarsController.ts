import { Request, Response } from 'express';
import Calendar from '../models/Calendar';

export const getCalendars = async (req: Request, res: Response) => {
  const { userId } = req.query;
  const calendars = await Calendar.findAll({ where: { userId } });
  res.json(calendars);
};

export const createCalendar = async (req: Request, res: Response) => {
  const calendar = await Calendar.create(req.body);
  res.status(201).json(calendar);
};