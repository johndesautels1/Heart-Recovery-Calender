import axios from 'axios';
import DeviceConnection from '../models/DeviceConnection';
import DeviceSyncLog from '../models/DeviceSyncLog';
import VitalsSample from '../models/VitalsSample';
import Patient from '../models/Patient';

// Fitbit API configuration
const FITBIT_CLIENT_ID = process.env.FITBIT_CLIENT_ID || '';
const FITBIT_CLIENT_SECRET = process.env.FITBIT_CLIENT_SECRET || '';
const FITBIT_REDIRECT_URI = process.env.FITBIT_REDIRECT_URI || 'http://localhost:4000/api/fitbit/callback';

interface FitbitTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
  user_id: string;
}

interface FitbitHeartRateData {
  'activities-heart': Array<{
    dateTime: string;
    value: {
      customHeartRateZones: any[];
      heartRateZones: Array<{
        caloriesOut: number;
        max: number;
        min: number;
        minutes: number;
        name: string;
      }>;
      restingHeartRate?: number;
    };
  }>;
  'activities-heart-intraday': {
    dataset: Array<{
      time: string;
      value: number;
    }>;
    datasetInterval: number;
    datasetType: string;
  };
}

interface FitbitHRVData {
  hrv: Array<{
    value: {
      dailyRmssd: number;
      deepRmssd: number;
    };
    dateTime: string;
  }>;
}

interface FitbitActivityData {
  activities: Array<{
    activityId: number;
    activityParentId: number;
    activityParentName: string;
    calories: number;
    description: string;
    distance: number;
    duration: number;
    hasActiveZoneMinutes: boolean;
    hasStartTime: boolean;
    isFavorite: boolean;
    lastModified: string;
    logId: number;
    logType: string;
    manualValuesSpecified: {
      calories: boolean;
      distance: boolean;
      steps: boolean;
    };
    name: string;
    originalDuration: number;
    originalStartTime: string;
    startDate: string;
    startTime: string;
    steps: number;
    tcxLink: string;
  }>;
}

export const fitbitService = {
  // Generate OAuth authorization URL
  getAuthorizationUrl(userId: number): string {
    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');

    const params = new URLSearchParams({
      client_id: FITBIT_CLIENT_ID,
      response_type: 'code',
      redirect_uri: FITBIT_REDIRECT_URI,
      scope: 'activity heartrate profile sleep weight',
      state,
    });

    return `https://www.fitbit.com/oauth2/authorize?${params.toString()}`;
  },

  // Exchange authorization code for access token
  async exchangeCodeForToken(code: string): Promise<FitbitTokenResponse> {
    try {
      const auth = Buffer.from(`${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`).toString('base64');

      const response = await axios.post(
        'https://api.fitbit.com/oauth2/token',
        new URLSearchParams({
          client_id: FITBIT_CLIENT_ID,
          grant_type: 'authorization_code',
          redirect_uri: FITBIT_REDIRECT_URI,
          code,
        }),
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error exchanging Fitbit code for token:', error.response?.data || error.message);
      throw new Error('Failed to exchange Fitbit authorization code');
    }
  },

  // Refresh access token
  async refreshAccessToken(refreshToken: string): Promise<FitbitTokenResponse> {
    try {
      const auth = Buffer.from(`${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`).toString('base64');

      const response = await axios.post(
        'https://api.fitbit.com/oauth2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error refreshing Fitbit token:', error.response?.data || error.message);
      throw new Error('Failed to refresh Fitbit access token');
    }
  },

  // Get user's heart rate data
  async getHeartRateData(accessToken: string, date: string): Promise<FitbitHeartRateData> {
    try {
      const response = await axios.get(
        `https://api.fitbit.com/1/user/-/activities/heart/date/${date}/1d/1min.json`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error fetching Fitbit heart rate data:', error.response?.data || error.message);
      throw new Error('Failed to fetch Fitbit heart rate data');
    }
  },

  // Get user's HRV data
  async getHRVData(accessToken: string, date: string): Promise<FitbitHRVData> {
    try {
      const response = await axios.get(
        `https://api.fitbit.com/1/user/-/hrv/date/${date}.json`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error fetching Fitbit HRV data:', error.response?.data || error.message);
      throw new Error('Failed to fetch Fitbit HRV data');
    }
  },

  // Get user's activities
  async getActivities(accessToken: string, date: string): Promise<FitbitActivityData> {
    try {
      const response = await axios.get(
        `https://api.fitbit.com/1/user/-/activities/date/${date}.json`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error fetching Fitbit activities:', error.response?.data || error.message);
      throw new Error('Failed to fetch Fitbit activities');
    }
  },

  // Create or update device connection
  async createOrUpdateConnection(
    userId: number,
    tokenData: FitbitTokenResponse
  ): Promise<DeviceConnection> {
    const tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    const [connection] = await DeviceConnection.findOrCreate({
      where: {
        userId,
        deviceType: 'fitbit',
      },
      defaults: {
        userId,
        deviceType: 'fitbit',
        deviceName: 'Fitbit Device',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt,
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
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiresAt,
      syncStatus: 'active',
      syncError: null,
    });

    return connection;
  },

  // Sync heart rate data
  async syncHeartRateData(deviceConnection: DeviceConnection): Promise<number> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get heart rate data for today and yesterday
      const [todayData, yesterdayData] = await Promise.all([
        this.getHeartRateData(deviceConnection.accessToken!, today),
        this.getHeartRateData(deviceConnection.accessToken!, yesterday),
      ]);

      let recordsCreated = 0;

      // Process today's data
      if (todayData['activities-heart']?.[0]?.value?.restingHeartRate) {
        const restingHR = todayData['activities-heart'][0].value.restingHeartRate;

        await VitalsSample.create({
          userId: deviceConnection.userId,
          heartRate: restingHR,
          source: 'device',
          deviceId: deviceConnection.deviceType,
          timestamp: new Date(today + 'T08:00:00Z'), // Morning reading
          notes: 'Resting heart rate from Fitbit',
        });

        recordsCreated++;
      }

      // Process yesterday's data
      if (yesterdayData['activities-heart']?.[0]?.value?.restingHeartRate) {
        const restingHR = yesterdayData['activities-heart'][0].value.restingHeartRate;

        await VitalsSample.create({
          userId: deviceConnection.userId,
          heartRate: restingHR,
          source: 'device',
          deviceId: deviceConnection.deviceType,
          timestamp: new Date(yesterday + 'T08:00:00Z'),
          notes: 'Resting heart rate from Fitbit',
        });

        recordsCreated++;
      }

      return recordsCreated;
    } catch (error: any) {
      console.error('Error syncing Fitbit heart rate data:', error.message);
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

      // Sync heart rate data
      if (deviceConnection.syncHeartRate) {
        const hrRecords = await this.syncHeartRateData(deviceConnection);
        totalRecords += hrRecords;
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

export default fitbitService;
