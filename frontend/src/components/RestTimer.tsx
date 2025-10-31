import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus, Minus, X } from 'lucide-react';

interface RestTimerProps {
  onClose: () => void;
  defaultSeconds?: number;
  isCompact?: boolean;
}

export function RestTimer({ onClose, defaultSeconds = 60, isCompact = false }: RestTimerProps) {
  const [seconds, setSeconds] = useState(defaultSeconds);
  const [initialSeconds, setInitialSeconds] = useState(defaultSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Play completion sound
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm+z7+F7LQUhccPw1o1GDAw+ltPvvmMlBRJMqeHusGghBz2J1fLGcixf');
  }, []);

  useEffect(() => {
    if (isRunning && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsComplete(true);
            // Play sound
            if (audioRef.current) {
              audioRef.current.play().catch(e => console.log('Audio play failed:', e));
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, seconds]);

  const handleStart = () => {
    if (seconds > 0) {
      setIsRunning(true);
      setIsComplete(false);
    }
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsComplete(false);
    setSeconds(initialSeconds);
  };

  const handleAddTime = () => {
    setSeconds(prev => prev + 10);
    setInitialSeconds(prev => prev + 10);
  };

  const handleSubtractTime = () => {
    if (seconds >= 10) {
      setSeconds(prev => prev - 10);
      setInitialSeconds(prev => Math.max(10, prev - 10));
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const progress = initialSeconds > 0 ? ((initialSeconds - seconds) / initialSeconds) * 100 : 0;

  const getTimerColor = () => {
    if (isComplete) return 'from-green-500 to-emerald-600';
    if (seconds <= 10) return 'from-red-500 to-orange-600';
    if (seconds <= 30) return 'from-yellow-500 to-orange-500';
    return 'from-blue-500 to-cyan-600';
  };

  if (isCompact) {
    // Compact rectangular timer for modal overlay
    return (
      <div className="glass rounded-xl p-4 w-full relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-white/20 transition-colors z-10"
        >
          <X className="h-4 w-4 text-white" />
        </button>

        <div className="flex items-center justify-between gap-4">
          {/* Compact Timer Display */}
          <div className="flex items-center gap-3">
            <div className={`text-3xl font-bold bg-gradient-to-br ${getTimerColor()} bg-clip-text text-transparent`}>
              {formatTime(seconds)}
            </div>
            {isComplete && (
              <div className="text-green-500 font-bold text-sm animate-pulse">
                COMPLETE! 💪
              </div>
            )}
          </div>

          {/* Control Buttons - Compact */}
          <div className="flex gap-2">
            <button
              onClick={handleSubtractTime}
              disabled={isRunning}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Minus className="h-4 w-4 text-white" />
            </button>

            {!isRunning ? (
              <button
                onClick={handleStart}
                disabled={seconds === 0}
                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Play className="h-4 w-4" />
                Start
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold hover:scale-105 transition-transform text-sm"
              >
                <Pause className="h-4 w-4" />
                Pause
              </button>
            )}

            <button
              onClick={handleReset}
              className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:scale-105 transition-transform"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              onClick={handleAddTime}
              disabled={isRunning}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Plus className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        {/* Quick Time Presets - Compact */}
        <div className="mt-3 flex gap-2 justify-center">
          {[30, 60, 90, 120].map((time) => (
            <button
              key={time}
              onClick={() => {
                setSeconds(time);
                setInitialSeconds(time);
                setIsRunning(false);
                setIsComplete(false);
              }}
              disabled={isRunning}
              className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {time}s
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Full-screen timer (original design)
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="glass rounded-2xl p-8 max-w-md w-full relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/20 transition-colors"
        >
          <X className="h-5 w-5 text-white" />
        </button>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-6" style={{ color: '#fbbf24' }}>
          Rest Timer ⏱️
        </h2>

        {/* Circular Timer Display */}
        <div className="relative w-64 h-64 mx-auto mb-8">
          {/* Progress Ring */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="128"
              cy="128"
              r="110"
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="20"
            />
            <circle
              cx="128"
              cy="128"
              r="110"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="20"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 110}`}
              strokeDashoffset={`${2 * Math.PI * 110 * (1 - progress / 100)}`}
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" className={`text-${isComplete ? 'green' : 'blue'}-500`} stopColor="currentColor" />
                <stop offset="100%" className={`text-${isComplete ? 'emerald' : 'cyan'}-600`} stopColor="currentColor" />
              </linearGradient>
            </defs>
          </svg>

          {/* Time Display */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={`text-6xl font-bold bg-gradient-to-br ${getTimerColor()} bg-clip-text text-transparent`}>
                {formatTime(seconds)}
              </div>
              {isComplete && (
                <div className="text-green-500 font-bold mt-2 animate-pulse">
                  REST COMPLETE! 💪
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Time Adjustment Buttons */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={handleSubtractTime}
            disabled={isRunning}
            className="p-3 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Minus className="h-5 w-5 text-white" />
          </button>
          <span className="text-white font-bold min-w-[80px] text-center">
            {initialSeconds}s
          </span>
          <button
            onClick={handleAddTime}
            disabled={isRunning}
            className="p-3 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Plus className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-3 justify-center">
          {!isRunning ? (
            <button
              onClick={handleStart}
              disabled={seconds === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="h-5 w-5" />
              Start
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold hover:scale-105 transition-transform"
            >
              <Pause className="h-5 w-5" />
              Pause
            </button>
          )}
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-bold hover:scale-105 transition-transform"
          >
            <RotateCcw className="h-5 w-5" />
            Reset
          </button>
        </div>

        {/* Quick Time Presets */}
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          {[30, 60, 90, 120, 180].map((time) => (
            <button
              key={time}
              onClick={() => {
                setSeconds(time);
                setInitialSeconds(time);
                setIsRunning(false);
                setIsComplete(false);
              }}
              disabled={isRunning}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {time}s
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
