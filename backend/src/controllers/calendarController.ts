import { Request, Response } from 'express';
import CalendarEvent from '../models/CalendarEvent';

export const getEvents = async (req: Request, res: Response) => {
  const { calendarId, start, end } = req.query;
  const events = await CalendarEvent.findAll({
    where: {
      calendarId,
      startTime: { $gte: start },
      endTime: { $lte: end }
    }
  });
  res.json(events);
};

export const createEvent = async (req: Request, res: Response) => {
  const event = await CalendarEvent.create(req.body);
  res.status(201).json(event);
};