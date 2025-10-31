import { Request, Response } from 'express';
import DeviceConnection from '../models/DeviceConnection';
import DeviceSyncLog from '../models/DeviceSyncLog';

export const deviceConnectionController = {
  // Get all device connections for a user
  async getUserDevices(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const devices = await DeviceConnection.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
      });

      res.json({
        success: true,
        data: devices,
      });
    } catch (error) {
      console.error('Error fetching devices:', error);
      res.status(500).json({ error: 'Failed to fetch devices' });
    }
  },

  // Get a specific device connection
  async getDevice(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id: deviceId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const device = await DeviceConnection.findOne({
        where: { id: deviceId, userId },
      });

      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      res.json({
        success: true,
        data: device,
      });
    } catch (error) {
      console.error('Error fetching device:', error);
      res.status(500).json({ error: 'Failed to fetch device' });
    }
  },

  // Delete a device connection
  async deleteDevice(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id: deviceId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const device = await DeviceConnection.findOne({
        where: { id: deviceId, userId },
      });

      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      await device.destroy();

      res.json({
        success: true,
        message: 'Device disconnected successfully',
      });
    } catch (error) {
      console.error('Error deleting device:', error);
      res.status(500).json({ error: 'Failed to delete device' });
    }
  },

  // Update device settings
  async updateDeviceSettings(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id: deviceId } = req.params;
      const { autoSync, syncExercises, syncHeartRate, syncSteps, syncCalories } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const device = await DeviceConnection.findOne({
        where: { id: deviceId, userId },
      });

      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      // Update settings
      if (autoSync !== undefined) device.autoSync = autoSync;
      if (syncExercises !== undefined) device.syncExercises = syncExercises;
      if (syncHeartRate !== undefined) device.syncHeartRate = syncHeartRate;
      if (syncSteps !== undefined) device.syncSteps = syncSteps;
      if (syncCalories !== undefined) device.syncCalories = syncCalories;

      await device.save();

      res.json({
        success: true,
        data: device,
      });
    } catch (error) {
      console.error('Error updating device settings:', error);
      res.status(500).json({ error: 'Failed to update device settings' });
    }
  },

  // Get sync history for a device
  async getSyncHistory(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id: deviceId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify device belongs to user
      const device = await DeviceConnection.findOne({
        where: { id: deviceId, userId },
      });

      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      const syncLogs = await DeviceSyncLog.findAll({
        where: { deviceConnectionId: deviceId },
        order: [['startedAt', 'DESC']],
        limit,
      });

      res.json({
        success: true,
        data: syncLogs,
      });
    } catch (error) {
      console.error('Error fetching sync history:', error);
      res.status(500).json({ error: 'Failed to fetch sync history' });
    }
  },

  // Manually trigger a sync for a device
  async triggerSync(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id: deviceId } = req.params;
      const { dataType } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const device = await DeviceConnection.findOne({
        where: { id: deviceId, userId },
      });

      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      if (device.syncStatus === 'disconnected') {
        return res.status(400).json({ error: 'Device is disconnected' });
      }

      // Create sync log entry
      const syncLog = await DeviceSyncLog.create({
        deviceConnectionId: device.id,
        syncType: 'manual',
        dataType: dataType || 'all',
        status: 'pending',
        startedAt: new Date(),
      });

      // Import sync service dynamically based on device type
      // The sync services will find the patient using userId and populate patientId correctly
      let syncResult;
      if (device.deviceType === 'polar') {
        const { syncPolarData } = await import('../services/polarService');
        syncResult = await syncPolarData(device, syncLog);
      } else if (device.deviceType === 'samsung_health') {
        const { syncSamsungData } = await import('../services/samsungService');
        syncResult = await syncSamsungData(device, syncLog);
      } else if (device.deviceType === 'strava') {
        const { syncStravaData } = await import('../services/stravaService');
        syncResult = await syncStravaData(device, syncLog);
      } else {
        return res.status(400).json({ error: 'Unsupported device type' });
      }

      res.json({
        success: true,
        data: syncResult,
      });
    } catch (error) {
      console.error('Error triggering sync:', error);
      res.status(500).json({ error: 'Failed to trigger sync' });
    }
  },

  // Get latest real-time vitals from connected devices
  async getLatestVitals(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Import VitalsSample model
      const VitalsSample = (await import('../models/VitalsSample')).default;

      // Get the most recent vitals reading from devices (within last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const latestVitals = await VitalsSample.findOne({
        where: {
          userId,
          source: 'device',
          timestamp: {
            [require('sequelize').Op.gte]: fiveMinutesAgo,
          },
        },
        order: [['timestamp', 'DESC']],
      });

      if (!latestVitals) {
        // No recent device data available
        return res.status(404).json({
          success: false,
          error: 'No recent device vitals available',
        });
      }

      // Format response for frontend
      const response: any = {
        timestamp: latestVitals.timestamp,
        source: latestVitals.deviceId || 'device',
      };

      if (latestVitals.heartRate) {
        response.heartRate = latestVitals.heartRate;
      }

      if (latestVitals.bloodPressureSystolic && latestVitals.bloodPressureDiastolic) {
        response.bloodPressure = {
          systolic: latestVitals.bloodPressureSystolic,
          diastolic: latestVitals.bloodPressureDiastolic,
        };
      }

      if (latestVitals.respiratoryRate) {
        response.respirationRate = latestVitals.respiratoryRate;
      }

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      console.error('Error fetching latest vitals:', error);
      res.status(500).json({ error: 'Failed to fetch latest vitals' });
    }
  },
};
