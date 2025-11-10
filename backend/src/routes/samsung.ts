import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
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
        syncSleep: true,
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

// Manual sync trigger
router.post('/sync', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find the user's Samsung device connection
    const device = await DeviceConnection.findOne({
      where: {
        userId,
        deviceType: 'samsung_health',
        syncStatus: 'active',
      },
    });

    if (!device) {
      return res.status(404).json({ error: 'Samsung device not connected' });
    }

    // Create sync log
    const syncLog = await DeviceSyncLog.create({
      deviceConnectionId: device.id,
      syncType: 'manual',
      dataType: 'all',
      status: 'pending',
      startedAt: new Date(),
    });

    // Trigger sync in background
    syncSamsungData(device, syncLog)
      .then(() => {
        console.log('Samsung sync completed successfully');
      })
      .catch(error => {
        console.error('Error in Samsung sync:', error);
      });

    res.json({
      success: true,
      message: 'Sync initiated',
      data: { syncLogId: syncLog.id },
    });
  } catch (error) {
    console.error('Error triggering Samsung sync:', error);
    res.status(500).json({ error: 'Failed to initiate sync' });
  }
});

// Update sync settings
router.patch('/settings', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { autoSync, syncExercises, syncHeartRate, syncSteps, syncCalories, syncSleep } = req.body;

    // Find the user's Samsung device connection
    const device = await DeviceConnection.findOne({
      where: {
        userId,
        deviceType: 'samsung_health',
      },
    });

    if (!device) {
      return res.status(404).json({ error: 'Samsung device not connected' });
    }

    // Update settings
    if (autoSync !== undefined) device.autoSync = autoSync;
    if (syncExercises !== undefined) device.syncExercises = syncExercises;
    if (syncHeartRate !== undefined) device.syncHeartRate = syncHeartRate;
    if (syncSteps !== undefined) device.syncSteps = syncSteps;
    if (syncCalories !== undefined) device.syncCalories = syncCalories;
    if (syncSleep !== undefined) device.syncSleep = syncSleep;

    await device.save();

    res.json({
      success: true,
      message: 'Settings updated',
      data: {
        autoSync: device.autoSync,
        syncExercises: device.syncExercises,
        syncHeartRate: device.syncHeartRate,
        syncSteps: device.syncSteps,
        syncCalories: device.syncCalories,
        syncSleep: device.syncSleep,
      },
    });
  } catch (error) {
    console.error('Error updating Samsung settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get device connection status
router.get('/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const device = await DeviceConnection.findOne({
      where: {
        userId,
        deviceType: 'samsung_health',
      },
    });

    if (!device) {
      return res.json({
        success: true,
        data: { connected: false },
      });
    }

    res.json({
      success: true,
      data: {
        connected: true,
        deviceName: device.deviceName,
        syncStatus: device.syncStatus,
        lastSyncedAt: device.lastSyncedAt,
        syncError: device.syncError,
        autoSync: device.autoSync,
        syncExercises: device.syncExercises,
        syncHeartRate: device.syncHeartRate,
        syncSteps: device.syncSteps,
        syncCalories: device.syncCalories,
        syncSleep: device.syncSleep,
      },
    });
  } catch (error) {
    console.error('Error fetching Samsung device status:', error);
    res.status(500).json({ error: 'Failed to fetch device status' });
  }
});

export default router;
