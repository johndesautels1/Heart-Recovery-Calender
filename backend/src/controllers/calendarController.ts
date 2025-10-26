import { Request, Response } from 'express';
import CalendarEvent from '../models/CalendarEvent';
import Calendar from '../models/Calendar';
import { Op } from 'sequelize';

// GET /api/events - Get events with filters
export const getEvents = async (req: Request, res: Response) => {
  try {
    const { calendarId, start, end, status } = req.query;
    const where: any = {};

    if (calendarId) {
      where.calendarId = calendarId;
    }

    if (start || end) {
      where.startTime = {};
      if (start) where.startTime[Op.gte] = new Date(start as string);
      if (end) where.startTime[Op.lte] = new Date(end as string);
    }

    if (status) {
      where.status = status;
    }

    const events = await CalendarEvent.findAll({
      where,
      order: [['startTime', 'ASC']]
    });

    res.json({ data: events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/events - Create new event
export const createEvent = async (req: Request, res: Response) => {
  try {
    const event = await CalendarEvent.create(req.body);
    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/events/:id - Get specific event
export const getEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const event = await CalendarEvent.findByPk(id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/events/:id - Update event
export const updateEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const event = await CalendarEvent.findByPk(id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await event.update(req.body);

    res.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/events/:id - Delete event
export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const event = await CalendarEvent.findByPk(id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await event.destroy();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/events/today - Delete all events for today
export const deleteTodayEvents = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get user's calendar IDs
    const userCalendars = await Calendar.findAll({
      where: { userId },
      attributes: ['id'],
    });
    const calendarIds = userCalendars.map(cal => cal.id);

    if (calendarIds.length === 0) {
      return res.json({ deletedCount: 0, message: 'No events found' });
    }

    // Delete events from user's calendars for today
    const result = await CalendarEvent.destroy({
      where: {
        calendarId: {
          [Op.in]: calendarIds,
        },
        startTime: {
          [Op.gte]: today.toISOString(),
          [Op.lt]: tomorrow.toISOString(),
        },
      },
    });

    res.json({ deletedCount: result, message: `Deleted ${result} event(s) from today` });
  } catch (error) {
    console.error('Error deleting today\'s events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/events/history - Delete all historic events
export const deleteHistoricEvents = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get user's calendar IDs
    const userCalendars = await Calendar.findAll({
      where: { userId },
      attributes: ['id'],
    });
    const calendarIds = userCalendars.map(cal => cal.id);

    if (calendarIds.length === 0) {
      return res.json({ deletedCount: 0, message: 'No events found' });
    }

    // Delete events from user's calendars that ended before today
    const result = await CalendarEvent.destroy({
      where: {
        calendarId: {
          [Op.in]: calendarIds,
        },
        endTime: {
          [Op.lt]: today.toISOString(),
        },
      },
    });

    res.json({ deletedCount: result, message: `Deleted ${result} historic event(s)` });
  } catch (error) {
    console.error('Error deleting historic events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PATCH /api/events/:id/status - Update event status
export const updateEventStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const event = await CalendarEvent.findByPk(id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await event.update({ status });

    res.json(event);
  } catch (error) {
    console.error('Error updating event status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/events/:id/instances - Get instances of recurring event
export const getEventInstances = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { start, end } = req.query;

    const event = await CalendarEvent.findByPk(id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (!event.recurrenceRule) {
      return res.status(400).json({ error: 'Event is not recurring' });
    }

    // TODO: Implement recurrence rule parsing using recurrenceService
    // For now, return empty array
    const instances: any[] = [];

    res.json({ instances });
  } catch (error) {
    console.error('Error fetching event instances:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
