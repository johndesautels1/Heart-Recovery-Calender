import React, { useState, useEffect } from 'react';
import { Cloud, X, ThermometerSun, Droplets, Wind, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface WeatherData {
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  description: string;
  condition: 'safe' | 'caution' | 'danger' | 'extreme';
  icon: string;
}

export function GlobalWeatherWidget() {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch current weather
  useEffect(() => {
    const fetchWeather = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const response = await api.getCurrentWeather();
        console.log('[WEATHER] API Response:', response);

        if (response.weather) {
          setWeather({
            temp: response.weather.temp,
            feels_like: response.weather.feels_like,
            humidity: response.weather.humidity,
            wind_speed: response.weather.wind_speed,
            description: response.weather.description,
            condition: response.weather.condition,
            icon: response.weather.icon,
          });
          console.log('[WEATHER] Weather data set:', response.weather);
        } else {
          console.log('[WEATHER] No weather data in response');
        }
      } catch (error) {
        console.error('[WEATHER] Failed to fetch weather:', error);
        setWeather(null);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();

    // Refresh weather every 15 minutes
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  // Don't show if no weather data yet
  if (!weather) {
    console.log('[WEATHER] Widget hidden - no weather data');
    return null;
  }

  const getConditionStyle = () => {
    switch (weather.condition) {
      case 'extreme':
        return {
          bg: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
          shadow: '0 0 30px rgba(220, 38, 38, 0.7), 0 0 60px rgba(220, 38, 38, 0.4)',
          icon: 'text-red-400',
          pulse: true,
        };
      case 'danger':
        return {
          bg: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
          shadow: '0 0 30px rgba(249, 115, 22, 0.6), 0 0 60px rgba(249, 115, 22, 0.3)',
          icon: 'text-orange-400',
          pulse: true,
        };
      case 'caution':
        return {
          bg: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
          shadow: '0 0 25px rgba(234, 179, 8, 0.5), 0 0 50px rgba(234, 179, 8, 0.2)',
          icon: 'text-yellow-400',
          pulse: false,
        };
      default:
        return {
          bg: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%)',
          shadow: '0 0 30px rgba(6, 182, 212, 0.6), 0 0 60px rgba(6, 182, 212, 0.3)',
          icon: 'text-cyan-300',
          pulse: false,
        };
    }
  };

  const style = getConditionStyle();

  return (
    <>
      {/* Main Floating Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          fixed bottom-6 left-[60px] z-50
          w-16 h-16 rounded-full
          flex items-center justify-center
          transition-all duration-300 ease-out
          ${isExpanded ? 'scale-110' : 'scale-100'}
          ${style.pulse ? 'animate-pulse' : ''}
        `}
        style={{
          background: style.bg,
          boxShadow: style.shadow,
        }}
      >
        {isExpanded ? (
          <X className="h-7 w-7 text-white drop-shadow-lg" strokeWidth={3} />
        ) : (
          <div className="relative">
            <ThermometerSun className={`h-7 w-7 text-white drop-shadow-lg`} strokeWidth={2.5} />

            {/* Alert indicator */}
            {weather.condition !== 'safe' && (
              <div
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white animate-pulse"
              />
            )}
          </div>
        )}

        {/* Ripple effect */}
        <div
          className="absolute inset-0 rounded-full animate-ping opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, transparent 70%)',
          }}
        />
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="fixed bottom-24 left-[60px] z-50 w-80 animate-slide-up">
          <div
            className="rounded-2xl p-5 border-2"
            style={{
              background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95))',
              backdropFilter: 'blur(10px)',
              borderColor: weather.condition === 'extreme' ? '#dc2626'
                : weather.condition === 'danger' ? '#f97316'
                : weather.condition === 'caution' ? '#eab308'
                : '#06b6d4',
              boxShadow: style.shadow,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Cloud className={`h-6 w-6 ${style.icon}`} />
                <div>
                  <h3 className="text-white font-bold text-lg">Weather</h3>
                  <p className="text-gray-400 text-xs">Your Location</p>
                </div>
              </div>
              {weather.condition !== 'safe' && (
                <AlertTriangle className="h-6 w-6 text-red-400 animate-pulse" />
              )}
            </div>

            {/* Temperature Display */}
            <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-xl p-4 mb-4 border border-cyan-500/40">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-white">{Math.round(weather.temp)}°</span>
                    <span className="text-xl text-gray-400">F</span>
                  </div>
                  <p className="text-cyan-300 text-sm mt-1 capitalize">{weather.description}</p>
                </div>
                <ThermometerSun className={`h-16 w-16 ${style.icon}`} />
              </div>

              {/* Feels Like */}
              {Math.abs(weather.feels_like - weather.temp) >= 5 && (
                <div className="mt-3 pt-3 border-t border-cyan-500/30">
                  <p className="text-gray-300 text-sm">
                    Feels like <span className="font-bold text-white">{Math.round(weather.feels_like)}°F</span>
                  </p>
                </div>
              )}
            </div>

            {/* Weather Details */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Humidity */}
              <div className="bg-blue-950/50 rounded-lg p-3 border border-blue-500/30">
                <div className="flex items-center gap-2 mb-1">
                  <Droplets className="h-4 w-4 text-blue-400" />
                  <span className="text-xs text-gray-400">Humidity</span>
                </div>
                <p className="text-white font-bold text-lg">{weather.humidity}%</p>
              </div>

              {/* Wind */}
              <div className="bg-blue-950/50 rounded-lg p-3 border border-blue-500/30">
                <div className="flex items-center gap-2 mb-1">
                  <Wind className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs text-gray-400">Wind</span>
                </div>
                <p className="text-white font-bold text-lg">{Math.round(weather.wind_speed)} mph</p>
              </div>
            </div>

            {/* Health Warning */}
            {weather.condition !== 'safe' && (
              <div
                className={`
                  rounded-xl p-4 border-2
                  ${weather.condition === 'extreme' ? 'bg-red-950/50 border-red-500' : ''}
                  ${weather.condition === 'danger' ? 'bg-orange-950/50 border-orange-500' : ''}
                  ${weather.condition === 'caution' ? 'bg-yellow-950/50 border-yellow-500' : ''}
                `}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                    weather.condition === 'extreme' ? 'text-red-400'
                    : weather.condition === 'danger' ? 'text-orange-400'
                    : 'text-yellow-400'
                  }`} />
                  <div>
                    <h4 className="text-white font-bold text-sm mb-1">
                      {weather.condition === 'extreme' && 'EXTREME HEAT WARNING'}
                      {weather.condition === 'danger' && 'Heat Advisory'}
                      {weather.condition === 'caution' && 'Warm Weather Alert'}
                    </h4>
                    <p className="text-gray-300 text-xs">
                      {weather.condition === 'extreme' && 'Life-threatening heat! Avoid outdoor activity. Stay hydrated and indoors with AC.'}
                      {weather.condition === 'danger' && 'High heat conditions. Increase water intake significantly. Limit outdoor exercise.'}
                      {weather.condition === 'caution' && 'Warm conditions. Stay hydrated and monitor for symptoms.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Last Updated */}
            <p className="text-center text-xs text-gray-500 mt-4">
              Updated every 15 minutes
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
