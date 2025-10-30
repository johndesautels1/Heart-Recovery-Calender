import axios from 'axios';
import DeviceConnection from '../models/DeviceConnection';
import DeviceSyncLog from '../models/DeviceSyncLog';
import ExerciseLog from '../models/ExerciseLog';
import Patient from '../models/Patient';

// Polar AccessLink API configuration
const POLAR_CLIENT_ID = process.env.POLAR_CLIENT_ID || '';
const POLAR_CLIENT_SECRET = process.env.POLAR_CLIENT_SECRET || '';
const POLAR_REDIRECT_URI = process.env.POLAR_REDIRECT_URI || 'http://localhost:3000/api/polar/callback';
const POLAR_API_BASE = 'https://www.polaraccesslink.com/v3';

interface PolarTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  x_user_id: number;
}

interface PolarExercise {
  id: string;
  'upload-time': string;
  'polar-user': string;
  device: string;
  'device-id': string;
  'start-time': string;
  'stop-time': string;
  duration: string;
  calories: number;
  distance: number;
  'heart-rate': {
    average: number;
    maximum: number;
  };
  'training-load': number;
  sport: string;
  'has-route': boolean;
  'club-id'?: number;
  'club-name'?: string;
  'detailed-sport-info'?: string;
  'fat-percentage'?: number;
  'carbohydrate-percentage'?: number;
  'protein-percentage'?: number;
}

export const polarService = {
  // Generate OAuth authorization URL
  getAuthorizationUrl(userId: number): string {
    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: POLAR_CLIENT_ID,
      redirect_uri: POLAR_REDIRECT_URI,
      state,
      scope: 'accesslink.read_all',
    });

    return `https://flow.polar.com/oauth2/authorization?${params.toString()}`;
  },

  // Exchange authorization code for access token
  async exchangeCodeForToken(code: string): Promise<PolarTokenResponse> {
    try {
      const response = await axios.post(
        'https://polarremote.com/v2/oauth2/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: POLAR_REDIRECT_URI,
        }),
        {
          auth: {
            username: POLAR_CLIENT_ID,
            password: POLAR_CLIENT_SECRET,
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error exchanging Polar code for token:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code');
    }
  },

  // Refresh access token
  async refreshAccessToken(refreshToken: string): Promise<PolarTokenResponse> {
    try {
      const response = await axios.post(
        'https://polarremote.com/v2/oauth2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
        {
          auth: {
            username: POLAR_CLIENT_ID,
            password: POLAR_CLIENT_SECRET,
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error refreshing Polar token:', error.response?.data || error.message);
      throw new Error('Failed to refresh access token');
    }
  },

  // Register user for AccessLink
  async registerUser(accessToken: string, polarUserId: number): Promise<void> {
    try {
      await axios.post(
        `${POLAR_API_BASE}/users`,
        {
          'member-id': polarUserId.toString(),
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error: any) {
      // User might already be registered, which is fine
      if (error.response?.status !== 409) {
        console.error('Error registering Polar user:', error.response?.data || error.message);
        throw new Error('Failed to register user with Polar AccessLink');
      }
    }
  },

  // Get available exercises
  async getAvailableExercises(accessToken: string): Promise<string[]> {
    try {
      const response = await axios.get(`${POLAR_API_BASE}/exercises`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data.exercises || [];
    } catch (error: any) {
      console.error('Error fetching available exercises:', error.response?.data || error.message);
      return [];
    }
  },

  // Get exercise details
  async getExercise(accessToken: string, exerciseUrl: string): Promise<PolarExercise | null> {
    try {
      const response = await axios.get(exerciseUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('Error fetching exercise details:', error.response?.data || error.message);
      return null;
    }
  },

  // Commit transaction (mark exercise as processed)
  async commitTransaction(accessToken: string, transactionId: string): Promise<void> {
    try {
      await axios.put(
        `${POLAR_API_BASE}/exercises/${transactionId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    } catch (error: any) {
      console.error('Error committing transaction:', error.response?.data || error.message);
    }
  },
};

// Sync Polar data to database
export async function syncPolarData(
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
      const tokenData = await polarService.refreshAccessToken(device.refreshToken);

      device.accessToken = tokenData.access_token;
      device.tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
      await device.save();
    }

    if (!device.accessToken) {
      throw new Error('No access token available');
    }

    // Get available exercises
    const exerciseUrls = await polarService.getAvailableExercises(device.accessToken);
    recordsProcessed = exerciseUrls.length;

    // Get patient for this user
    const patient = await Patient.findOne({ where: { userId: device.userId } });
    if (!patient) {
      throw new Error('No patient profile found for user');
    }

    // Process each exercise
    for (const exerciseUrl of exerciseUrls) {
      try {
        const exercise = await polarService.getExercise(device.accessToken, exerciseUrl);

        if (!exercise) {
          recordsSkipped++;
          continue;
        }

        // Check if already synced
        const existing = await ExerciseLog.findOne({
          where: {
            externalId: exercise.id,
            dataSource: 'polar',
          },
        });

        if (existing) {
          recordsSkipped++;
          continue;
        }

        // Parse duration (format: "PT1H30M45S" or "PT30M" or "PT45S")
        const durationMatch = exercise.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        const hours = parseInt(durationMatch?.[1] || '0');
        const minutes = parseInt(durationMatch?.[2] || '0');
        const seconds = parseInt(durationMatch?.[3] || '0');
        const totalMinutes = hours * 60 + minutes + Math.round(seconds / 60);

        // Create exercise log entry
        await ExerciseLog.create({
          prescriptionId: 0, // Will need to be linked manually or via smart matching
          patientId: patient.id,
          completedAt: new Date(exercise['stop-time']),
          startedAt: new Date(exercise['start-time']),
          actualDuration: totalMinutes,
          duringHeartRateAvg: exercise['heart-rate']?.average,
          duringHeartRateMax: exercise['heart-rate']?.maximum,
          caloriesBurned: exercise.calories,
          distanceMiles: exercise.distance ? exercise.distance / 1609.34 : undefined, // Convert meters to miles
          dataSource: 'polar',
          externalId: exercise.id,
          deviceConnectionId: device.id,
          syncedAt: new Date(),
          notes: `Polar ${exercise.sport} activity`,
        });

        externalIds.push(exercise.id);
        recordsCreated++;

        // Commit transaction to mark as processed
        if (device.accessToken) {
          const transactionId = exerciseUrl.split('/').pop();
          if (transactionId) {
            await polarService.commitTransaction(device.accessToken, transactionId);
          }
        }
      } catch (error: any) {
        console.error('Error processing Polar exercise:', error);
        recordsSkipped++;
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
    console.error('Error syncing Polar data:', error);

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
