import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface TimeThrottleLeverProps {
  surgeryDate?: string;
  onTimeChange: (view: '7d' | '30d' | '90d' | 'surgery', customDate?: Date) => void;
  currentView: '7d' | '30d' | '90d' | 'surgery';
}

export function TimeThrottleLever({
  surgeryDate,
  onTimeChange,
  currentView,
}: TimeThrottleLeverProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [throttlePosition, setThrottlePosition] = useState(50); // 0-100, 50 is center
  const throttleRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Map throttle position to time view
  useEffect(() => {
    if (!isDragging) {
      // Snap to preset positions when not dragging
      const positionMap: Record<string, number> = {
        '7d': 50,  // Middle position - Last 7 Days
        '30d': 25, // Lower position - 30 Days
        '90d': 75, // Top position - Current (using 90d temporarily for current view)
        'surgery': 0, // Bottom position - Since Surgery
      };
      setThrottlePosition(positionMap[currentView] || 50);
    }
  }, [currentView, isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    const position = Math.max(0, Math.min(100, ((height - y) / height) * 100));

    setThrottlePosition(position);

    // Determine view based on position
    if (position >= 65) {
      onTimeChange('90d'); // Top - CURRENT (using 90d temporarily for current view)
    } else if (position >= 40) {
      onTimeChange('7d');  // Middle - Last 7 Days
    } else if (position >= 15) {
      onTimeChange('30d'); // Lower - 30 Days
    } else {
      onTimeChange('surgery'); // Bottom - Since Surgery Date
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  // Calculate display date based on view
  const getDisplayDate = () => {
    const today = new Date();
    switch (currentView) {
      case '90d':
        // CURRENT - Show today's date (using 90d view temporarily)
        return format(today, 'MMM d, yyyy');
      case '7d':
        return `${format(subDays(today, 7), 'MMM d')} - ${format(today, 'MMM d, yyyy')}`;
      case '30d':
        return `${format(subDays(today, 30), 'MMM d')} - ${format(today, 'MMM d, yyyy')}`;
      case 'surgery':
        if (surgeryDate) {
          return `${format(new Date(surgeryDate), 'MMM d, yyyy')} - ${format(today, 'MMM d, yyyy')}`;
        }
        return 'Full History';
      default:
        return format(today, 'MMM d, yyyy');
    }
  };

  const getViewLabel = () => {
    switch (currentView) {
      case '90d':
        return 'CURRENT';  // Top position - Current readings
      case '7d':
        return 'LAST 7 DAYS';  // Middle position
      case '30d':
        return 'LAST 30 DAYS';  // Lower position
      case 'surgery':
        return 'SINCE SURGERY (SSD)';  // Bottom position
      default:
        return 'CURRENT';
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {/* Display Panel - Centered */}
      <div className="flex justify-center w-full">
        <div
          className="px-5 py-3 rounded-lg"
          style={{
            background: `linear-gradient(135deg,
              #1a1a1a 0%,
              #2d2d2d 10%,
              rgba(212, 175, 55, 0.15) 20%,
              #1e293b 40%,
              #334155 50%,
              #1e293b 60%,
              rgba(212, 175, 55, 0.15) 80%,
              #2d2d2d 90%,
              #1a1a1a 100%)`,
            border: '2px solid rgba(212, 175, 55, 0.4)',
            boxShadow: `
              0 0 20px rgba(212, 175, 55, 0.3),
              inset 0 2px 8px rgba(212, 175, 55, 0.1),
              inset 0 -2px 8px rgba(0, 0, 0, 0.6),
              0 4px 12px rgba(0, 0, 0, 0.5)
            `,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4" style={{ color: '#D4AF37' }} />
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{
                color: '#D4AF37',
                fontFamily: '"SF Pro Display", -apple-system, sans-serif',
                letterSpacing: '1.5px',
                textShadow: '0 0 10px rgba(212, 175, 55, 0.5)',
              }}
            >
              {getViewLabel()}
            </span>
          </div>
          <div
            className="text-base font-bold font-mono"
            style={{
              color: '#e5e7eb',
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
              letterSpacing: '0.5px',
            }}
          >
            {getDisplayDate()}
          </div>
        </div>
      </div>

      {/* Dual Throttle Lever - Jumbo Jet Style */}
      <div className="flex justify-center items-center gap-8 w-full">
        {/* Dual Throttle Container */}
        <div
          ref={containerRef}
          className="relative flex gap-6"
          style={{
            width: '180px',
            height: '400px',
            marginLeft: '54px',
          }}
        >
          {/* Left Throttle Track */}
          <div className="relative" style={{ width: '50px', height: '100%' }}>
            {/* Outer bezel */}
            <div
              className="absolute left-1/2 top-0 bottom-0 w-12 -translate-x-1/2 rounded-xl"
              style={{
                background: `linear-gradient(90deg,
                  #1a1a1a 0%,
                  #2d2d2d 10%,
                  #D4AF37 20%,
                  #3a3a3a 30%,
                  #4a4a4a 50%,
                  #3a3a3a 70%,
                  #D4AF37 80%,
                  #2d2d2d 90%,
                  #1a1a1a 100%)`,
                boxShadow: `
                  0 0 40px rgba(212, 175, 55, 0.3),
                  inset 0 2px 8px rgba(212, 175, 55, 0.2),
                  inset 0 -2px 8px rgba(0, 0, 0, 0.8)
                `,
                border: '1px solid rgba(212, 175, 55, 0.5)',
              }}
            >
              {/* Inner track */}
              <div
                className="absolute inset-1 rounded-lg"
                style={{
                  background: `linear-gradient(180deg,
                    #0a0a0a 0%,
                    #1a1a2e 15%,
                    #0f1419 30%,
                    #1e2835 50%,
                    #0f1419 70%,
                    #1a1a2e 85%,
                    #0a0a0a 100%)`,
                  boxShadow: `
                    inset 0 4px 16px rgba(0,0,0,0.9),
                    inset 0 -4px 16px rgba(0,0,0,0.7),
                    inset 2px 0 8px rgba(212, 175, 55, 0.1),
                    inset -2px 0 8px rgba(212, 175, 55, 0.1)
                  `,
                  border: '1px solid rgba(100, 116, 139, 0.3)',
                }}
              >
                {/* Gold accent lines */}
                <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#D4AF37] to-transparent opacity-60" />
                <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#D4AF37] to-transparent opacity-60" />
              </div>
            </div>

            {/* Left Throttle Handle */}
            <div
              className={`absolute left-1/2 w-16 h-36 -translate-x-1/2 cursor-grab ${
                isDragging ? 'cursor-grabbing' : ''
              }`}
              style={{
                top: `${100 - throttlePosition}%`,
                transform: 'translate(-50%, -50%)',
                transition: isDragging ? 'none' : 'top 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
              }}
              onMouseDown={handleMouseDown}
            >
              {/* Outer gold trim */}
              <div
                className="relative w-full h-full rounded-2xl"
                style={{
                  background: `linear-gradient(135deg,
                    #1a1a1a 0%,
                    #D4AF37 5%,
                    #FFD700 10%,
                    #D4AF37 15%,
                    #2a2a2a 20%,
                    #1a1a1a 100%)`,
                  boxShadow: `
                    0 12px 24px rgba(0,0,0,0.8),
                    0 6px 12px rgba(0,0,0,0.6),
                    0 0 30px rgba(212, 175, 55, 0.4),
                    inset 0 2px 6px rgba(212, 175, 55, 0.3)
                  `,
                  border: '2px solid rgba(212, 175, 55, 0.6)',
                  padding: '3px',
                }}
              >
                {/* Steel body */}
                <div
                  className="relative w-full h-full rounded-xl"
                  style={{
                    background: `linear-gradient(135deg,
                      #0a0a0a 0%,
                      #1a1a2e 5%,
                      #2d3748 15%,
                      #475569 25%,
                      #64748b 40%,
                      #94a3b8 50%,
                      #64748b 60%,
                      #475569 75%,
                      #2d3748 85%,
                      #1a1a2e 95%,
                      #0a0a0a 100%)`,
                    boxShadow: `
                      inset 0 4px 12px rgba(255,255,255,0.15),
                      inset 0 -4px 12px rgba(0,0,0,0.8),
                      inset 4px 0 8px rgba(0,0,0,0.5),
                      inset -4px 0 8px rgba(255,255,255,0.1)
                    `,
                    border: '1px solid rgba(148, 163, 184, 0.4)',
                  }}
                >
                  {/* Premium grip lines with gold accent */}
                  <div className="absolute inset-4 flex flex-col justify-center gap-2">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="relative h-1.5 rounded-full overflow-hidden">
                        <div
                          style={{
                            background: `linear-gradient(90deg,
                              rgba(10,10,10,0.9) 0%,
                              rgba(100,116,139,0.8) 10%,
                              rgba(148,163,184,0.9) 30%,
                              rgba(212,175,55,0.6) 50%,
                              rgba(148,163,184,0.9) 70%,
                              rgba(100,116,139,0.8) 90%,
                              rgba(10,10,10,0.9) 100%)`,
                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8), 0 1px 1px rgba(212,175,55,0.3)',
                            height: '100%',
                            borderRadius: '9999px',
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Gold accent strips */}
                  <div className="absolute top-2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-80" />
                  <div className="absolute bottom-2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-80" />

                  {/* LED Status Indicator */}
                  <div
                    className="absolute -right-1 top-1/2 w-2 h-2 rounded-full -translate-y-1/2"
                    style={{
                      background: `radial-gradient(circle, ${currentView === '7d' ? '#22c55e' : currentView === '30d' ? '#3b82f6' : currentView === '90d' ? '#f59e0b' : '#ef4444'} 0%, transparent 70%)`,
                      boxShadow: `0 0 12px ${currentView === '7d' ? '#22c55e' : currentView === '30d' ? '#3b82f6' : currentView === '90d' ? '#f59e0b' : '#ef4444'}, inset 0 0 4px rgba(255,255,255,0.8)`,
                      animation: 'pulse 2s ease-in-out infinite',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Throttle Track */}
          <div className="relative" style={{ width: '50px', height: '100%' }}>
            {/* Outer bezel */}
            <div
              className="absolute left-1/2 top-0 bottom-0 w-12 -translate-x-1/2 rounded-xl"
              style={{
                background: `linear-gradient(90deg,
                  #1a1a1a 0%,
                  #2d2d2d 10%,
                  #D4AF37 20%,
                  #3a3a3a 30%,
                  #4a4a4a 50%,
                  #3a3a3a 70%,
                  #D4AF37 80%,
                  #2d2d2d 90%,
                  #1a1a1a 100%)`,
                boxShadow: `
                  0 0 40px rgba(212, 175, 55, 0.3),
                  inset 0 2px 8px rgba(212, 175, 55, 0.2),
                  inset 0 -2px 8px rgba(0, 0, 0, 0.8)
                `,
                border: '1px solid rgba(212, 175, 55, 0.5)',
              }}
            >
              {/* Inner track */}
              <div
                className="absolute inset-1 rounded-lg"
                style={{
                  background: `linear-gradient(180deg,
                    #0a0a0a 0%,
                    #1a1a2e 15%,
                    #0f1419 30%,
                    #1e2835 50%,
                    #0f1419 70%,
                    #1a1a2e 85%,
                    #0a0a0a 100%)`,
                  boxShadow: `
                    inset 0 4px 16px rgba(0,0,0,0.9),
                    inset 0 -4px 16px rgba(0,0,0,0.7),
                    inset 2px 0 8px rgba(212, 175, 55, 0.1),
                    inset -2px 0 8px rgba(212, 175, 55, 0.1)
                  `,
                  border: '1px solid rgba(100, 116, 139, 0.3)',
                }}
              >
                {/* Gold accent lines */}
                <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#D4AF37] to-transparent opacity-60" />
                <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#D4AF37] to-transparent opacity-60" />
              </div>
            </div>

            {/* Right Throttle Handle - Mirrors left */}
            <div
              className="absolute left-1/2 w-16 h-36 -translate-x-1/2"
              style={{
                top: `${100 - throttlePosition}%`,
                transform: 'translate(-50%, -50%)',
                transition: isDragging ? 'none' : 'top 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                pointerEvents: 'none',
              }}
            >
              {/* Outer gold trim */}
              <div
                className="relative w-full h-full rounded-2xl"
                style={{
                  background: `linear-gradient(135deg,
                    #1a1a1a 0%,
                    #D4AF37 5%,
                    #FFD700 10%,
                    #D4AF37 15%,
                    #2a2a2a 20%,
                    #1a1a1a 100%)`,
                  boxShadow: `
                    0 12px 24px rgba(0,0,0,0.8),
                    0 6px 12px rgba(0,0,0,0.6),
                    0 0 30px rgba(212, 175, 55, 0.4),
                    inset 0 2px 6px rgba(212, 175, 55, 0.3)
                  `,
                  border: '2px solid rgba(212, 175, 55, 0.6)',
                  padding: '3px',
                }}
              >
                {/* Steel body */}
                <div
                  className="relative w-full h-full rounded-xl"
                  style={{
                    background: `linear-gradient(135deg,
                      #0a0a0a 0%,
                      #1a1a2e 5%,
                      #2d3748 15%,
                      #475569 25%,
                      #64748b 40%,
                      #94a3b8 50%,
                      #64748b 60%,
                      #475569 75%,
                      #2d3748 85%,
                      #1a1a2e 95%,
                      #0a0a0a 100%)`,
                    boxShadow: `
                      inset 0 4px 12px rgba(255,255,255,0.15),
                      inset 0 -4px 12px rgba(0,0,0,0.8),
                      inset 4px 0 8px rgba(0,0,0,0.5),
                      inset -4px 0 8px rgba(255,255,255,0.1)
                    `,
                    border: '1px solid rgba(148, 163, 184, 0.4)',
                  }}
                >
                  {/* Premium grip lines with gold accent */}
                  <div className="absolute inset-4 flex flex-col justify-center gap-2">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="relative h-1.5 rounded-full overflow-hidden">
                        <div
                          style={{
                            background: `linear-gradient(90deg,
                              rgba(10,10,10,0.9) 0%,
                              rgba(100,116,139,0.8) 10%,
                              rgba(148,163,184,0.9) 30%,
                              rgba(212,175,55,0.6) 50%,
                              rgba(148,163,184,0.9) 70%,
                              rgba(100,116,139,0.8) 90%,
                              rgba(10,10,10,0.9) 100%)`,
                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8), 0 1px 1px rgba(212,175,55,0.3)',
                            height: '100%',
                            borderRadius: '9999px',
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Gold accent strips */}
                  <div className="absolute top-2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-80" />
                  <div className="absolute bottom-2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-80" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Label - Day Zero */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center"
            style={{
              width: '200px',
              marginBottom: '-50px',
              marginLeft: '-27px',
            }}
          >
            <div
              style={{
                fontFamily: '"Playfair Display", "Times New Roman", serif',
                fontSize: '14px',
                fontWeight: '600',
                color: '#D4AF37',
                letterSpacing: '1.5px',
                textShadow: '0 0 20px rgba(212, 175, 55, 0.5), 0 2px 4px rgba(0,0,0,0.8)',
              }}
            >
              Day Zero
            </div>
            <div
              style={{
                fontFamily: '"SF Pro Display", -apple-system, sans-serif',
                fontSize: '11px',
                fontWeight: '400',
                color: 'rgba(212, 175, 55, 0.8)',
                letterSpacing: '1px',
                marginTop: '2px',
                textTransform: 'uppercase',
              }}
            >
              Surgery Date
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
