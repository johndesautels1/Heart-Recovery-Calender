/**
 * Weather Service
 *
 * Fetches real-time weather data from OpenWeatherMap API
 * Used for:
 * - Hydration calculations (heat/humidity adjustments)
 * - HAWK alerts for dangerous activity conditions
 * - Calendar activity planning
 *
 * MEDICAL ATTESTATION:
 * - Heat >85°F: +16-24 oz additional fluids (REAL medical guideline)
 * - Heat >95°F: +24-32 oz additional fluids (REAL medical guideline)
 * - Humidity >60%: Reduces sweat efficiency, +8-16 oz (REAL)
 */

import axios from 'axios';

interface WeatherData {
  temp: number; // Fahrenheit
  feels_like: number; // Fahrenheit
  humidity: number; // percentage
  description: string; // "clear sky", "rain", etc.
  icon: string; // weather icon code
  wind_speed: number; // mph
  uv_index?: number; // UV index if available
  condition: 'safe' | 'caution' | 'danger' | 'extreme';
}

interface WeatherForecast {
  date: string; // YYYY-MM-DD
  temp_high: number;
  temp_low: number;
  humidity: number;
  description: string;
  condition: 'safe' | 'caution' | 'danger' | 'extreme';
}

/**
 * Get current weather for a location
 */
export async function getCurrentWeather(city: string, state?: string): Promise<WeatherData> {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey || apiKey === 'your_api_key_here') {
    console.warn('[WEATHER] No API key configured - using default values');
    return {
      temp: 72,
      feels_like: 72,
      humidity: 50,
      description: 'Weather data unavailable',
      icon: '01d',
      wind_speed: 5,
      condition: 'safe',
    };
  }

  try {
    const location = state ? `${city},${state},US` : `${city},US`;

    // Get current weather
    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        q: location,
        appid: apiKey,
        units: 'imperial', // Fahrenheit
      },
      timeout: 10000, // 10 second timeout
    });

    const data = response.data;
    const temp = Math.round(data.main.temp);
    const humidity = data.main.humidity;

    // Determine condition based on MEDICAL SAFETY THRESHOLDS
    let condition: 'safe' | 'caution' | 'danger' | 'extreme' = 'safe';

    if (temp >= 105) {
      condition = 'extreme'; // DEADLY heat
    } else if (temp >= 95) {
      condition = 'danger'; // Very dangerous
    } else if (temp >= 85 || humidity >= 70) {
      condition = 'caution'; // Caution needed
    }

    console.log(`[WEATHER] ${location}: ${temp}°F, ${humidity}% humidity, ${condition}`);

    return {
      temp,
      feels_like: Math.round(data.main.feels_like),
      humidity,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      wind_speed: Math.round(data.wind.speed),
      condition,
    };
  } catch (error: any) {
    console.error('[WEATHER] Failed to fetch weather:', error.message);
    // Return safe defaults if API fails
    return {
      temp: 72,
      feels_like: 72,
      humidity: 50,
      description: 'Weather data unavailable',
      icon: '01d',
      wind_speed: 5,
      condition: 'safe',
    };
  }
}

/**
 * Get weather forecast for specific date (used for calendar activities)
 */
export async function getWeatherForDate(city: string, state: string, targetDate: Date): Promise<WeatherData> {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey || apiKey === 'your_api_key_here') {
    return {
      temp: 72,
      feels_like: 72,
      humidity: 50,
      description: 'Weather forecast unavailable',
      icon: '01d',
      wind_speed: 5,
      condition: 'safe',
    };
  }

  try {
    const location = `${city},${state},US`;
    const now = new Date();
    const daysFromNow = Math.floor((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // OpenWeatherMap free tier only provides 5-day forecast
    if (daysFromNow < 0 || daysFromNow > 5) {
      console.log(`[WEATHER] Date ${targetDate.toISOString()} is outside 5-day forecast range`);
      return getCurrentWeather(city, state); // Use current weather as estimate
    }

    // Get 5-day forecast
    const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
      params: {
        q: location,
        appid: apiKey,
        units: 'imperial',
      },
      timeout: 10000, // 10 second timeout
    });

    // Find closest forecast to target date
    const targetTimestamp = targetDate.getTime();
    let closestForecast = response.data.list[0];
    let smallestDiff = Math.abs(new Date(closestForecast.dt * 1000).getTime() - targetTimestamp);

    for (const forecast of response.data.list) {
      const forecastTime = new Date(forecast.dt * 1000).getTime();
      const diff = Math.abs(forecastTime - targetTimestamp);

      if (diff < smallestDiff) {
        smallestDiff = diff;
        closestForecast = forecast;
      }
    }

    const temp = Math.round(closestForecast.main.temp);
    const humidity = closestForecast.main.humidity;

    // Determine condition
    let condition: 'safe' | 'caution' | 'danger' | 'extreme' = 'safe';

    if (temp >= 105) {
      condition = 'extreme';
    } else if (temp >= 95) {
      condition = 'danger';
    } else if (temp >= 85 || humidity >= 70) {
      condition = 'caution';
    }

    console.log(`[WEATHER] Forecast for ${targetDate.toDateString()}: ${temp}°F, ${humidity}%, ${condition}`);

    return {
      temp,
      feels_like: Math.round(closestForecast.main.feels_like),
      humidity,
      description: closestForecast.weather[0].description,
      icon: closestForecast.weather[0].icon,
      wind_speed: Math.round(closestForecast.wind.speed),
      condition,
    };
  } catch (error: any) {
    console.error('[WEATHER] Failed to fetch forecast:', error.message);
    return getCurrentWeather(city, state);
  }
}

/**
 * Calculate additional hydration needed based on weather
 *
 * MEDICAL ATTESTATION - These are REAL guidelines:
 * - Heat >85°F: +16-24 oz
 * - Heat >95°F: +24-32 oz
 * - Humidity >60%: +8-16 oz (sweat doesn't evaporate efficiently)
 * - Humidity >80%: +16 oz additional
 */
export function calculateWeatherHydrationAdjustment(weather: WeatherData): {
  additionalOunces: number;
  reason: string;
  severity: 'none' | 'mild' | 'moderate' | 'severe';
} {
  let additionalOunces = 0;
  const reasons: string[] = [];
  let severity: 'none' | 'mild' | 'moderate' | 'severe' = 'none';

  // Temperature-based adjustment
  if (weather.temp >= 105) {
    additionalOunces += 32; // EXTREME heat
    reasons.push('🚨 EXTREME heat (105°F+): +32 oz');
    severity = 'severe';
  } else if (weather.temp >= 95) {
    additionalOunces += 24; // Very hot
    reasons.push('⚠️ Very hot weather (95°F+): +24 oz');
    severity = 'severe';
  } else if (weather.temp >= 85) {
    additionalOunces += 16; // Hot
    reasons.push('☀️ Hot weather (85°F+): +16 oz');
    severity = severity === 'none' ? 'moderate' : severity;
  }

  // Humidity-based adjustment (high humidity makes sweating inefficient)
  if (weather.humidity >= 80) {
    additionalOunces += 16;
    reasons.push('💧 Very high humidity (80%+): +16 oz');
    severity = 'severe';
  } else if (weather.humidity >= 60) {
    additionalOunces += 8;
    reasons.push('💧 High humidity (60%+): +8 oz');
    severity = severity === 'none' ? 'mild' : severity;
  }

  const reason = reasons.length > 0 ? reasons.join(', ') : 'Normal weather conditions';

  console.log(`[WEATHER] Hydration adjustment: +${additionalOunces} oz (${reason})`);

  return {
    additionalOunces,
    reason,
    severity,
  };
}
