import axios from 'axios';
import DeviceConnection from '../models/DeviceConnection';
import DeviceSyncLog from '../models/DeviceSyncLog';
import ExerciseLog from '../models/ExerciseLog';
import VitalsSample from '../models/VitalsSample';
import Patient from '../models/Patient';
import SleepLog from '../models/SleepLog';

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

interface SamsungSleepSession {
  sessionId: string;
  startTime: string;
  endTime: string;
  durationMillis: number;
  stages?: {
    stage: 'awake' | 'light' | 'deep' | 'rem';
    startTime: string;
    endTime: string;
  }[];
  sleepQuality?: number; // 0-100 quality score
  notes?: string;
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
      scope: 'read:exercise read:heart_rate read:blood_pressure read:oxygen_saturation read:respiratory_rate read:heart_rate_variability read:steps read:calories read:sleep',
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

  // Get blood pressure samples
  async getBloodPressureSamples(
    accessToken: string,
    startTime: Date,
    endTime: Date
  ): Promise<any[]> {
    try {
      const response = await axios.get('https://healthconnect.googleapis.com/v1/blood_pressure', {
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
      console.error('Error fetching Samsung blood pressure samples:', error.response?.data || error.message);
      return [];
    }
  },

  // Get oxygen saturation (SpO2) samples
  async getOxygenSaturationSamples(
    accessToken: string,
    startTime: Date,
    endTime: Date
  ): Promise<any[]> {
    try {
      const response = await axios.get('https://healthconnect.googleapis.com/v1/oxygen_saturation', {
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
      console.error('Error fetching Samsung oxygen saturation samples:', error.response?.data || error.message);
      return [];
    }
  },

  // Get respiratory rate samples
  async getRespiratoryRateSamples(
    accessToken: string,
    startTime: Date,
    endTime: Date
  ): Promise<any[]> {
    try {
      const response = await axios.get('https://healthconnect.googleapis.com/v1/respiratory_rate', {
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
      console.error('Error fetching Samsung respiratory rate samples:', error.response?.data || error.message);
      return [];
    }
  },

  // Get heart rate variability (HRV) samples
  async getHeartRateVariabilitySamples(
    accessToken: string,
    startTime: Date,
    endTime: Date
  ): Promise<any[]> {
    try {
      const response = await axios.get('https://healthconnect.googleapis.com/v1/heart_rate_variability', {
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
      console.error('Error fetching Samsung HRV samples:', error.response?.data || error.message);
      return [];
    }
  },

  // Get sleep sessions from Health Connect
  async getSleepSessions(
    accessToken: string,
    startTime: Date,
    endTime: Date
  ): Promise<SamsungSleepSession[]> {
    try {
      const response = await axios.get('https://healthconnect.googleapis.com/v1/sleep', {
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
      console.error('Error fetching Samsung sleep sessions:', error.response?.data || error.message);
      return [];
    }
  },

  // Calculate sleep quality from sleep stages
  calculateSleepQuality(stages: SamsungSleepSession['stages'], durationHours: number): 'poor' | 'fair' | 'good' | 'excellent' {
    if (!stages || stages.length === 0) {
      // Basic quality based on duration
      if (durationHours < 4) return 'poor';
      if (durationHours < 6) return 'fair';
      if (durationHours < 8) return 'good';
      return 'excellent';
    }

    // Calculate stage percentages
    const totalMillis = stages.reduce((sum, stage) => {
      const start = new Date(stage.startTime).getTime();
      const end = new Date(stage.endTime).getTime();
      return sum + (end - start);
    }, 0);

    const deepSleep = stages.filter(s => s.stage === 'deep').reduce((sum, stage) => {
      const start = new Date(stage.startTime).getTime();
      const end = new Date(stage.endTime).getTime();
      return sum + (end - start);
    }, 0);

    const remSleep = stages.filter(s => s.stage === 'rem').reduce((sum, stage) => {
      const start = new Date(stage.startTime).getTime();
      const end = new Date(stage.endTime).getTime();
      return sum + (end - start);
    }, 0);

    const deepPercent = (deepSleep / totalMillis) * 100;
    const remPercent = (remSleep / totalMillis) * 100;

    // Ideal: 15-25% deep sleep, 20-25% REM sleep
    const qualityScore = (
      (deepPercent >= 15 && deepPercent <= 25 ? 25 : 0) +
      (remPercent >= 20 && remPercent <= 25 ? 25 : 0) +
      (durationHours >= 7 && durationHours <= 9 ? 50 : durationHours >= 6 ? 25 : 0)
    );

    if (qualityScore >= 75) return 'excellent';
    if (qualityScore >= 50) return 'good';
    if (qualityScore >= 25) return 'fair';
    return 'poor';
  },

  // Calculate detailed sleep stages breakdown
  calculateSleepStagesBreakdown(stages: SamsungSleepSession['stages'], totalDurationMillis: number): {
    awakeDuration: number;
    lightSleepDuration: number;
    deepSleepDuration: number;
    remSleepDuration: number;
    awakePercent: number;
    lightSleepPercent: number;
    deepSleepPercent: number;
    remSleepPercent: number;
  } {
    if (!stages || stages.length === 0) {
      return {
        awakeDuration: 0,
        lightSleepDuration: 0,
        deepSleepDuration: 0,
        remSleepDuration: 0,
        awakePercent: 0,
        lightSleepPercent: 0,
        deepSleepPercent: 0,
        remSleepPercent: 0,
      };
    }

    // Calculate duration for each stage in minutes
    const durations = {
      awake: 0,
      light: 0,
      deep: 0,
      rem: 0,
    };

    stages.forEach(stage => {
      const start = new Date(stage.startTime).getTime();
      const end = new Date(stage.endTime).getTime();
      const durationMinutes = (end - start) / (1000 * 60);

      durations[stage.stage] += durationMinutes;
    });

    // Calculate percentages
    const totalMinutes = totalDurationMillis / (1000 * 60);
    const percentages = {
      awake: totalMinutes > 0 ? (durations.awake / totalMinutes) * 100 : 0,
      light: totalMinutes > 0 ? (durations.light / totalMinutes) * 100 : 0,
      deep: totalMinutes > 0 ? (durations.deep / totalMinutes) * 100 : 0,
      rem: totalMinutes > 0 ? (durations.rem / totalMinutes) * 100 : 0,
    };

    return {
      awakeDuration: Math.round(durations.awake * 100) / 100,
      lightSleepDuration: Math.round(durations.light * 100) / 100,
      deepSleepDuration: Math.round(durations.deep * 100) / 100,
      remSleepDuration: Math.round(durations.rem * 100) / 100,
      awakePercent: Math.round(percentages.awake * 100) / 100,
      lightSleepPercent: Math.round(percentages.light * 100) / 100,
      deepSleepPercent: Math.round(percentages.deep * 100) / 100,
      remSleepPercent: Math.round(percentages.rem * 100) / 100,
    };
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
            prescriptionId: null, // Will need to be linked manually or via smart matching
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

    // Sync comprehensive vitals data if enabled
    if (device.syncHeartRate) {
      // Fetch all vitals data types in parallel for efficiency
      const [
        heartRateSamples,
        bloodPressureSamples,
        oxygenSaturationSamples,
        respiratoryRateSamples,
        hrvSamples
      ] = await Promise.all([
        samsungService.getHeartRateSamples(device.accessToken, startTime, endTime),
        samsungService.getBloodPressureSamples(device.accessToken, startTime, endTime),
        samsungService.getOxygenSaturationSamples(device.accessToken, startTime, endTime),
        samsungService.getRespiratoryRateSamples(device.accessToken, startTime, endTime),
        samsungService.getHeartRateVariabilitySamples(device.accessToken, startTime, endTime)
      ]);

      // Create maps for efficient lookup by timestamp
      const bpMap = new Map(bloodPressureSamples.map(s => [new Date(s.time).toISOString(), s]));
      const o2Map = new Map(oxygenSaturationSamples.map(s => [new Date(s.time).toISOString(), s]));
      const respMap = new Map(respiratoryRateSamples.map(s => [new Date(s.time).toISOString(), s]));
      const hrvMap = new Map(hrvSamples.map(s => [new Date(s.time).toISOString(), s]));

      // Process heart rate samples and merge with other vitals at same timestamp
      for (const hrSample of heartRateSamples) {
        try {
          const sampleTime = new Date(hrSample.time);
          const timeKey = sampleTime.toISOString();

          // Check if already synced
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

          // Get matching vitals at same timestamp
          const bp = bpMap.get(timeKey);
          const o2 = o2Map.get(timeKey);
          const resp = respMap.get(timeKey);
          const hrv = hrvMap.get(timeKey);

          // Create comprehensive vitals sample with ALL available data
          await VitalsSample.create({
            userId: device.userId,
            timestamp: sampleTime,
            heartRate: hrSample.beatsPerMinute,
            bloodPressureSystolic: bp?.systolic,
            bloodPressureDiastolic: bp?.diastolic,
            oxygenSaturation: o2?.percentage,
            respiratoryRate: resp?.rate,
            heartRateVariability: hrv?.milliseconds,
            source: 'device',
            deviceId: `samsung_${device.id}`,
            notes: 'Auto-synced from Samsung Galaxy Watch',
            medicationsTaken: false,
          });
        } catch (error: any) {
          console.error('Error processing Samsung vitals sample:', error);
        }
      }

      // Process standalone vitals (BP, O2, resp, HRV) that don't have matching HR timestamp
      // This ensures we don't miss any vitals data
      for (const bp of bloodPressureSamples) {
        try {
          const sampleTime = new Date(bp.time);
          const existing = await VitalsSample.findOne({
            where: { userId: device.userId, timestamp: sampleTime, source: 'device' }
          });

          if (!existing) {
            await VitalsSample.create({
              userId: device.userId,
              timestamp: sampleTime,
              bloodPressureSystolic: bp.systolic,
              bloodPressureDiastolic: bp.diastolic,
              source: 'device',
              deviceId: `samsung_${device.id}`,
              notes: 'Blood pressure from Samsung Galaxy Watch',
              medicationsTaken: false,
            });
          }
        } catch (error: any) {
          console.error('Error processing standalone BP:', error);
        }
      }
    }

    // Sync sleep data if enabled
    if (device.syncSleep) {
      const sleepSessions = await samsungService.getSleepSessions(
        device.accessToken,
        startTime,
        endTime
      );
      recordsProcessed += sleepSessions.length;

      for (const session of sleepSessions) {
        try {
          const sessionStart = new Date(session.startTime);
          const sessionEnd = new Date(session.endTime);

          // Calculate hours slept
          const hoursSlept = session.durationMillis / (1000 * 60 * 60);

          // Determine the date (day you woke up)
          const sleepDate = sessionEnd.toISOString().split('T')[0];

          // Check if already synced for this date
          const existing = await SleepLog.findOne({
            where: {
              userId: device.userId,
              date: sleepDate,
            },
          });

          if (existing) {
            // Skip if manual entry exists, unless it's also from device sync
            recordsSkipped++;
            continue;
          }

          // Calculate sleep quality based on stages and duration
          const sleepQuality = samsungService.calculateSleepQuality(session.stages, hoursSlept);

          // Calculate sleep stages breakdown
          const stagesBreakdown = samsungService.calculateSleepStagesBreakdown(session.stages, session.durationMillis);

          // Calculate sleep efficiency metrics
          const timeInBedMinutes = session.durationMillis / (1000 * 60);
          const timeAsleepMinutes = timeInBedMinutes - (stagesBreakdown.awakeDuration || 0);
          const sleepEfficiency = timeInBedMinutes > 0 ? (timeAsleepMinutes / timeInBedMinutes) * 100 : 0;

          // Count sleep interruptions (number of awake periods)
          const sleepInterruptions = session.stages?.filter(s => s.stage === 'awake').length || 0;

          // Create comprehensive sleep log entry
          await SleepLog.create({
            userId: device.userId,
            date: new Date(sleepDate),
            hoursSlept: Math.round(hoursSlept * 100) / 100,
            sleepQuality,
            bedTime: sessionStart,
            wakeTime: sessionEnd,

            // Sleep stages data
            sleepStages: session.stages,
            awakeDuration: stagesBreakdown.awakeDuration,
            lightSleepDuration: stagesBreakdown.lightSleepDuration,
            deepSleepDuration: stagesBreakdown.deepSleepDuration,
            remSleepDuration: stagesBreakdown.remSleepDuration,
            awakePercent: stagesBreakdown.awakePercent,
            lightSleepPercent: stagesBreakdown.lightSleepPercent,
            deepSleepPercent: stagesBreakdown.deepSleepPercent,
            remSleepPercent: stagesBreakdown.remSleepPercent,

            // Sleep efficiency metrics
            timeInBed: Math.round(timeInBedMinutes * 100) / 100,
            timeAsleep: Math.round(timeAsleepMinutes * 100) / 100,
            sleepEfficiency: Math.round(sleepEfficiency * 100) / 100,
            sleepInterruptions,

            notes: `Auto-synced from Samsung Galaxy Watch 8${session.sleepQuality ? ` (Quality Score: ${session.sleepQuality})` : ''}`,
          });

          externalIds.push(session.sessionId);
          recordsCreated++;
        } catch (error: any) {
          console.error('Error processing Samsung sleep session:', error);
          recordsSkipped++;
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
