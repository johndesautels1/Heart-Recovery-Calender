import express, { Response } from 'express';
import { authenticateToken, Request } from '../middleware/auth';
import { samsungService, syncSamsungData } from '../services/samsungService';
import DeviceConnection from '../models/DeviceConnection';
import DeviceSyncLog from '../models/DeviceSyncLog';

const router = express.Router();

// Initiate Samsung Health OAuth flow
router.get('/auth', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const authUrl = samsungService.getAuthorizationUrl(userId);
    res.json({
      success: true,
      data: { authUrl },
    });
  } catch (error) {
    console.error('Error initiating Samsung auth:', error);
    res.status(500).json({ error: 'Failed to initiate authorization' });
  }
});

// OAuth callback handler
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error('Samsung OAuth error:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/settings/devices?error=samsung_auth_failed`);
    }

    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings/devices?error=missing_parameters`);
    }

    // Decode state to get user ID
    const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    const userId = stateData.userId;

    // Exchange code for token
    const tokenData = await samsungService.exchangeCodeForToken(code as string);

    // Check if device connection already exists
    let device = await DeviceConnection.findOne({
      where: {
        userId,
        deviceType: 'samsung_health',
        samsungUserId: tokenData.user_id,
      },
    });

    if (device) {
      // Update existing connection
      device.accessToken = tokenData.access_token;
      if (tokenData.refresh_token) {
        device.refreshToken = tokenData.refresh_token;
      }
      device.tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
      device.syncStatus = 'active';
      device.syncError = undefined;
      await device.save();
    } else {
      // Create new device connection
      device = await DeviceConnection.create({
        userId,
        deviceType: 'samsung_health',
        deviceName: 'Samsung Galaxy Watch 8',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        samsungUserId: tokenData.user_id,
        syncStatus: 'active',
        autoSync: true,
        syncExercises: true,
        syncHeartRate: true,
        syncSteps: true,
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
    syncSamsungData(device, syncLog).catch(error => {
      console.error('Error in initial Samsung sync:', error);
    });

    res.redirect(`${process.env.FRONTEND_URL}/settings/devices?success=samsung_connected`);
  } catch (error) {
    console.error('Error in Samsung callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/settings/devices?error=callback_failed`);
  }
});

export default router;
