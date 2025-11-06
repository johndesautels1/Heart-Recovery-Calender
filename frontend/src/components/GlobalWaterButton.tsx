import React, { useState } from 'react';
import { Droplet, Plus, X, Calendar as CalendarIcon } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

export function GlobalWaterButton() {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleAddWater = async (ounces: number) => {
    if (!user) {
      toast.error('Please log in to track water intake');
      return;
    }

    // CRITICAL: Ensure ounces is an integer
    const ouncesInt = Math.round(ounces);

    console.log(`[WATER] Adding ${ouncesInt} oz for date: ${selectedDate}`);

    try {
      setIsAnimating(true);

      // Fetch log for selected date
      let existingLog;
      try {
        existingLog = await api.getHydrationLogByDate(selectedDate, user.id);
        console.log('[WATER] Found existing log:', existingLog);
      } catch {
        // No log exists yet
        existingLog = null;
        console.log('[WATER] No existing log found');
      }

      if (existingLog) {
        // CRITICAL: Use Math.round to ensure integer arithmetic
        const currentTotal = Math.round(existingLog.totalOunces || 0);
        const newTotal = currentTotal + ouncesInt;

        console.log(`[WATER] Updating: ${currentTotal} + ${ouncesInt} = ${newTotal}`);

        // Update existing log
        const updatedLog = await api.updateHydrationLog(existingLog.id, {
          totalOunces: newTotal,
        });

        console.log('[WATER] Updated log:', updatedLog);

        toast.success(`💧 +${ouncesInt} oz for ${selectedDate}! Total: ${Math.round(updatedLog.totalOunces)} oz`, {
          icon: '💧',
          duration: 3000,
          style: {
            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            color: '#fff',
            fontWeight: 'bold',
          },
        });
      } else {
        // Create new log
        console.log(`[WATER] Creating new log with ${ouncesInt} oz`);

        const newLog = await api.createHydrationLog({
          date: selectedDate,
          totalOunces: ouncesInt,
          userId: user.id,
        });

        console.log('[WATER] Created log:', newLog);

        toast.success(`💧 +${ouncesInt} oz for ${selectedDate}! Total: ${Math.round(newLog.totalOunces)} oz`, {
          icon: '💧',
          duration: 3000,
          style: {
            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            color: '#fff',
            fontWeight: 'bold',
          },
        });
      }

      setIsExpanded(false);
      setCustomAmount('');
      setShowDatePicker(false);

      // Trigger page reload to update all hydration displays
      window.dispatchEvent(new Event('hydration-updated'));
    } catch (error: any) {
      console.error('[WATER] Failed to log water intake:', error);
      console.error('[WATER] Error details:', error.response?.data || error.message);
      toast.error(`Failed to log water intake: ${error.response?.data?.error || error.message}`);
    } finally {
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // CRITICAL: Parse as integer, not float
    const ounces = parseInt(customAmount, 10);
    if (isNaN(ounces) || ounces <= 0) {
      toast.error('Please enter a valid whole number');
      return;
    }
    handleAddWater(ounces);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    toast.info(`Date set to: ${format(new Date(e.target.value), 'MMM dd, yyyy')}`, {
      duration: 2000,
    });
  };

  return (
    <>
      {/* Main Floating Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          fixed bottom-6 right-6 z-50
          w-16 h-16 rounded-full
          flex items-center justify-center
          transition-all duration-300 ease-out
          ${isExpanded ? 'scale-110 rotate-180' : 'scale-100 rotate-0'}
          ${isAnimating ? 'animate-pulse' : ''}
        `}
        style={{
          background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%)',
          boxShadow: `
            0 0 30px rgba(6, 182, 212, 0.6),
            0 0 60px rgba(6, 182, 212, 0.3),
            0 8px 16px rgba(0, 0, 0, 0.4),
            inset 0 2px 0 rgba(255, 255, 255, 0.3),
            inset 0 -2px 0 rgba(0, 0, 0, 0.2)
          `,
        }}
      >
        {isExpanded ? (
          <X className="h-7 w-7 text-white drop-shadow-lg" strokeWidth={3} />
        ) : (
          <Droplet className="h-8 w-8 text-white drop-shadow-lg" fill="currentColor" />
        )}

        {/* Ripple effect */}
        <div
          className="absolute inset-0 rounded-full animate-ping opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.8) 0%, transparent 70%)',
          }}
        />

        {/* Floating bubbles */}
        {!isExpanded && (
          <>
            <div className="absolute bottom-2 left-3 w-2 h-2 bg-white/60 rounded-full animate-bubble-float" />
            <div className="absolute bottom-3 right-4 w-1.5 h-1.5 bg-white/50 rounded-full animate-bubble-float-delayed" />
          </>
        )}
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-3 animate-slide-up">
          {/* Date Display & Picker */}
          <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-2xl p-4 border-2 border-purple-500" style={{
            boxShadow: '0 4px 20px rgba(168, 85, 247, 0.5), 0 0 40px rgba(168, 85, 247, 0.3)',
          }}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-white text-sm font-bold">📅 Logging for:</span>
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="text-purple-300 hover:text-purple-200 transition-colors p-1 rounded hover:bg-purple-700"
              >
                <CalendarIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="text-center">
              {showDatePicker ? (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full bg-purple-950 text-white px-4 py-3 rounded-xl text-base font-bold border-2 border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-500 focus:border-purple-300"
                  style={{
                    colorScheme: 'dark',
                    fontSize: '16px',
                  }}
                />
              ) : (
                <span className="text-purple-200 font-bold text-base">
                  {format(new Date(selectedDate), 'MMM dd, yyyy')}
                </span>
              )}
            </div>
            <p className="text-purple-300 text-sm text-center mt-2 font-semibold">
              {selectedDate === format(new Date(), 'yyyy-MM-dd') ? '✨ Today' : '📜 Historic Entry'}
            </p>
          </div>

          {/* Quick add buttons */}
          {[4, 8, 12, 16, 32].map((oz) => (
            <button
              key={oz}
              onClick={() => handleAddWater(oz)}
              className="
                w-16 h-16 rounded-full
                flex items-center justify-center
                font-bold text-white
                transition-all duration-200
                hover:scale-110 active:scale-95
                relative overflow-hidden
                group
              "
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                boxShadow: '0 4px 12px rgba(6, 182, 212, 0.4)',
              }}
            >
              {/* Glow effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.3) 0%, transparent 70%)',
                  }}
                />
              </div>

              <span className="relative z-10 text-lg drop-shadow-md">+{oz}</span>
            </button>
          ))}

          {/* Custom amount button */}
          <div className="relative">
            {customAmount ? (
              <form onSubmit={handleCustomSubmit} className="flex flex-col gap-2">
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="oz"
                  autoFocus
                  min="1"
                  step="1"
                  className="
                    w-16 h-16 rounded-full
                    bg-gray-800 border-2 border-cyan-500
                    text-white text-center font-bold
                    focus:outline-none focus:ring-2 focus:ring-cyan-400
                  "
                  style={{
                    boxShadow: '0 4px 12px rgba(6, 182, 212, 0.4)',
                  }}
                />
                <button
                  type="submit"
                  className="
                    w-16 h-10 rounded-full
                    bg-gradient-to-r from-green-500 to-emerald-500
                    text-white font-bold text-sm
                    hover:scale-105 active:scale-95
                    transition-transform
                  "
                  style={{
                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)',
                  }}
                >
                  ✓ Add
                </button>
              </form>
            ) : (
              <button
                onClick={() => setCustomAmount('0')}
                className="
                  w-16 h-16 rounded-full
                  flex items-center justify-center
                  transition-all duration-200
                  hover:scale-110 active:scale-95
                  relative overflow-hidden
                "
                style={{
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.3) 0%, rgba(8, 145, 178, 0.3) 100%)',
                  border: '2px dashed rgba(6, 182, 212, 0.6)',
                  boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)',
                }}
              >
                <Plus className="h-7 w-7 text-cyan-400" strokeWidth={3} />
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes bubble-float {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0.6;
          }
          50% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-20px) scale(0.5);
            opacity: 0;
          }
        }

        @keyframes bubble-float-delayed {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0.6;
          }
          50% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-25px) scale(0.3);
            opacity: 0;
          }
        }

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

        .animate-bubble-float {
          animation: bubble-float 2s ease-in-out infinite;
        }

        .animate-bubble-float-delayed {
          animation: bubble-float-delayed 2.5s ease-in-out infinite 0.5s;
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
