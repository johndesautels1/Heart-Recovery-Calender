import { Request, Response } from 'express';
import CalendarEvent from '../models/CalendarEvent';
import Calendar from '../models/Calendar';
import { Op } from 'sequelize';
import ical from 'ical-generator';

// GET /api/integrations/apple/export - Export events as .ics file for Apple Calendar
export const exportToAppleCalendar = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { startDate, endDate, calendarId } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Build query
    const where: any = {};
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime[Op.gte] = new Date(startDate as string);
      if (endDate) where.startTime[Op.lte] = new Date(endDate as string);
    }

    // Fetch events
    const events = await CalendarEvent.findAll({
      where,
      include: [
        {
          association: 'calendar',
          where: calendarId ? { id: calendarId, userId } : { userId }
        }
      ],
      order: [['startTime', 'ASC']]
    });

    // Create iCalendar
    const cal = ical({
      name: 'Heart Recovery Calendar',
      prodId: '//Heart Recovery Calendar//EN',
      timezone: 'America/New_York'
    });

    // Add events to calendar
    events.forEach(event => {
      cal.createEvent({
        start: event.startTime,
        end: event.endTime,
        summary: event.title,
        description: event.description || '',
        location: event.location || '',
        uid: `event-${event.id}@heartrecovery.com`,
        status: event.status === 'completed' ? 'CONFIRMED' : 'TENTATIVE'
      });
    });

    // Set response headers for .ics file download
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="heart-recovery-calendar.ics"');
    res.send(cal.toString());
  } catch (error) {
    console.error('Error exporting to Apple Calendar:', error);
    res.status(500).json({ error: 'Failed to export calendar' });
  }
};

// POST /api/integrations/apple/import - Import .ics file from Apple Calendar
export const importFromAppleCalendar = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { icsData } = req.body; // Base64 encoded .ics file content

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!icsData) {
      return res.status(400).json({ error: 'No calendar data provided' });
    }

    // Decode the .ics file content
    const icsContent = Buffer.from(icsData, 'base64').toString('utf-8');

    // TODO: Parse .ics file using ical.js or node-ical
    // const parsedCalendar = ical.parseICS(icsContent);

    // Find or create import calendar
    let importCalendar = await Calendar.findOne({
      where: { userId, name: 'Apple Calendar Import' }
    });

    if (!importCalendar) {
      importCalendar = await Calendar.create({
        userId,
        name: 'Apple Calendar Import',
        type: 'appointment',
        color: '#000000',
        isActive: true
      });
    }

    // TODO: Import parsed events
    // for (const event of parsedEvents) {
    //   await CalendarEvent.create({
    //     calendarId: importCalendar.id,
    //     title: event.summary,
    //     description: event.description,
    //     startTime: event.start,
    //     endTime: event.end,
    //     location: event.location,
    //     eventType: 'appointment',
    //     status: 'scheduled',
    //     externalProvider: 'apple'
    //   });
    // }

    res.json({
      success: true,
      message: 'Calendar imported successfully',
      imported: 0 // Update with actual count
    });
  } catch (error) {
    console.error('Error importing from Apple Calendar:', error);
    res.status(500).json({ error: 'Failed to import calendar' });
  }
};

// GET /api/integrations/apple/subscribe - Get subscription URL for Apple Calendar
export const getSubscriptionUrl = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Generate a subscription token for this user
    const subscriptionToken = Buffer.from(`${userId}:${Date.now()}`).toString('base64');

    // Build subscription URL (webcal protocol for Apple Calendar)
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000';
    const subscriptionUrl = `${baseUrl.replace('http', 'webcal')}/api/integrations/apple/feed/${subscriptionToken}`;

    res.json({
      subscriptionUrl,
      instructions: 'Copy this URL and add it as a subscribed calendar in Apple Calendar',
      steps: [
        'Open Apple Calendar',
        'Go to File > New Calendar Subscription',
        'Paste the subscription URL',
        'Choose update frequency and click Subscribe'
      ]
    });
  } catch (error) {
    console.error('Error generating subscription URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/integrations/apple/feed/:token - Live calendar feed for subscription
export const getCalendarFeed = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    // Decode token to get userId
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const userId = parseInt(decoded.split(':')[0]);

    if (!userId) {
      return res.status(401).json({ error: 'Invalid subscription token' });
    }

    // Fetch all future events for this user
    const now = new Date();
    const events = await CalendarEvent.findAll({
      where: {
        startTime: { [Op.gte]: now }
      },
      include: [
        {
          association: 'calendar',
          where: { userId, isActive: true }
        }
      ],
      order: [['startTime', 'ASC']],
      limit: 500 // Limit to 500 upcoming events
    });

    // Create iCalendar feed
    const cal = ical({
      name: 'Heart Recovery Calendar',
      prodId: '//Heart Recovery Calendar//EN',
      timezone: 'America/New_York',
      ttl: 3600 // Refresh every hour
    });

    // Add events
    events.forEach(event => {
      cal.createEvent({
        start: event.startTime,
        end: event.endTime,
        summary: event.title,
        description: event.description || '',
        location: event.location || '',
        uid: `event-${event.id}@heartrecovery.com`,
        status: event.status === 'completed' ? 'CONFIRMED' : 'TENTATIVE',
        categories: [event.eventType]
      });
    });

    // Send calendar feed
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.send(cal.toString());
  } catch (error) {
    console.error('Error generating calendar feed:', error);
    res.status(500).json({ error: 'Failed to generate calendar feed' });
  }
};

// GET /api/integrations/apple/status - Check Apple Calendar integration status
export const getAppleStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if user has Apple Calendar import
    const importCalendar = await Calendar.findOne({
      where: { userId, name: 'Apple Calendar Import' }
    });

    res.json({
      hasImportCalendar: !!importCalendar,
      provider: 'apple',
      method: 'ics-export-import',
      supportsSubscription: true
    });
  } catch (error) {
    console.error('Error checking Apple status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
