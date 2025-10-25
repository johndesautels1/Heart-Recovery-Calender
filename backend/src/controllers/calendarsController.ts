import { Request, Response } from 'express';
import Calendar from '../models/Calendar';
import CalendarEvent from '../models/CalendarEvent';

// GET /api/calendars - Get all calendars for user
export const getCalendars = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const calendars = await Calendar.findAll({
      where: { userId },
      order: [['name', 'ASC']]
    });

    res.json({ data: calendars });
  } catch (error) {
    console.error('Error fetching calendars:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/calendars - Create new calendar
export const createCalendar = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    const calendarData = {
      userId,
      ...req.body
    };

    const calendar = await Calendar.create(calendarData);

    res.status(201).json(calendar);
  } catch (error) {
    console.error('Error creating calendar:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/calendars/:id - Get specific calendar with events
export const getCalendar = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const calendar = await Calendar.findOne({
      where: { id, userId },
      include: [{
        model: CalendarEvent,
        as: 'events'
      }]
    });

    if (!calendar) {
      return res.status(404).json({ error: 'Calendar not found' });
    }

    res.json(calendar);
  } catch (error) {
    console.error('Error fetching calendar:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/calendars/:id - Update calendar
export const updateCalendar = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const calendar = await Calendar.findOne({
      where: { id, userId }
    });

    if (!calendar) {
      return res.status(404).json({ error: 'Calendar not found' });
    }

    await calendar.update(req.body);

    res.json(calendar);
  } catch (error) {
    console.error('Error updating calendar:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/calendars/:id - Delete calendar
export const deleteCalendar = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const calendar = await Calendar.findOne({
      where: { id, userId }
    });

    if (!calendar) {
      return res.status(404).json({ error: 'Calendar not found' });
    }

    // Delete associated events first
    await CalendarEvent.destroy({
      where: { calendarId: id }
    });

    await calendar.destroy();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting calendar:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
