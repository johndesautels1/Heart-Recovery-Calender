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
  upload_time: string;
  polar_user: string;
  device: string;
  device_id?: string;
  start_time: string;
  start_time_utc_offset: number;
  stop_time?: string;
  duration: string;
  calories: number;
  distance: number;
  heart_rate: {
    average: number;
    maximum: number;
  };
  training_load?: number;
  training_load_pro?: any;
  sport: string;
  has_route: boolean;
  club_id?: number;
  club_name?: string;
  detailed_sport_info?: string;
  fat_percentage?: number;
  carbohydrate_percentage?: number;
  protein_percentage?: number;
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
  // NOTE: Polar API now returns full exercise objects, not URLs
  async getAvailableExercises(accessToken: string): Promise<PolarExercise[]> {
    try {
      console.log('[POLAR-API] Fetching available exercises from Polar AccessLink...');
      console.log('[POLAR-API] Using access token:', accessToken.substring(0, 20) + '...');
      const response = await axios.get(`${POLAR_API_BASE}/exercises`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log('[POLAR-API] Full response data:', JSON.stringify(response.data, null, 2));
      // Polar API returns array of exercise objects directly
      const exercises = Array.isArray(response.data) ? response.data : (response.data.exercises || []);
      console.log(`[POLAR-API] Response: ${exercises.length} exercises available`);
      if (exercises.length > 0) {
        console.log('[POLAR-API] First exercise ID:', exercises[0].id);
      }
      return exercises;
    } catch (error: any) {
      console.error('[POLAR-API] Error fetching available exercises:', error.response?.data || error.message);
      console.error('[POLAR-API] Status:', error.response?.status);
      console.error('[POLAR-API] Headers sent:', error.config?.headers);
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

  // Get continuous heart rate data (for real-time streaming)
  async getContinuousHeartRate(accessToken: string): Promise<any[]> {
    try {
      const response = await axios.get(`${POLAR_API_BASE}/users/heart-rate`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data.samples || [];
    } catch (error: any) {
      console.error('Error fetching continuous HR:', error.response?.data || error.message);
      return [];
    }
  },

  // Get available activity summaries (daily steps, calories, etc.)
  async getActivitySummaries(accessToken: string): Promise<string[]> {
    try {
      const response = await axios.get(`${POLAR_API_BASE}/activity-summary`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data['activity-log'] || [];
    } catch (error: any) {
      console.error('Error fetching activity summaries:', error.response?.data || error.message);
      return [];
    }
  },

  // Get activity summary details
  async getActivitySummary(accessToken: string, summaryUrl: string): Promise<any> {
    try {
      const response = await axios.get(summaryUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('Error fetching activity summary details:', error.response?.data || error.message);
      return null;
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

    // Get available exercises (now returns full exercise objects)
    const exercises = await polarService.getAvailableExercises(device.accessToken);
    recordsProcessed = exercises.length;

    console.log(`[POLAR-SYNC] Polar API returned ${exercises.length} available exercises`);
    if (exercises.length > 0) {
      console.log('[POLAR-SYNC] Exercise IDs:', exercises.map(e => e.id).join(', '));
    }

    // Get patient for this user
    const patient = await Patient.findOne({ where: { userId: device.userId } });
    if (!patient) {
      throw new Error('No patient profile found for user');
    }

    // Process each exercise (already have full data, no need to fetch again)
    for (const exercise of exercises) {
      try {
        if (!exercise || !exercise.id) {
          recordsSkipped++;
          continue;
        }

        console.log(`[POLAR-SYNC] Processing exercise ${exercise.id}:`, JSON.stringify(exercise, null, 2));

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

        // Parse Polar timestamps (format: "2025-11-08T19:50:19" without Z suffix)
        // Add Z to indicate UTC time
        if (!exercise.start_time) {
          console.error(`[POLAR-SYNC] Missing start_time for exercise ${exercise.id}`);
          recordsSkipped++;
          continue;
        }

        const startTime = exercise.start_time.includes('Z')
          ? exercise.start_time
          : exercise.start_time + 'Z';

        // Calculate stop time from start time + duration if not provided
        let stopTime: string;
        if (exercise.stop_time) {
          stopTime = exercise.stop_time.includes('Z')
            ? exercise.stop_time
            : exercise.stop_time + 'Z';
        } else {
          // Calculate from duration (totalMinutes already calculated above)
          const startDate = new Date(startTime);
          const stopDate = new Date(startDate.getTime() + totalMinutes * 60 * 1000);
          stopTime = stopDate.toISOString();
        }

        // Create exercise log entry
        await ExerciseLog.create({
          prescriptionId: null, // Will need to be linked manually or via smart matching
          patientId: patient.id,
          completedAt: new Date(stopTime),
          startedAt: new Date(startTime),
          actualDuration: totalMinutes,
          duringHeartRateAvg: exercise.heart_rate?.average,
          duringHeartRateMax: exercise.heart_rate?.maximum,
          caloriesBurned: exercise.calories,
          distanceMiles: exercise.distance ? exercise.distance / 1609.34 : undefined, // Convert meters to miles
          dataSource: 'polar',
          externalId: exercise.id,
          deviceConnectionId: device.id,
          syncedAt: new Date(),
          notes: `Polar ${exercise.sport} activity`,
        });

        // ALSO create VitalsSample records for heart rate monitoring
        // This allows the vitals section and modal to access real-time HR data
        const VitalsSample = (await import('../models/VitalsSample')).default;

        // Create a vitals sample at exercise completion with heart rate data
        if (exercise.heart_rate?.average) {
          try {
            await VitalsSample.create({
              userId: device.userId,
              timestamp: new Date(stopTime),
              heartRate: exercise.heart_rate.average,
              heartRateVariability: null, // HRV requires R-R interval data from Polar's dedicated HRV endpoint, not available in exercise summary
              source: 'device',
              deviceId: `polar_${device.id}`,
              notes: `Polar ${exercise.sport} - avg HR during exercise`,
              medicationsTaken: false,
            });
          } catch (vitalError: any) {
            console.error('Error creating VitalsSample from Polar exercise:', vitalError);
            // Don't fail the whole sync if vitals creation fails
          }
        }

        externalIds.push(exercise.id);
        recordsCreated++;

        // Commit transaction to mark as processed
        if (device.accessToken && exercise.id) {
          await polarService.commitTransaction(device.accessToken, exercise.id);
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
