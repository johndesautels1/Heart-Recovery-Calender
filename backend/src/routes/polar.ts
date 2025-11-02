import express, { Response } from 'express';
import { authenticateToken, Request } from '../middleware/auth';
import { polarService, syncPolarData } from '../services/polarService';
import DeviceConnection from '../models/DeviceConnection';
import DeviceSyncLog from '../models/DeviceSyncLog';

const router = express.Router();

// Initiate Polar OAuth flow
router.get('/auth', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const authUrl = polarService.getAuthorizationUrl(userId);
    res.json({
      success: true,
      data: { authUrl },
    });
  } catch (error) {
    console.error('Error initiating Polar auth:', error);
    res.status(500).json({ error: 'Failed to initiate authorization' });
  }
});

// OAuth callback handler
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error('Polar OAuth error:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/settings/devices?error=polar_auth_failed`);
    }

    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings/devices?error=missing_parameters`);
    }

    // Decode state to get user ID
    const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    const userId = stateData.userId;

    // Exchange code for token
    const tokenData = await polarService.exchangeCodeForToken(code as string);

    // Register user with AccessLink
    await polarService.registerUser(tokenData.access_token, tokenData.x_user_id);

    // Check if device connection already exists
    let device = await DeviceConnection.findOne({
      where: {
        userId,
        deviceType: 'polar',
        polarUserId: tokenData.x_user_id,
      },
    });

    if (device) {
      // Update existing connection
      device.accessToken = tokenData.access_token;
      device.tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
      device.syncStatus = 'active';
      device.syncError = undefined;
      await device.save();
    } else {
      // Create new device connection
      device = await DeviceConnection.create({
        userId,
        deviceType: 'polar',
        deviceName: 'Polar H10',
        accessToken: tokenData.access_token,
        tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        polarUserId: tokenData.x_user_id,
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
    syncPolarData(device, syncLog).catch(error => {
      console.error('Error in initial Polar sync:', error);
    });

    res.redirect(`${process.env.FRONTEND_URL}/settings/devices?success=polar_connected`);
  } catch (error) {
    console.error('Error in Polar callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/settings/devices?error=callback_failed`);
  }
});

// Webhook handler for real-time updates
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { event, user_id, url } = req.body;

    console.log('Polar webhook received:', { event, user_id, url });

    // Find device connection by Polar user ID
    const device = await DeviceConnection.findOne({
      where: {
        deviceType: 'polar',
        polarUserId: user_id,
        syncStatus: 'active',
      },
    });

    if (!device) {
      console.warn('No active device found for Polar user:', user_id);
      return res.status(404).json({ error: 'Device not found' });
    }

    // Verify webhook secret if configured
    if (device.webhookSecret) {
      const signature = req.headers['polar-webhook-signature'] as string;
      // TODO: Implement signature verification
    }

    // Handle exercise available event
    if (event === 'EXERCISE' && device.autoSync && device.syncExercises) {
      const syncLog = await DeviceSyncLog.create({
        deviceConnectionId: device.id,
        syncType: 'webhook',
        dataType: 'exercise',
        status: 'pending',
        startedAt: new Date(),
      });

      // Trigger sync in background
      syncPolarData(device, syncLog).catch(error => {
        console.error('Error in webhook Polar sync:', error);
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error handling Polar webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
