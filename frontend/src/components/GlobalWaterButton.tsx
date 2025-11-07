import React, { useState, useEffect } from 'react';
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
  const [currentTotal, setCurrentTotal] = useState(0);

  // Fetch current total for selected date
  const fetchCurrentTotal = async () => {
    if (!user) return;

    try {
      const log = await api.getHydrationLogByDate(selectedDate, user.id);
      setCurrentTotal(Math.round(log.totalOunces || 0));
    } catch {
      // No log exists for this date yet
      setCurrentTotal(0);
    }
  };

  // Fetch total when date changes or panel expands
  useEffect(() => {
    if (isExpanded && user) {
      fetchCurrentTotal();
    }
  }, [selectedDate, isExpanded, user]);

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

        // Update current total in state
        setCurrentTotal(Math.round(updatedLog.totalOunces));

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

        // Update current total in state
        setCurrentTotal(Math.round(newLog.totalOunces));

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

      setCustomAmount('');

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
      {/* Main Floating Button - Luxury Chronographic Design */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          fixed bottom-6 right-6 z-50
          transition-all duration-300 ease-out
          ${isExpanded ? 'scale-110' : 'scale-100'}
          ${isAnimating ? 'animate-pulse' : ''}
        `}
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #E5E4E2 0%, #BCC6CC 30%, #98A2A8 50%, #BCC6CC 70%, #E5E4E2 100%)',
          boxShadow: `
            0 8px 32px rgba(0,0,0,0.6),
            inset 0 2px 4px rgba(255,255,255,0.4),
            inset 0 -2px 4px rgba(0,0,0,0.4)
          `,
          padding: '4px',
        }}
      >
        {/* Inner button face */}
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)',
          boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          {/* Subtle light reflection */}
          <div style={{
            position: 'absolute',
            top: '10%',
            left: '10%',
            width: '40%',
            height: '40%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none',
          }} />

          {isExpanded ? (
            <X
              className="h-7 w-7"
              strokeWidth={3}
              style={{
                color: '#D4AF37',
                filter: 'drop-shadow(0 0 6px rgba(212, 175, 55, 0.6))',
              }}
            />
          ) : (
            <Droplet
              className="h-8 w-8"
              fill="#06b6d4"
              style={{
                color: '#06b6d4',
                filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.8))',
              }}
            />
          )}
        </div>

        {/* Subtle glow ring */}
        {!isExpanded && (
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{
              background: 'radial-gradient(circle, rgba(6, 182, 212, 0.6) 0%, transparent 70%)',
            }}
          />
        )}
      </button>

      {/* Expanded Panel - Luxury Design */}
      {isExpanded && (
        <div className="fixed bottom-28 right-6 z-50 flex flex-col gap-4 animate-slide-up" style={{
          maxHeight: '450px',
          overflowY: 'auto',
        }}>
          {/* Date Display & Picker - Platinum Bezel Design */}
          <div style={{
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #E5E4E2 0%, #BCC6CC 30%, #98A2A8 50%, #BCC6CC 70%, #E5E4E2 100%)',
            padding: '3px',
            boxShadow: `
              0 8px 24px rgba(0,0,0,0.5),
              inset 0 2px 4px rgba(255,255,255,0.4),
              inset 0 -2px 4px rgba(0,0,0,0.4)
            `,
          }}>
            <div style={{
              background: 'radial-gradient(circle at 35% 35%, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)',
              borderRadius: '14px',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.8)',
              position: 'relative',
            }}>
              {/* Subtle light reflection */}
              <div style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                width: '30%',
                height: '30%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
                borderRadius: '50%',
                pointerEvents: 'none',
              }} />

              {/* Header with calendar icon */}
              <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
                <span style={{
                  color: '#D4AF37',
                  fontSize: '11px',
                  fontWeight: '600',
                  fontFamily: '"SF Pro Display", -apple-system, sans-serif',
                  letterSpacing: '1.5px',
                  textShadow: '0 0 8px rgba(212, 175, 55, 0.6)',
                }}>
                  LOGGING DATE
                </span>
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="transition-all duration-200 p-1 rounded hover:bg-white/5"
                  style={{
                    color: '#D4AF37',
                    filter: 'drop-shadow(0 0 4px rgba(212, 175, 55, 0.6))',
                  }}
                >
                  <CalendarIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Date display/input */}
              <div className="text-center relative z-10">
                {showDatePicker ? (
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={handleDateChange}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full px-4 py-3 rounded-xl text-base font-bold border-2 focus:outline-none transition-all"
                    style={{
                      background: 'radial-gradient(circle at center, #1a1a1a 0%, #0a0a0a 100%)',
                      color: '#C0C0C0',
                      borderColor: 'rgba(212, 175, 55, 0.4)',
                      fontFamily: '"SF Pro Display", -apple-system, sans-serif',
                      letterSpacing: '0.5px',
                      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)',
                      colorScheme: 'dark',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#D4AF37';
                      e.target.style.boxShadow = 'inset 0 2px 8px rgba(0,0,0,0.6), 0 0 12px rgba(212, 175, 55, 0.4)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(212, 175, 55, 0.4)';
                      e.target.style.boxShadow = 'inset 0 2px 8px rgba(0,0,0,0.6)';
                    }}
                  />
                ) : (
                  <span style={{
                    color: '#C0C0C0',
                    fontSize: '16px',
                    fontWeight: '600',
                    fontFamily: '"SF Pro Display", -apple-system, sans-serif',
                    letterSpacing: '0.5px',
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  }}>
                    {format(new Date(selectedDate), 'MMM dd, yyyy')}
                  </span>
                )}
              </div>

              {/* Status indicator */}
              <p style={{
                color: selectedDate === format(new Date(), 'yyyy-MM-dd') ? '#06b6d4' : '#D4AF37',
                fontSize: '10px',
                textAlign: 'center',
                marginTop: '12px',
                fontWeight: '600',
                fontFamily: '"SF Pro Display", -apple-system, sans-serif',
                letterSpacing: '1.2px',
                textShadow: selectedDate === format(new Date(), 'yyyy-MM-dd')
                  ? '0 0 8px rgba(6, 182, 212, 0.6)'
                  : '0 0 8px rgba(212, 175, 55, 0.6)',
              }}>
                {selectedDate === format(new Date(), 'yyyy-MM-dd') ? '● CURRENT SESSION' : '● HISTORICAL LOG'}
              </p>
            </div>
          </div>

          {/* Running Total Display - Platinum Design */}
          <div style={{
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #E5E4E2 0%, #BCC6CC 30%, #98A2A8 50%, #BCC6CC 70%, #E5E4E2 100%)',
            padding: '3px',
            boxShadow: `
              0 8px 24px rgba(0,0,0,0.5),
              inset 0 2px 4px rgba(255,255,255,0.4),
              inset 0 -2px 4px rgba(0,0,0,0.4)
            `,
          }}>
            <div style={{
              background: 'radial-gradient(circle at 35% 35%, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)',
              borderRadius: '14px',
              padding: '16px',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.8)',
              position: 'relative',
              textAlign: 'center',
            }}>
              {/* Subtle light reflection */}
              <div style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                width: '30%',
                height: '30%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
                borderRadius: '50%',
                pointerEvents: 'none',
              }} />

              {/* Label */}
              <div style={{
                color: '#06b6d4',
                fontSize: '10px',
                fontWeight: '600',
                fontFamily: '"SF Pro Display", -apple-system, sans-serif',
                letterSpacing: '1.5px',
                textShadow: '0 0 8px rgba(6, 182, 212, 0.6)',
                marginBottom: '8px',
                position: 'relative',
                zIndex: 10,
              }}>
                DAILY TOTAL
              </div>

              {/* Total Amount */}
              <div className="flex items-center justify-center gap-2 relative z-10">
                <Droplet
                  className="h-6 w-6"
                  fill="#06b6d4"
                  style={{
                    color: '#06b6d4',
                    filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.8))',
                  }}
                />
                <span style={{
                  color: '#C0C0C0',
                  fontSize: '24px',
                  fontWeight: '700',
                  fontFamily: '"SF Pro Display", -apple-system, sans-serif',
                  letterSpacing: '0.5px',
                  textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                }}>
                  {currentTotal}
                </span>
                <span style={{
                  color: '#06b6d4',
                  fontSize: '14px',
                  fontWeight: '600',
                  fontFamily: '"SF Pro Display", -apple-system, sans-serif',
                  letterSpacing: '0.5px',
                  textShadow: '0 0 6px rgba(6, 182, 212, 0.6)',
                }}>
                  oz
                </span>
              </div>
            </div>
          </div>

          {/* Quick add buttons - Platinum Design */}
          {[4, 8, 12, 16, 32].map((oz) => (
            <button
              key={oz}
              onClick={() => handleAddWater(oz)}
              className="transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #E5E4E2 0%, #BCC6CC 30%, #98A2A8 50%, #BCC6CC 70%, #E5E4E2 100%)',
                boxShadow: `
                  0 6px 20px rgba(0,0,0,0.5),
                  inset 0 2px 4px rgba(255,255,255,0.4),
                  inset 0 -2px 4px rgba(0,0,0,0.4)
                `,
                padding: '4px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `
                  0 8px 28px rgba(0,0,0,0.6),
                  0 0 20px rgba(6, 182, 212, 0.4),
                  inset 0 2px 4px rgba(255,255,255,0.5),
                  inset 0 -2px 4px rgba(0,0,0,0.5)
                `;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = `
                  0 6px 20px rgba(0,0,0,0.5),
                  inset 0 2px 4px rgba(255,255,255,0.4),
                  inset 0 -2px 4px rgba(0,0,0,0.4)
                `;
              }}
            >
              {/* Inner button face */}
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)',
                boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                {/* Subtle light reflection */}
                <div style={{
                  position: 'absolute',
                  top: '10%',
                  left: '10%',
                  width: '40%',
                  height: '40%',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
                  borderRadius: '50%',
                  pointerEvents: 'none',
                }} />

                {/* Water droplet icon + amount */}
                <div className="flex flex-col items-center justify-center relative z-10">
                  <Droplet
                    className="h-5 w-5 mb-0.5"
                    fill="#06b6d4"
                    style={{
                      color: '#06b6d4',
                      filter: 'drop-shadow(0 0 6px rgba(6, 182, 212, 0.8))',
                    }}
                  />
                  <span style={{
                    color: '#C0C0C0',
                    fontSize: '13px',
                    fontWeight: '700',
                    fontFamily: '"SF Pro Display", -apple-system, sans-serif',
                    letterSpacing: '0.5px',
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  }}>
                    +{oz}
                  </span>
                </div>
              </div>
            </button>
          ))}

          {/* Custom amount input - Platinum Design */}
          <div className="relative">
            {customAmount ? (
              <form onSubmit={handleCustomSubmit} className="flex flex-col gap-3">
                {/* Custom input field */}
                <div style={{
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #E5E4E2 0%, #BCC6CC 30%, #98A2A8 50%, #BCC6CC 70%, #E5E4E2 100%)',
                  padding: '3px',
                  boxShadow: `
                    0 6px 20px rgba(0,0,0,0.5),
                    inset 0 2px 4px rgba(255,255,255,0.4),
                    inset 0 -2px 4px rgba(0,0,0,0.4)
                  `,
                }}>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="oz"
                    autoFocus
                    min="1"
                    step="1"
                    className="text-center font-bold focus:outline-none"
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '14px',
                      background: 'radial-gradient(circle at center, #1a1a1a 0%, #0a0a0a 100%)',
                      color: '#C0C0C0',
                      fontFamily: '"SF Pro Display", -apple-system, sans-serif',
                      fontSize: '16px',
                      letterSpacing: '0.5px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8)',
                    }}
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #E5E4E2 0%, #BCC6CC 30%, #98A2A8 50%, #BCC6CC 70%, #E5E4E2 100%)',
                    padding: '3px',
                    boxShadow: `
                      0 6px 20px rgba(0,0,0,0.5),
                      inset 0 2px 4px rgba(255,255,255,0.4),
                      inset 0 -2px 4px rgba(0,0,0,0.4)
                    `,
                  }}
                >
                  <div style={{
                    padding: '8px 20px',
                    borderRadius: '10px',
                    background: 'radial-gradient(circle at 35% 35%, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8)',
                  }}>
                    <span style={{
                      color: '#D4AF37',
                      fontSize: '12px',
                      fontWeight: '700',
                      fontFamily: '"SF Pro Display", -apple-system, sans-serif',
                      letterSpacing: '1px',
                      textShadow: '0 0 8px rgba(212, 175, 55, 0.6)',
                    }}>
                      ✓ ADD CUSTOM
                    </span>
                  </div>
                </button>
              </form>
            ) : (
              <button
                onClick={() => setCustomAmount('0')}
                className="transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #E5E4E2 0%, #BCC6CC 30%, #98A2A8 50%, #BCC6CC 70%, #E5E4E2 100%)',
                  boxShadow: `
                    0 6px 20px rgba(0,0,0,0.5),
                    inset 0 2px 4px rgba(255,255,255,0.4),
                    inset 0 -2px 4px rgba(0,0,0,0.4)
                  `,
                  padding: '4px',
                }}
              >
                <div style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 35%, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)',
                  boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  border: '2px dashed rgba(212, 175, 55, 0.4)',
                }}>
                  <Plus
                    className="h-7 w-7"
                    strokeWidth={3}
                    style={{
                      color: '#D4AF37',
                      filter: 'drop-shadow(0 0 6px rgba(212, 175, 55, 0.6))',
                    }}
                  />
                </div>
              </button>
            )}
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

        /* Custom scrollbar for expanded panel */
        .fixed.z-50.flex.flex-col::-webkit-scrollbar {
          width: 6px;
        }

        .fixed.z-50.flex.flex-col::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }

        .fixed.z-50.flex.flex-col::-webkit-scrollbar-thumb {
          background: rgba(212, 175, 55, 0.5);
          border-radius: 3px;
        }

        .fixed.z-50.flex.flex-col::-webkit-scrollbar-thumb:hover {
          background: rgba(212, 175, 55, 0.7);
        }
      `}</style>
    </>
  );
}
