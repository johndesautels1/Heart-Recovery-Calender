import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { analyzeForHAWKAlerts } from '../services/hawkAlertService';
import { getCurrentWeather } from '../services/weatherService';
import Patient from '../models/Patient';
import HydrationLog from '../models/HydrationLog';
import CalendarEvent from '../models/CalendarEvent';
import Exercise from '../models/Exercise';
import { format, startOfDay, endOfDay } from 'date-fns';

const router = express.Router();

/**
 * Helper: Determine activity type based on exercise intensity and category
 */
function getActivityType(exerciseIntensity?: number, category?: string): 'light_exercise' | 'moderate_exercise' | 'vigorous_exercise' | undefined {
  if (!exerciseIntensity) return undefined;

  // Map intensity (1-10 scale) to activity types
  if (exerciseIntensity >= 1 && exerciseIntensity <= 3) {
    return 'light_exercise'; // Low intensity (walking, stretching)
  } else if (exerciseIntensity >= 4 && exerciseIntensity <= 6) {
    return 'moderate_exercise'; // Moderate intensity (brisk walking, light jogging)
  } else if (exerciseIntensity >= 7) {
    return 'vigorous_exercise'; // High intensity (running, intense cardio)
  }

  return undefined;
}

/**
 * Helper: Determine if activity is outdoor based on location and tags
 */
function isOutdoorActivity(location?: string, tags?: string[]): boolean {
  // Check location field
  if (location) {
    const locationLower = location.toLowerCase();
    if (locationLower.includes('outdoor') ||
        locationLower.includes('outside') ||
        locationLower.includes('park') ||
        locationLower.includes('trail') ||
        locationLower.includes('street') ||
        locationLower.includes('track')) {
      return true;
    }
  }

  // Check tags
  if (tags && tags.length > 0) {
    return tags.some(tag =>
      tag.toLowerCase().includes('outdoor') ||
      tag.toLowerCase().includes('outside')
    );
  }

  return false;
}

/**
 * GET /api/hawk/alerts
 * Get active HAWK alerts for logged-in user
 */
router.get('/alerts', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;

    // Get patient profile
    const patient = await Patient.findOne({ where: { userId } });

    if (!patient) {
      return res.json({ alerts: [] }); // No patient profile = no alerts
    }

    // Get current weather (if location available)
    let temperature: number | undefined;
    let humidity: number | undefined;
    let weatherCondition: 'safe' | 'caution' | 'danger' | 'extreme' | undefined;

    if (patient.city && patient.state) {
      try {
        const weather = await getCurrentWeather(patient.city, patient.state);
        temperature = weather.temp;
        humidity = weather.humidity;
        weatherCondition = weather.condition;
      } catch (error) {
        console.warn('[HAWK] Could not fetch weather, skipping weather-based alerts');
      }
    }

    // Get today's hydration status
    const today = format(new Date(), 'yyyy-MM-dd');
    const hydrationLog = await HydrationLog.findOne({
      where: {
        userId,
        date: today,
      },
    });

    const currentHydration = hydrationLog?.totalOunces || 0;
    const targetHydration = hydrationLog?.targetOunces || 64;

    // Get today's scheduled calendar events for this user
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const todayEvents = await CalendarEvent.findAll({
      where: {
        patientId: userId,
        status: 'scheduled', // Only check scheduled activities (not completed/cancelled)
        startTime: {
          [require('sequelize').Op.between]: [todayStart, todayEnd],
        },
        deletedAt: null, // Exclude soft-deleted events
      },
      include: [
        {
          model: Exercise,
          as: 'exercise',
          required: false, // LEFT JOIN - include events without exercises too
        },
      ],
    });

    console.log(`[HAWK] Found ${todayEvents.length} scheduled events for today`);

    // Find the most intense/dangerous activity for today
    let mostIntenseActivity = null;
    let maxIntensity = 0;

    for (const event of todayEvents) {
      const intensity = event.exerciseIntensity || 0;
      if (intensity > maxIntensity) {
        maxIntensity = intensity;
        mostIntenseActivity = event;
      }
    }

    // Extract activity data from the most intense event
    let activityType: 'light_exercise' | 'moderate_exercise' | 'vigorous_exercise' | undefined = undefined;
    let activityLocation: 'indoor' | 'outdoor' | undefined = undefined;
    let activityDuration: number | undefined = undefined;

    if (mostIntenseActivity) {
      // Determine activity type from intensity
      activityType = getActivityType(
        mostIntenseActivity.exerciseIntensity,
        (mostIntenseActivity as any).exercise?.category
      );

      // Determine if outdoor
      const isOutdoor = isOutdoorActivity(
        mostIntenseActivity.location,
        mostIntenseActivity.tags
      );
      activityLocation = isOutdoor ? 'outdoor' : 'indoor';

      // Get duration
      activityDuration = mostIntenseActivity.durationMinutes;

      console.log(`[HAWK] Most intense activity: ${mostIntenseActivity.title}`);
      console.log(`[HAWK] - Type: ${activityType}`);
      console.log(`[HAWK] - Location: ${activityLocation}`);
      console.log(`[HAWK] - Duration: ${activityDuration} min`);
      console.log(`[HAWK] - Intensity: ${mostIntenseActivity.exerciseIntensity}/10`);
    }

    // Analyze for HAWK alerts with REAL calendar activity data
    const alerts = analyzeForHAWKAlerts({
      // Patient data
      ejectionFraction: patient.ejectionFraction,
      hasHeartFailure: patient.heartConditions?.some(c =>
        c.toLowerCase().includes('heart failure') ||
        c.toLowerCase().includes('chf')
      ),
      medications: patient.medicationsAffectingHR || [],

      // Hydration data
      currentHydration,
      targetHydration,

      // Weather data
      temperature,
      humidity,
      weatherCondition,

      // Activity data from REAL calendar events
      activityType,
      activityLocation,
      activityDuration,
    });

    res.json({
      alerts,
      context: {
        patientId: patient.id,
        weather: temperature ? { temperature, humidity, weatherCondition } : null,
        hydration: { current: currentHydration, target: targetHydration },
      },
    });
  } catch (error: any) {
    console.error('[HAWK API] Error generating alerts:', error);
    res.status(500).json({ error: 'Failed to generate HAWK alerts' });
  }
});

/**
 * GET /api/hawk/alerts/patient/:userId
 * Get active HAWK alerts for a specific patient (therapist view)
 */
router.get('/alerts/patient/:userId', authenticateToken, async (req: any, res) => {
  try {
    const requestingUser = req.user;
    const targetUserId = parseInt(req.params.userId);

    // Check if requesting user is therapist/admin
    if (requestingUser.role !== 'therapist' && requestingUser.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized - therapist access only' });
    }

    // Get patient profile
    const patient = await Patient.findOne({ where: { userId: targetUserId } });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Get current weather
    let temperature: number | undefined;
    let humidity: number | undefined;
    let weatherCondition: 'safe' | 'caution' | 'danger' | 'extreme' | undefined;

    if (patient.city && patient.state) {
      try {
        const weather = await getCurrentWeather(patient.city, patient.state);
        temperature = weather.temp;
        humidity = weather.humidity;
        weatherCondition = weather.condition;
      } catch (error) {
        console.warn('[HAWK] Could not fetch weather for patient');
      }
    }

    // Get today's hydration status
    const today = format(new Date(), 'yyyy-MM-dd');
    const hydrationLog = await HydrationLog.findOne({
      where: {
        userId: targetUserId,
        date: today,
      },
    });

    const currentHydration = hydrationLog?.totalOunces || 0;
    const targetHydration = hydrationLog?.targetOunces || 64;

    // Get today's scheduled calendar events for this patient
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const todayEvents = await CalendarEvent.findAll({
      where: {
        patientId: targetUserId,
        status: 'scheduled',
        startTime: {
          [require('sequelize').Op.between]: [todayStart, todayEnd],
        },
        deletedAt: null,
      },
      include: [
        {
          model: Exercise,
          as: 'exercise',
          required: false,
        },
      ],
    });

    console.log(`[HAWK] Found ${todayEvents.length} scheduled events for patient ${targetUserId}`);

    // Find the most intense activity
    let mostIntenseActivity = null;
    let maxIntensity = 0;

    for (const event of todayEvents) {
      const intensity = event.exerciseIntensity || 0;
      if (intensity > maxIntensity) {
        maxIntensity = intensity;
        mostIntenseActivity = event;
      }
    }

    // Extract activity data
    let activityType: 'light_exercise' | 'moderate_exercise' | 'vigorous_exercise' | undefined = undefined;
    let activityLocation: 'indoor' | 'outdoor' | undefined = undefined;
    let activityDuration: number | undefined = undefined;

    if (mostIntenseActivity) {
      activityType = getActivityType(
        mostIntenseActivity.exerciseIntensity,
        (mostIntenseActivity as any).exercise?.category
      );

      const isOutdoor = isOutdoorActivity(
        mostIntenseActivity.location,
        mostIntenseActivity.tags
      );
      activityLocation = isOutdoor ? 'outdoor' : 'indoor';
      activityDuration = mostIntenseActivity.durationMinutes;

      console.log(`[HAWK] Patient ${targetUserId} - Most intense activity: ${mostIntenseActivity.title}`);
      console.log(`[HAWK] - Type: ${activityType}, Location: ${activityLocation}, Duration: ${activityDuration} min`);
    }

    // Analyze for HAWK alerts with REAL calendar activity data
    const alerts = analyzeForHAWKAlerts({
      ejectionFraction: patient.ejectionFraction,
      hasHeartFailure: patient.heartConditions?.some(c =>
        c.toLowerCase().includes('heart failure') ||
        c.toLowerCase().includes('chf')
      ),
      medications: patient.medicationsAffectingHR || [],
      currentHydration,
      targetHydration,
      temperature,
      humidity,
      weatherCondition,
      activityType,
      activityLocation,
      activityDuration,
    });

    res.json({
      alerts,
      patientId: targetUserId,
      context: {
        weather: temperature ? { temperature, humidity, weatherCondition } : null,
        hydration: { current: currentHydration, target: targetHydration },
        activity: mostIntenseActivity ? {
          title: mostIntenseActivity.title,
          type: activityType,
          location: activityLocation,
          duration: activityDuration,
          intensity: mostIntenseActivity.exerciseIntensity,
        } : null,
      },
    });
  } catch (error: any) {
    console.error('[HAWK API] Error generating patient alerts:', error);
    res.status(500).json({ error: 'Failed to generate HAWK alerts' });
  }
});

/**
 * POST /api/hawk/dismiss/:alertId
 * Dismiss a HAWK alert (only if dismissable)
 */
router.post('/dismiss/:alertId', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const alertId = req.params.alertId;

    // TODO: Store dismissed alerts in database
    // For now, just acknowledge the dismissal

    console.log(`[HAWK] User ${userId} dismissed alert: ${alertId}`);

    res.json({
      success: true,
      message: 'Alert dismissed',
      alertId,
    });
  } catch (error: any) {
    console.error('[HAWK API] Error dismissing alert:', error);
    res.status(500).json({ error: 'Failed to dismiss alert' });
  }
});

export default router;
