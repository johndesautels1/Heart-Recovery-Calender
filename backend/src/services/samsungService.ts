import axios from 'axios';
import DeviceConnection from '../models/DeviceConnection';
import DeviceSyncLog from '../models/DeviceSyncLog';
import ExerciseLog from '../models/ExerciseLog';
import VitalsSample from '../models/VitalsSample';
import Patient from '../models/Patient';

// Samsung Health API configuration
// Note: Samsung Health uses Health Connect on Android 14+ for Galaxy Watch 8
const SAMSUNG_CLIENT_ID = process.env.SAMSUNG_CLIENT_ID || '';
const SAMSUNG_CLIENT_SECRET = process.env.SAMSUNG_CLIENT_SECRET || '';
const SAMSUNG_REDIRECT_URI = process.env.SAMSUNG_REDIRECT_URI || 'http://localhost:3000/api/samsung/callback';

interface SamsungTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  user_id?: string;
}

interface SamsungExerciseSession {
  sessionId: string;
  startTime: string;
  endTime: string;
  exerciseType: string;
  durationMillis: number;
  totalSteps?: number;
  totalDistance?: number; // meters
  totalCalories?: number;
  heartRateSamples?: {
    time: string;
    beatsPerMinute: number;
  }[];
  heartRateAvg?: number;
  heartRateMax?: number;
  heartRateMin?: number;
}

interface SamsungHeartRateSample {
  time: string;
  beatsPerMinute: number;
  metadata?: {
    device: string;
    dataOrigin: string;
  };
}

export const samsungService = {
  // Generate OAuth authorization URL
  getAuthorizationUrl(userId: number): string {
    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: SAMSUNG_CLIENT_ID,
      redirect_uri: SAMSUNG_REDIRECT_URI,
      state,
      scope: 'read:exercise read:heart_rate read:steps read:calories read:sleep',
    });

    return `https://us.account.samsung.com/accounts/v1/SAUP/authorize?${params.toString()}`;
  },

  // Exchange authorization code for access token
  async exchangeCodeForToken(code: string): Promise<SamsungTokenResponse> {
    try {
      const response = await axios.post(
        'https://us.account.samsung.com/accounts/v1/oauth2/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: SAMSUNG_CLIENT_ID,
          client_secret: SAMSUNG_CLIENT_SECRET,
          redirect_uri: SAMSUNG_REDIRECT_URI,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error exchanging Samsung code for token:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code');
    }
  },

  // Refresh access token
  async refreshAccessToken(refreshToken: string): Promise<SamsungTokenResponse> {
    try {
      const response = await axios.post(
        'https://us.account.samsung.com/accounts/v1/oauth2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: SAMSUNG_CLIENT_ID,
          client_secret: SAMSUNG_CLIENT_SECRET,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error refreshing Samsung token:', error.response?.data || error.message);
      throw new Error('Failed to refresh access token');
    }
  },

  // Get exercise sessions from Health Connect
  async getExerciseSessions(
    accessToken: string,
    startTime: Date,
    endTime: Date
  ): Promise<SamsungExerciseSession[]> {
    try {
      const response = await axios.get('https://healthconnect.googleapis.com/v1/exercise', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
      });

      return response.data.sessions || [];
    } catch (error: any) {
      console.error('Error fetching Samsung exercise sessions:', error.response?.data || error.message);
      return [];
    }
  },

  // Get heart rate samples
  async getHeartRateSamples(
    accessToken: string,
    startTime: Date,
    endTime: Date
  ): Promise<SamsungHeartRateSample[]> {
    try {
      const response = await axios.get('https://healthconnect.googleapis.com/v1/heart_rate', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
      });

      return response.data.records || [];
    } catch (error: any) {
      console.error('Error fetching Samsung heart rate samples:', error.response?.data || error.message);
      return [];
    }
  },

  // Map Samsung exercise type to our category
  mapExerciseType(samsungType: string): string {
    const typeMap: Record<string, string> = {
      'WALKING': 'cardio',
      'RUNNING': 'cardio',
      'CYCLING': 'cardio',
      'SWIMMING': 'cardio',
      'WORKOUT': 'upper_body',
      'STRENGTH_TRAINING': 'upper_body',
      'YOGA': 'flexibility',
      'PILATES': 'core',
      'HIKING': 'cardio',
      'ELLIPTICAL': 'cardio',
      'ROWING': 'cardio',
      'STAIR_CLIMBING': 'cardio',
    };

    return typeMap[samsungType] || 'cardio';
  },
};

// Sync Samsung Health data to database
export async function syncSamsungData(
  device: DeviceConnection,
  syncLog: DeviceSyncLog
): Promise<DeviceSyncLog> {
  let recordsProcessed = 0;
  let recordsCreated = 0;
  let recordsSkipped = 0;
  const externalIds: string[] = [];

  try {
    // Check if token needs refresh
    if (device.tokenExpiresAt && device.tokenExpiresAt < new Date() && device.refreshToken) {
      const tokenData = await samsungService.refreshAccessToken(device.refreshToken);

      device.accessToken = tokenData.access_token;
      if (tokenData.refresh_token) {
        device.refreshToken = tokenData.refresh_token;
      }
      device.tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
      await device.save();
    }

    if (!device.accessToken) {
      throw new Error('No access token available');
    }

    // Get patient for this user
    const patient = await Patient.findOne({ where: { userId: device.userId } });
    if (!patient) {
      throw new Error('No patient profile found for user');
    }

    // Sync exercise sessions (last 7 days)
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000);

    if (device.syncExercises) {
      const sessions = await samsungService.getExerciseSessions(
        device.accessToken,
        startTime,
        endTime
      );
      recordsProcessed += sessions.length;

      for (const session of sessions) {
        try {
          // Check if already synced
          const existing = await ExerciseLog.findOne({
            where: {
              externalId: session.sessionId,
              dataSource: 'samsung_health',
            },
          });

          if (existing) {
            recordsSkipped++;
            continue;
          }

          // Calculate duration in minutes
          const durationMinutes = Math.round(session.durationMillis / 60000);

          // Create exercise log entry
          await ExerciseLog.create({
            prescriptionId: 0, // Will need to be linked manually or via smart matching
            patientId: patient.id,
            completedAt: new Date(session.endTime),
            startedAt: new Date(session.startTime),
            actualDuration: durationMinutes,
            duringHeartRateAvg: session.heartRateAvg,
            duringHeartRateMax: session.heartRateMax,
            steps: session.totalSteps,
            distanceMiles: session.totalDistance ? session.totalDistance / 1609.34 : undefined,
            caloriesBurned: session.totalCalories,
            dataSource: 'samsung_health',
            externalId: session.sessionId,
            deviceConnectionId: device.id,
            syncedAt: new Date(),
            notes: `Samsung Health ${session.exerciseType} activity`,
          });

          externalIds.push(session.sessionId);
          recordsCreated++;
        } catch (error: any) {
          console.error('Error processing Samsung exercise:', error);
          recordsSkipped++;
        }
      }
    }

    // Sync heart rate samples if enabled
    if (device.syncHeartRate) {
      const heartRateSamples = await samsungService.getHeartRateSamples(
        device.accessToken,
        startTime,
        endTime
      );

      for (const sample of heartRateSamples) {
        try {
          // Check if already synced
          const sampleTime = new Date(sample.time);
          const existing = await VitalsSample.findOne({
            where: {
              userId: device.userId,
              timestamp: sampleTime,
              source: 'device',
            },
          });

          if (existing) {
            continue;
          }

          // Create vitals sample
          await VitalsSample.create({
            userId: device.userId,
            timestamp: sampleTime,
            heartRate: sample.beatsPerMinute,
            source: 'device',
            deviceId: `samsung_${device.id}`,
            notes: 'Auto-synced from Samsung Health',
            medicationsTaken: false,
          });
        } catch (error: any) {
          console.error('Error processing heart rate sample:', error);
        }
      }
    }

    // Update device last sync time
    device.lastSyncedAt = new Date();
    device.syncStatus = 'active';
    device.syncError = undefined;
    await device.save();

    // Update sync log
    syncLog.status = 'success';
    syncLog.completedAt = new Date();
    syncLog.recordsProcessed = recordsProcessed;
    syncLog.recordsCreated = recordsCreated;
    syncLog.recordsSkipped = recordsSkipped;
    syncLog.externalIds = JSON.stringify(externalIds);
    await syncLog.save();

    return syncLog;
  } catch (error: any) {
    console.error('Error syncing Samsung data:', error);

    // Update device status
    device.syncStatus = 'error';
    device.syncError = error.message;
    await device.save();

    // Update sync log
    syncLog.status = 'error';
    syncLog.completedAt = new Date();
    syncLog.recordsProcessed = recordsProcessed;
    syncLog.recordsCreated = recordsCreated;
    syncLog.recordsSkipped = recordsSkipped;
    syncLog.errorMessage = error.message;
    syncLog.errorDetails = error.stack;
    await syncLog.save();

    throw error;
  }
}
