import axios from 'axios';
import DeviceConnection from '../models/DeviceConnection';
import DeviceSyncLog from '../models/DeviceSyncLog';
import VitalsSample from '../models/VitalsSample';
import ExerciseLog from '../models/ExerciseLog';

// Garmin API configuration
const GARMIN_CONSUMER_KEY = process.env.GARMIN_CONSUMER_KEY || '';
const GARMIN_CONSUMER_SECRET = process.env.GARMIN_CONSUMER_SECRET || '';
const GARMIN_ACCESS_TOKEN_URL = 'https://connectapi.garmin.com/oauth-service/oauth/access_token';
const GARMIN_REQUEST_TOKEN_URL = 'https://connectapi.garmin.com/oauth-service/oauth/request_token';
const GARMIN_AUTHORIZE_URL = 'https://connect.garmin.com/oauthConfirm';
const GARMIN_REDIRECT_URI = process.env.GARMIN_REDIRECT_URI || 'http://localhost:4000/api/garmin/callback';

interface GarminHeartRateData {
  userMetrics: Array<{
    calendarDate: string;
    restingHeartRate: number;
    maxHeartRate?: number;
    minHeartRate?: number;
  }>;
}

interface GarminHRVData {
  hrvSummaries: Array<{
    calendarDate: string;
    weeklyAvg: number;
    lastNightAvg: number;
    lastNight5MinHigh: number;
    status: string;
  }>;
}

interface GarminActivity {
  activityId: number;
  activityName: string;
  description: string;
  startTimeLocal: string;
  startTimeGMT: string;
  activityType: {
    typeId: number;
    typeKey: string;
    parentTypeId: number;
  };
  distance: number; // meters
  duration: number; // seconds
  elapsedDuration: number;
  movingDuration: number;
  averageHR: number;
  maxHR: number;
  averageSpeed: number; // m/s
  maxSpeed: number;
  calories: number;
  bmrCalories: number;
  averageBikingCadenceInRevPerMinute?: number;
  averageRunningCadenceInStepsPerMinute?: number;
  steps?: number;
}

export const garminService = {
  // Generate OAuth 1.0a authorization URL
  getAuthorizationUrl(userId: number): string {
    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');

    // Note: Garmin uses OAuth 1.0a which requires request token flow
    // This is a placeholder - full implementation requires crypto signing
    const params = new URLSearchParams({
      oauth_callback: GARMIN_REDIRECT_URI,
      state,
    });

    return `${GARMIN_AUTHORIZE_URL}?${params.toString()}`;
  },

  // Get user's heart rate data
  async getHeartRateData(accessToken: string, date: string): Promise<GarminHeartRateData> {
    try {
      const response = await axios.get(
        `https://apis.garmin.com/wellness-api/rest/user/metrics`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          params: {
            uploadStartTimeInSeconds: Math.floor(new Date(date).getTime() / 1000),
            uploadEndTimeInSeconds: Math.floor(new Date(date).getTime() / 1000) + 86400,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error fetching Garmin heart rate data:', error.response?.data || error.message);
      throw new Error('Failed to fetch Garmin heart rate data');
    }
  },

  // Get user's HRV data
  async getHRVData(accessToken: string, date: string): Promise<GarminHRVData> {
    try {
      const response = await axios.get(
        `https://apis.garmin.com/wellness-api/rest/hrv`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          params: {
            date,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error fetching Garmin HRV data:', error.response?.data || error.message);
      throw new Error('Failed to fetch Garmin HRV data');
    }
  },

  // Get user's activities
  async getActivities(accessToken: string, startDate: string, limit: number = 20): Promise<GarminActivity[]> {
    try {
      const response = await axios.get(
        `https://apis.garmin.com/wellness-api/rest/activities`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          params: {
            uploadStartTimeInSeconds: Math.floor(new Date(startDate).getTime() / 1000),
            limit,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error fetching Garmin activities:', error.response?.data || error.message);
      throw new Error('Failed to fetch Garmin activities');
    }
  },

  // Create or update device connection
  async createOrUpdateConnection(
    userId: number,
    accessToken: string,
    accessTokenSecret: string
  ): Promise<DeviceConnection> {
    const [connection] = await DeviceConnection.findOrCreate({
      where: {
        userId,
        deviceType: 'garmin',
      },
      defaults: {
        userId,
        deviceType: 'garmin',
        deviceName: 'Garmin Connect',
        accessToken,
        refreshToken: accessTokenSecret, // Storing token secret in refreshToken field
        syncStatus: 'active',
        autoSync: true,
        syncHeartRate: true,
        syncExercises: true,
        syncSteps: true,
        syncCalories: true,
      },
    });

    // Update if already exists
    await connection.update({
      accessToken,
      refreshToken: accessTokenSecret,
      syncStatus: 'active',
      syncError: null,
    });

    return connection;
  },

  // Sync heart rate and HRV data
  async syncVitalsData(deviceConnection: DeviceConnection): Promise<number> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get data for last 2 days
      const [todayHR, yesterdayHR, todayHRV, yesterdayHRV] = await Promise.all([
        this.getHeartRateData(deviceConnection.accessToken!, today),
        this.getHeartRateData(deviceConnection.accessToken!, yesterday),
        this.getHRVData(deviceConnection.accessToken!, today),
        this.getHRVData(deviceConnection.accessToken!, yesterday),
      ]);

      let recordsCreated = 0;

      // Process heart rate data
      for (const hrData of [...todayHR.userMetrics, ...yesterdayHR.userMetrics]) {
        if (hrData.restingHeartRate) {
          await VitalsSample.create({
            userId: deviceConnection.userId,
            heartRate: hrData.restingHeartRate,
            source: 'device',
            deviceId: deviceConnection.deviceType,
            timestamp: new Date(hrData.calendarDate + 'T08:00:00Z'),
            notes: 'Resting heart rate from Garmin Connect',
          });

          recordsCreated++;
        }
      }

      // Process HRV data
      for (const hrvData of [...todayHRV.hrvSummaries, ...yesterdayHRV.hrvSummaries]) {
        if (hrvData.lastNightAvg) {
          // Find or create vitals record for this date
          // Create HRV record
          await VitalsSample.create({
            userId: deviceConnection.userId,
            rmssd: hrvData.lastNightAvg,
            source: 'device',
            deviceId: deviceConnection.deviceType,
            timestamp: new Date(hrvData.calendarDate + 'T08:00:00Z'),
            notes: 'HRV from Garmin Connect',
          });

          recordsCreated++;
        }
      }

      return recordsCreated;
    } catch (error: any) {
      console.error('Error syncing Garmin vitals data:', error.message);
      throw error;
    }
  },

  // Full sync function
  async syncData(deviceConnection: DeviceConnection): Promise<DeviceSyncLog> {
    const syncLog = await DeviceSyncLog.create({
      deviceConnectionId: deviceConnection.id,
      syncType: 'manual',
      dataType: 'all',
      status: 'pending',
      startedAt: new Date(),
    });

    try {
      let totalRecords = 0;

      // Sync vitals (heart rate + HRV)
      if (deviceConnection.syncHeartRate) {
        const vitalsRecords = await this.syncVitalsData(deviceConnection);
        totalRecords += vitalsRecords;
      }

      // Update device connection
      await deviceConnection.update({
        lastSyncedAt: new Date(),
        syncStatus: 'active',
        syncError: null,
      });

      // Update sync log
      await syncLog.update({
        status: 'success',
        completedAt: new Date(),
        recordsCreated: totalRecords,
      });

      return syncLog;
    } catch (error: any) {
      await syncLog.update({
        status: 'error',
        completedAt: new Date(),
        errorMessage: error.message,
      });

      await deviceConnection.update({
        syncStatus: 'error',
        syncError: error.message,
      });

      throw error;
    }
  },
};

export default garminService;
