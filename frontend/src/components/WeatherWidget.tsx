import React, { useState, useEffect } from 'react';
import { Cloud, Droplets, Wind, AlertTriangle, ThermometerSun, CloudRain } from 'lucide-react';
import { api } from '../services/api';
import { format } from 'date-fns';

interface WeatherWidgetProps {
  city: string;
  state: string;
  date?: Date; // For forecast
  isOutdoor?: boolean; // Show warning if outdoor activity
  className?: string;
}

interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  description: string;
  condition: 'safe' | 'caution' | 'danger' | 'extreme';
}

export function WeatherWidget({ city, state, date, isOutdoor = false, className = '' }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!city || !state) return;

      setLoading(true);
      try {
        let response;

        if (date) {
          // Fetch forecast for specific date
          const dateStr = format(date, 'yyyy-MM-dd');
          response = await api.getWeatherForecast(dateStr);
        } else {
          // Fetch current weather
          response = await api.getCurrentWeather();
        }

        if (response.weather) {
          setWeather({
            temp: response.weather.temp,
            feelsLike: response.weather.feels_like,
            humidity: response.weather.humidity,
            description: response.weather.description,
            condition: response.weather.condition,
          });
        }
      } catch (error) {
        console.error('[WEATHER] Failed to fetch weather:', error);
        setWeather(null);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [city, state, date]);

  if (!weather) return null;

  const getConditionStyle = () => {
    switch (weather.condition) {
      case 'extreme':
        return {
          bg: 'from-red-900/40 to-red-800/40',
          border: 'border-red-500/60',
          text: 'text-red-300',
          icon: 'text-red-400',
        };
      case 'danger':
        return {
          bg: 'from-orange-900/40 to-orange-800/40',
          border: 'border-orange-500/60',
          text: 'text-orange-300',
          icon: 'text-orange-400',
        };
      case 'caution':
        return {
          bg: 'from-yellow-900/40 to-yellow-800/40',
          border: 'border-yellow-500/60',
          text: 'text-yellow-300',
          icon: 'text-yellow-400',
        };
      default:
        return {
          bg: 'from-blue-900/30 to-cyan-900/30',
          border: 'border-cyan-500/40',
          text: 'text-cyan-300',
          icon: 'text-cyan-400',
        };
    }
  };

  const style = getConditionStyle();

  return (
    <div
      className={`bg-gradient-to-br ${style.bg} rounded-lg p-2 border ${style.border} ${className}`}
      style={{
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <ThermometerSun className={`h-4 w-4 ${style.icon}`} />
          <span className={`text-sm font-bold ${style.text}`}>
            {weather.temp}°F
          </span>
          {weather.condition !== 'safe' && isOutdoor && (
            <AlertTriangle className="h-3.5 w-3.5 text-red-400 animate-pulse" />
          )}
        </div>
        <div className="flex items-center gap-1">
          <Droplets className={`h-3.5 w-3.5 ${style.icon}`} />
          <span className={`text-xs ${style.text}`}>{weather.humidity}%</span>
        </div>
      </div>

      {/* Warning for Outdoor + Dangerous Weather */}
      {isOutdoor && weather.condition !== 'safe' && (
        <div className={`text-xs ${style.text} font-semibold flex items-center gap-1 mt-1`}>
          <AlertTriangle className="h-3 w-3" />
          {weather.condition === 'extreme' && 'EXTREME HEAT'}
          {weather.condition === 'danger' && 'Hot - Increase H₂O'}
          {weather.condition === 'caution' && 'Warm - Stay hydrated'}
        </div>
      )}

      {/* Feels Like (if significantly different) */}
      {Math.abs(weather.feelsLike - weather.temp) >= 5 && (
        <div className={`text-xs ${style.text} mt-0.5`}>
          Feels: {weather.feelsLike}°F
        </div>
      )}
    </div>
  );
}
