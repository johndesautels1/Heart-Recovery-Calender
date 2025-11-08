import axios from 'axios';
import { google } from 'googleapis';
import DeviceConnection from '../models/DeviceConnection';
import DeviceSyncLog from '../models/DeviceSyncLog';
import VitalsSample from '../models/VitalsSample';

// Google Fit API configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/googlefit/callback';

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

interface GoogleFitTokenResponse {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

interface GoogleFitDataPoint {
  dataTypeName: string;
  startTimeNanos: string;
  endTimeNanos: string;
  value: Array<{
    intVal?: number;
    fpVal?: number;
    mapVal?: any[];
  }>;
  originDataSourceId: string;
}

export const googleFitService = {
  // Generate OAuth authorization URL
  getAuthorizationUrl(userId: number): string {
    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/fitness.heart_rate.read',
        'https://www.googleapis.com/auth/fitness.activity.read',
        'https://www.googleapis.com/auth/fitness.body.read',
        'https://www.googleapis.com/auth/fitness.location.read',
        'https://www.googleapis.com/auth/fitness.sleep.read',
      ],
      state,
      prompt: 'consent',
    });

    return authUrl;
  },

  // Exchange authorization code for tokens
  async exchangeCodeForToken(code: string): Promise<GoogleFitTokenResponse> {
    try {
      const { tokens } = await oauth2Client.getToken(code);
      return tokens as GoogleFitTokenResponse;
    } catch (error: any) {
      console.error('Error exchanging Google Fit code for token:', error.message);
      throw new Error('Failed to exchange Google Fit authorization code');
    }
  },

  // Refresh access token
  async refreshAccessToken(refreshToken: string): Promise<GoogleFitTokenResponse> {
    try {
      oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await oauth2Client.refreshAccessToken();
      return credentials as GoogleFitTokenResponse;
    } catch (error: any) {
      console.error('Error refreshing Google Fit token:', error.message);
      throw new Error('Failed to refresh Google Fit access token');
    }
  },

  // Get heart rate data
  async getHeartRateData(accessToken: string, startTime: Date, endTime: Date): Promise<GoogleFitDataPoint[]> {
    try {
      oauth2Client.setCredentials({ access_token: accessToken });
      const fitness = google.fitness({ version: 'v1', auth: oauth2Client });

      const aggregateRequest = {
        aggregateBy: [{
          dataTypeName: 'com.google.heart_rate.bpm',
        }],
        bucketByTime: { durationMillis: '86400000' }, // 1 day buckets
        startTimeMillis: startTime.getTime().toString(),
        endTimeMillis: endTime.getTime().toString(),
      };

      const response = await fitness.users.dataset.aggregate({
        userId: 'me',
        requestBody: aggregateRequest,
      });

      const dataPoints: GoogleFitDataPoint[] = [];
      const responseData = response.data;

      if (responseData && responseData.bucket) {
        for (const bucket of responseData.bucket) {
          if (bucket.dataset) {
            for (const dataset of bucket.dataset) {
              if (dataset.point) {
                for (const point of dataset.point) {
                  dataPoints.push(point as GoogleFitDataPoint);
                }
              }
            }
          }
        }
      }

      return dataPoints;
    } catch (error: any) {
      console.error('Error fetching Google Fit heart rate data:', error.message);
      throw new Error('Failed to fetch Google Fit heart rate data');
    }
  },

  // Create or update device connection
  async createOrUpdateConnection(
    userId: number,
    tokenData: GoogleFitTokenResponse
  ): Promise<DeviceConnection> {
    const tokenExpiresAt = tokenData.expiry_date ? new Date(tokenData.expiry_date) : new Date(Date.now() + 3600000);

    const [connection] = await DeviceConnection.findOrCreate({
      where: {
        userId,
        deviceType: 'googlefit',
      },
      defaults: {
        userId,
        deviceType: 'googlefit',
        deviceName: 'Google Fit',
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
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 2 * 24 * 60 * 60 * 1000); // Last 2 days

      const heartRateData = await this.getHeartRateData(
        deviceConnection.accessToken!,
        startTime,
        endTime
      );

      let recordsCreated = 0;

      for (const dataPoint of heartRateData) {
        if (dataPoint.value?.[0]?.fpVal) {
          const heartRate = Math.round(dataPoint.value[0].fpVal);
          const recordedAt = new Date(parseInt(dataPoint.startTimeNanos) / 1000000);

          await VitalsSample.create({
            userId: deviceConnection.userId,
            heartRate,
            source: 'device',
            deviceId: deviceConnection.deviceType,
            timestamp: recordedAt,
            notes: 'Heart rate from Google Fit',
          });

          recordsCreated++;
        }
      }

      return recordsCreated;
    } catch (error: any) {
      console.error('Error syncing Google Fit heart rate data:', error.message);
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

export default googleFitService;
