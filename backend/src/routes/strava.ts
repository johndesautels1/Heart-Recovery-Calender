import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { stravaService, syncStravaData } from '../services/stravaService';
import DeviceConnection from '../models/DeviceConnection';
import DeviceSyncLog from '../models/DeviceSyncLog';

console.log('🚀 STRAVA ROUTES MODULE LOADED - UPDATED VERSION');

const router = express.Router();

console.log('📍 Registering Strava routes...');

// Initiate Strava OAuth flow
router.get('/auth', authenticateToken, async (req: Request, res: Response) => {
  console.log('🔵 AUTH ROUTE CALLED');
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const authUrl = stravaService.getAuthorizationUrl(userId);
    res.json({
      success: true,
      data: { authUrl },
    });
  } catch (error) {
    console.error('Error initiating Strava auth:', error);
    res.status(500).json({ error: 'Failed to initiate authorization' });
  }
});

// OAuth callback handler
console.log('⚡ DEFINING CALLBACK ROUTE NOW');
router.get('/callback', async (req: Request, res: Response) => {
  console.log('=== STRAVA CALLBACK HANDLER STARTED ===');
  console.log('Query params:', req.query);

  try {
    const { code, state, error, scope } = req.query;
    console.log('Parsed params - code:', code, 'state:', state, 'error:', error);

    if (error) {
      console.error('Strava OAuth error:', error);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/devices?error=strava_auth_failed`);
    }

    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/devices?error=missing_parameters`);
    }

    // Decode state to get user ID
    const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    const userId = stateData.userId;

    // Exchange code for token
    const tokenData = await stravaService.exchangeCodeForToken(code as string);

    // Check if device connection already exists
    let device = await DeviceConnection.findOne({
      where: {
        userId,
        deviceType: 'strava',
        stravaAthleteId: tokenData.athlete.id.toString(),
      },
    });

    const deviceName = `Strava - ${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`;

    if (device) {
      // Update existing connection
      device.deviceName = deviceName;
      device.accessToken = tokenData.access_token;
      device.refreshToken = tokenData.refresh_token;
      device.tokenExpiresAt = new Date(tokenData.expires_at * 1000);
      device.syncStatus = 'active';
      device.syncError = undefined;
      await device.save();
    } else {
      // Create new device connection
      device = await DeviceConnection.create({
        userId,
        deviceType: 'strava',
        deviceName,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: new Date(tokenData.expires_at * 1000),
        stravaAthleteId: tokenData.athlete.id.toString(),
        syncStatus: 'active',
        autoSync: true,
        syncExercises: true,
        syncHeartRate: true,
        syncSteps: false,
        syncCalories: true,
      });
    }

    // Trigger initial sync
    const syncLog = await DeviceSyncLog.create({
      deviceConnectionId: device.id,
      syncType: 'manual',
      dataType: 'all',
      status: 'pending',
      startedAt: new Date(),
    });

    // Run sync in background
    syncStravaData(device, syncLog).catch(error => {
      console.error('Error in initial Strava sync:', error);
    });

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/devices?success=strava_connected`);
  } catch (error) {
    console.error('Error in Strava callback:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/devices?error=callback_failed`);
  }
});

// Deauthorize webhook (when user disconnects from Strava's side)
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { object_type, aspect_type, object_id, owner_id, subscription_id, event_time } = req.body;

    console.log('Strava webhook received:', req.body);

    // Handle deauthorization
    if (aspect_type === 'delete' && object_type === 'athlete') {
      const device = await DeviceConnection.findOne({
        where: {
          deviceType: 'strava',
          stravaAthleteId: owner_id.toString(),
        },
      });

      if (device) {
        device.syncStatus = 'disconnected';
        device.syncError = 'User deauthorized the connection from Strava';
        await device.save();
      }
    }

    // Handle new activities
    if (aspect_type === 'create' && object_type === 'activity') {
      const device = await DeviceConnection.findOne({
        where: {
          deviceType: 'strava',
          stravaAthleteId: owner_id.toString(),
          syncStatus: 'active',
        },
      });

      if (device && device.autoSync && device.syncExercises) {
        const syncLog = await DeviceSyncLog.create({
          deviceConnectionId: device.id,
          syncType: 'webhook',
          dataType: 'exercise',
          status: 'pending',
          startedAt: new Date(),
        });

        // Trigger sync in background
        syncStravaData(device, syncLog).catch(error => {
          console.error('Error in webhook Strava sync:', error);
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error handling Strava webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Webhook verification (required by Strava)
router.get('/webhook', async (req: Request, res: Response) => {
  try {
    const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': verifyToken } = req.query;

    if (mode === 'subscribe' && challenge) {
      console.log('Strava webhook verification successful');
      res.json({ 'hub.challenge': challenge });
    } else {
      res.status(400).json({ error: 'Invalid verification request' });
    }
  } catch (error) {
    console.error('Error in Strava webhook verification:', error);
    res.status(500).json({ error: 'Webhook verification failed' });
  }
});

export default router;
