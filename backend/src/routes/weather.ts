import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { getCurrentWeather, getWeatherForDate, calculateWeatherHydrationAdjustment } from '../services/weatherService';
import Patient from '../models/Patient';

const router = express.Router();

/**
 * GET /api/weather/current
 * Get current weather for logged-in user's location
 */
router.get('/current', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;

    // Query User first, then LEFT JOIN Patient profile (optional extended profile)
    const patient = await Patient.findOne({ where: { userId } });

    // Try to get location from Patient profile if it exists
    let city = patient?.city;
    let state = patient?.state;

    // If no Patient profile or no location, use default location
    // This allows weather widget to work for ALL users, not just those with Patient profiles
    if (!city || !state) {
      // Default to a reasonable location (can be configured via env var)
      city = process.env.DEFAULT_CITY || 'New York';
      state = process.env.DEFAULT_STATE || 'NY';
      console.log(`[WEATHER] No location in profile for user ${userId}, using default: ${city}, ${state}`);
    }

    const weather = await getCurrentWeather(city, state);

    // Calculate hydration adjustment
    const hydrationAdjustment = calculateWeatherHydrationAdjustment(weather);

    res.json({
      weather,
      hydrationAdjustment,
      location: {
        city,
        state,
        isDefault: !patient?.city || !patient?.state, // Flag to indicate if using default
      },
    });
  } catch (error: any) {
    console.error('[WEATHER API] Error fetching current weather:', error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

/**
 * GET /api/weather/forecast/:date
 * Get weather forecast for a specific date (for calendar activities)
 */
router.get('/forecast/:date', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const targetDate = new Date(req.params.date);

    // Query User first, then LEFT JOIN Patient profile (optional extended profile)
    const patient = await Patient.findOne({ where: { userId } });

    // Try to get location from Patient profile if it exists
    let city = patient?.city;
    let state = patient?.state;

    // If no Patient profile or no location, use default location
    if (!city || !state) {
      city = process.env.DEFAULT_CITY || 'New York';
      state = process.env.DEFAULT_STATE || 'NY';
      console.log(`[WEATHER] No location in profile for user ${userId}, using default: ${city}, ${state}`);
    }

    const weather = await getWeatherForDate(city, state, targetDate);

    // Calculate hydration adjustment
    const hydrationAdjustment = calculateWeatherHydrationAdjustment(weather);

    res.json({
      weather,
      hydrationAdjustment,
      location: {
        city,
        state,
        isDefault: !patient?.city || !patient?.state,
      },
      date: targetDate.toISOString(),
    });
  } catch (error: any) {
    console.error('[WEATHER API] Error fetching forecast:', error);
    res.status(500).json({ error: 'Failed to fetch weather forecast' });
  }
});

/**
 * GET /api/weather/patient/:userId
 * Get current weather for a specific patient (for therapists viewing patient)
 */
router.get('/patient/:userId', authenticateToken, async (req: any, res) => {
  try {
    const requestingUserId = req.user.id;
    const targetUserId = parseInt(req.params.userId);

    // Check if requesting user is therapist/admin
    const requestingUser = req.user;
    if (requestingUser.role !== 'therapist' && requestingUser.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized - therapist access only' });
    }

    // Get target patient profile
    const patient = await Patient.findOne({ where: { userId: targetUserId } });

    if (!patient || !patient.city || !patient.state) {
      return res.status(404).json({
        error: 'Patient location not found',
      });
    }

    const weather = await getCurrentWeather(patient.city, patient.state);
    const hydrationAdjustment = calculateWeatherHydrationAdjustment(weather);

    res.json({
      weather,
      hydrationAdjustment,
      location: {
        city: patient.city,
        state: patient.state,
      },
      patientId: targetUserId,
    });
  } catch (error: any) {
    console.error('[WEATHER API] Error fetching patient weather:', error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

export default router;
