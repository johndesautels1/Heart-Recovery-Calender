import { Request, Response } from 'express';
import { google } from 'googleapis';
import CalendarEvent from '../models/CalendarEvent';
import Calendar from '../models/Calendar';
import { Op } from 'sequelize';

// Initialize Google OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// GET /api/integrations/google/auth - Initiate Google OAuth flow
export const initiateGoogleAuth = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId.toString() // Pass userId to callback
    });

    res.json({ authUrl });
  } catch (error) {
    console.error('Error initiating Google auth:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/integrations/google/oauth/callback - Handle OAuth callback
export const handleGoogleCallback = async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    const userId = state ? parseInt(state as string) : null;

    if (!code || !userId) {
      return res.status(400).json({ error: 'Invalid callback parameters' });
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    // TODO: Store tokens in database (requires ExternalIntegration model)
    // await ExternalIntegration.upsert({
    //   userId,
    //   provider: 'google',
    //   accessToken: tokens.access_token,
    //   refreshToken: tokens.refresh_token,
    //   expiresAt: new Date(tokens.expiry_date || Date.now() + 3600000)
    // });

    res.send(`
      <html>
        <body>
          <h1>Google Calendar Connected!</h1>
          <p>You can close this window and return to the app.</p>
          <script>window.close();</script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error handling Google callback:', error);
    res.status(500).json({ error: 'Failed to connect Google Calendar' });
  }
};

// POST /api/integrations/google/sync - Sync events from Google Calendar
export const syncFromGoogle = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // TODO: Retrieve stored tokens from database
    // const integration = await ExternalIntegration.findOne({
    //   where: { userId, provider: 'google' }
    // });
    // if (!integration) {
    //   return res.status(404).json({ error: 'Google Calendar not connected' });
    // }
    // oauth2Client.setCredentials({
    //   access_token: integration.accessToken,
    //   refresh_token: integration.refreshToken
    // });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Fetch events from Google Calendar (next 30 days)
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: thirtyDaysFromNow.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    const googleEvents = response.data.items || [];

    // Find or create a calendar for Google imports
    let importCalendar = await Calendar.findOne({
      where: { userId, name: 'Google Calendar Import' }
    });

    if (!importCalendar) {
      importCalendar = await Calendar.create({
        userId,
        name: 'Google Calendar Import',
        type: 'appointment',
        color: '#4285F4',
        isActive: true
      });
    }

    // Import events
    let importedCount = 0;
    for (const gEvent of googleEvents) {
      const startTime = gEvent.start?.dateTime || gEvent.start?.date;
      const endTime = gEvent.end?.dateTime || gEvent.end?.date;

      if (!startTime) continue;

      // Check if event already exists (by external ID)
      const existingEvent = await CalendarEvent.findOne({
        where: {
          calendarId: importCalendar.id,
          externalId: gEvent.id
        }
      });

      if (!existingEvent) {
        await CalendarEvent.create({
          calendarId: importCalendar.id,
          title: gEvent.summary || 'Untitled Event',
          description: gEvent.description,
          startTime: new Date(startTime),
          endTime: endTime ? new Date(endTime) : new Date(startTime),
          location: gEvent.location,
          eventType: 'appointment',
          status: 'scheduled',
          externalId: gEvent.id,
          externalProvider: 'google'
        });
        importedCount++;
      }
    }

    res.json({
      success: true,
      imported: importedCount,
      total: googleEvents.length,
      message: `Imported ${importedCount} new events from Google Calendar`
    });
  } catch (error) {
    console.error('Error syncing from Google Calendar:', error);
    res.status(500).json({ error: 'Failed to sync from Google Calendar' });
  }
};

// POST /api/integrations/google/export - Export event to Google Calendar
export const exportToGoogle = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { eventId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Find the event
    const event = await CalendarEvent.findOne({
      where: { id: eventId },
      include: [{ association: 'calendar', where: { userId } }]
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // TODO: Retrieve stored tokens and set credentials
    // const integration = await ExternalIntegration.findOne({...});
    // oauth2Client.setCredentials({...});

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Create event in Google Calendar
    const googleEvent = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: event.title,
        description: event.description,
        location: event.location,
        start: {
          dateTime: event.startTime.toISOString(),
          timeZone: 'America/New_York'
        },
        end: {
          dateTime: event.endTime.toISOString(),
          timeZone: 'America/New_York'
        }
      }
    });

    // Update our event with Google Calendar ID
    await event.update({
      externalId: googleEvent.data.id,
      externalProvider: 'google'
    });

    res.json({
      success: true,
      message: 'Event exported to Google Calendar',
      googleEventId: googleEvent.data.id,
      googleEventLink: googleEvent.data.htmlLink
    });
  } catch (error) {
    console.error('Error exporting to Google Calendar:', error);
    res.status(500).json({ error: 'Failed to export to Google Calendar' });
  }
};

// DELETE /api/integrations/google/disconnect - Disconnect Google Calendar
export const disconnectGoogle = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // TODO: Delete integration from database
    // await ExternalIntegration.destroy({
    //   where: { userId, provider: 'google' }
    // });

    res.json({
      success: true,
      message: 'Google Calendar disconnected'
    });
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/integrations/google/status - Check connection status
export const getGoogleStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // TODO: Check if integration exists in database
    // const integration = await ExternalIntegration.findOne({
    //   where: { userId, provider: 'google' }
    // });

    res.json({
      connected: false, // Set to true if integration exists
      provider: 'google',
      // lastSync: integration?.lastSyncedAt
    });
  } catch (error) {
    console.error('Error checking Google status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
