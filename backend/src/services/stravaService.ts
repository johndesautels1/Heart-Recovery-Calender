import axios from 'axios';
import DeviceConnection from '../models/DeviceConnection';
import DeviceSyncLog from '../models/DeviceSyncLog';
import ExerciseLog from '../models/ExerciseLog';
import VitalsSample from '../models/VitalsSample';
import Patient from '../models/Patient';

// Strava API configuration
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID || '';
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET || '';
const STRAVA_REDIRECT_URI = process.env.STRAVA_REDIRECT_URI || 'http://localhost:4000/api/strava/callback';

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: {
    id: number;
    username: string;
    firstname: string;
    lastname: string;
  };
}

interface StravaActivity {
  id: number;
  name: string;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  total_elevation_gain: number; // meters
  type: string; // Run, Ride, Swim, etc.
  start_date: string; // ISO 8601
  start_date_local: string;
  timezone: string;
  achievement_count: number;
  kudos_count: number;
  comment_count: number;
  athlete_count: number;
  photo_count: number;
  trainer: boolean;
  commute: boolean;
  manual: boolean;
  private: boolean;
  flagged: boolean;
  gear_id: string | null;
  average_speed: number; // m/s
  max_speed: number; // m/s
  average_cadence?: number;
  average_temp?: number;
  average_watts?: number;
  weighted_average_watts?: number;
  kilojoules?: number;
  device_watts?: boolean;
  has_heartrate: boolean;
  average_heartrate?: number;
  max_heartrate?: number;
  heartrate_opt_out: boolean;
  display_hide_heartrate_option: boolean;
  elev_high?: number;
  elev_low?: number;
  pr_count: number;
  total_photo_count: number;
  has_kudoed: boolean;
  workout_type?: number;
  suffer_score?: number;
  description?: string;
  calories?: number;
}

export const stravaService = {
  // Generate OAuth authorization URL
  getAuthorizationUrl(userId: number): string {
    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');

    const params = new URLSearchParams({
      client_id: STRAVA_CLIENT_ID,
      redirect_uri: STRAVA_REDIRECT_URI,
      response_type: 'code',
      approval_prompt: 'auto',
      scope: 'read,activity:read_all,profile:read_all',
      state,
    });

    return `https://www.strava.com/oauth/authorize?${params.toString()}`;
  },

  // Exchange authorization code for access token
  async exchangeCodeForToken(code: string): Promise<StravaTokenResponse> {
    try {
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      });

      return response.data;
    } catch (error: any) {
      console.error('Error exchanging Strava code for token:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code');
    }
  },

  // Refresh access token
  async refreshAccessToken(refreshToken: string): Promise<StravaTokenResponse> {
    try {
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });

      return response.data;
    } catch (error: any) {
      console.error('Error refreshing Strava token:', error.response?.data || error.message);
      throw new Error('Failed to refresh access token');
    }
  },

  // Get athlete's activities
  async getActivities(
    accessToken: string,
    after?: number, // Unix timestamp
    before?: number, // Unix timestamp
    page: number = 1,
    perPage: number = 30
  ): Promise<StravaActivity[]> {
    try {
      const params: any = {
        page,
        per_page: perPage,
      };

      if (after) params.after = after;
      if (before) params.before = before;

      const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params,
      });

      return response.data;
    } catch (error: any) {
      console.error('Error fetching Strava activities:', error.response?.data || error.message);
      return [];
    }
  },

  // Get detailed activity data
  async getActivity(accessToken: string, activityId: number): Promise<StravaActivity | null> {
    try {
      const response = await axios.get(`https://www.strava.com/api/v3/activities/${activityId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('Error fetching Strava activity:', error.response?.data || error.message);
      return null;
    }
  },

  // Map Strava activity type to our exercise category
  mapActivityType(stravaType: string): string {
    const typeMap: Record<string, string> = {
      'Run': 'cardio',
      'Ride': 'cardio',
      'Swim': 'cardio',
      'Walk': 'cardio',
      'Hike': 'cardio',
      'VirtualRide': 'cardio',
      'VirtualRun': 'cardio',
      'Elliptical': 'cardio',
      'StairStepper': 'cardio',
      'WeightTraining': 'upper_body',
      'Workout': 'upper_body',
      'Yoga': 'flexibility',
      'Crossfit': 'upper_body',
      'RockClimbing': 'upper_body',
      'Rowing': 'cardio',
    };

    return typeMap[stravaType] || 'cardio';
  },
};

// Sync Strava activities to database
export async function syncStravaData(
  device: DeviceConnection,
  syncLog: DeviceSyncLog
): Promise<DeviceSyncLog> {
  let recordsProcessed = 0;
  let recordsCreated = 0;
  let recordsSkipped = 0;
  const externalIds: string[] = [];

  try {
    // Check if token needs refresh
    const tokenExpiresAt = device.tokenExpiresAt ? new Date(device.tokenExpiresAt) : null;
    if (tokenExpiresAt && tokenExpiresAt < new Date() && device.refreshToken) {
      const tokenData = await stravaService.refreshAccessToken(device.refreshToken);

      device.accessToken = tokenData.access_token;
      device.refreshToken = tokenData.refresh_token;
      device.tokenExpiresAt = new Date(tokenData.expires_at * 1000);
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

    // Sync activities (last 30 days)
    const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    const activities = await stravaService.getActivities(device.accessToken, thirtyDaysAgo);
    recordsProcessed += activities.length;

    for (const activity of activities) {
      try {
        // Check if already synced
        const existing = await ExerciseLog.findOne({
          where: {
            externalId: activity.id.toString(),
            dataSource: 'strava',
          },
        });

        if (existing) {
          recordsSkipped++;
          continue;
        }

        // Calculate duration in minutes
        const durationMinutes = Math.round(activity.moving_time / 60);

        // Convert distance to miles
        const distanceMiles = activity.distance / 1609.34;

        // Create exercise log entry
        await ExerciseLog.create({
          prescriptionId: 0, // Will need to be linked manually or via smart matching
          patientId: patient.id,
          completedAt: new Date(activity.start_date),
          startedAt: new Date(activity.start_date_local),
          actualDuration: durationMinutes,
          duringHeartRateAvg: activity.average_heartrate,
          duringHeartRateMax: activity.max_heartrate,
          steps: undefined, // Strava doesn't provide steps
          distanceMiles: distanceMiles > 0 ? distanceMiles : undefined,
          elevationFeet: activity.total_elevation_gain ? activity.total_elevation_gain * 3.28084 : undefined,
          caloriesBurned: activity.calories,
          dataSource: 'strava',
          externalId: activity.id.toString(),
          deviceConnectionId: device.id,
          syncedAt: new Date(),
          notes: `${activity.name} (${activity.type})${activity.description ? ' - ' + activity.description : ''}`,
        });

        externalIds.push(activity.id.toString());
        recordsCreated++;

        // Also create heart rate samples if available
        if (activity.has_heartrate && activity.average_heartrate) {
          try {
            await VitalsSample.create({
              userId: device.userId,
              timestamp: new Date(activity.start_date),
              heartRate: activity.average_heartrate,
              source: 'device',
              deviceId: `strava_${device.id}`,
              notes: `Auto-synced from Strava activity: ${activity.name}`,
              medicationsTaken: false,
            });
          } catch (error: any) {
            console.error('Error creating vitals sample:', error);
          }
        }
      } catch (error: any) {
        console.error('Error processing Strava activity:', error);
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
    console.error('Error syncing Strava data:', error);

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
