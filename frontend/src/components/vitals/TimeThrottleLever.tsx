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
        '7d': 75,
        '30d': 50,
        '90d': 25,
        'surgery': 0,
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
      onTimeChange('7d');
    } else if (position >= 40) {
      onTimeChange('30d');
    } else if (position >= 15) {
      onTimeChange('90d');
    } else {
      onTimeChange('surgery');
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
      case '7d':
        return `${format(subDays(today, 7), 'MMM d')} - ${format(today, 'MMM d, yyyy')}`;
      case '30d':
        return `${format(subDays(today, 30), 'MMM d')} - ${format(today, 'MMM d, yyyy')}`;
      case '90d':
        return `${format(subDays(today, 90), 'MMM d')} - ${format(today, 'MMM d, yyyy')}`;
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
      case '7d':
        return 'LAST 7 DAYS';
      case '30d':
        return 'LAST 30 DAYS';
      case '90d':
        return 'LAST 90 DAYS';
      case 'surgery':
        return 'SINCE SURGERY';
      default:
        return 'CURRENT';
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {/* Display Panel */}
      <div
        className="px-6 py-4 rounded-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.2))',
          border: '2px solid rgba(59, 130, 246, 0.4)',
          boxShadow: '0 0 30px rgba(59, 130, 246, 0.3), inset 0 0 20px rgba(59, 130, 246, 0.1)',
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="h-5 w-5 text-blue-400" />
          <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">
            {getViewLabel()}
          </span>
        </div>
        <div className="text-lg font-bold text-white font-mono">{getDisplayDate()}</div>
      </div>

      {/* Throttle Lever */}
      <div className="flex items-center gap-6">
        {/* Left Label */}
        <div className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
          <div>← Past</div>
        </div>

        {/* Throttle Container */}
        <div
          ref={containerRef}
          className="relative"
          style={{
            width: '80px',
            height: '300px',
          }}
        >
          {/* Throttle Track */}
          <div
            className="absolute left-1/2 top-0 bottom-0 w-6 -translate-x-1/2 rounded-full"
            style={{
              background: 'linear-gradient(180deg, rgba(34, 197, 94, 0.3) 0%, rgba(59, 130, 246, 0.3) 50%, rgba(239, 68, 68, 0.3) 100%)',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
              border: '2px solid rgba(255,255,255,0.1)',
            }}
          >
            {/* Position markers */}
            {[
              { pos: 75, label: '7D' },
              { pos: 50, label: '30D' },
              { pos: 25, label: '90D' },
              { pos: 0, label: 'SRG' },
            ].map((marker) => (
              <div
                key={marker.pos}
                className="absolute left-full ml-3 flex items-center gap-2"
                style={{ top: `${100 - marker.pos}%`, transform: 'translateY(-50%)' }}
              >
                <div className="w-2 h-0.5 bg-white/40" />
                <span className="text-xs font-bold text-gray-400">{marker.label}</span>
              </div>
            ))}
          </div>

          {/* Throttle Handle */}
          <div
            ref={throttleRef}
            className={`absolute left-1/2 w-16 h-24 -translate-x-1/2 cursor-grab ${
              isDragging ? 'cursor-grabbing' : ''
            }`}
            style={{
              top: `${100 - throttlePosition}%`,
              transform: 'translate(-50%, -50%)',
              transition: isDragging ? 'none' : 'top 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
            }}
            onMouseDown={handleMouseDown}
          >
            {/* Handle body */}
            <div
              className="relative w-full h-full rounded-lg"
              style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e293b 100%)',
                boxShadow: `
                  0 4px 8px rgba(0,0,0,0.5),
                  0 8px 16px rgba(0,0,0,0.3),
                  inset 0 1px 0 rgba(255,255,255,0.2),
                  inset 0 -1px 0 rgba(0,0,0,0.5)
                `,
                border: '2px solid rgba(59, 130, 246, 0.5)',
              }}
            >
              {/* Grip lines */}
              <div className="absolute inset-4 flex flex-col justify-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-0.5 rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.5), transparent)',
                    }}
                  />
                ))}
              </div>

              {/* Lightning bolt indicator */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-2xl" style={{ filter: 'drop-shadow(0 0 8px rgba(234, 179, 8, 0.8))' }}>
                  ⚡
                </div>
              </div>

              {/* LED indicator */}
              <div
                className="absolute -right-2 top-1/2 w-3 h-3 rounded-full -translate-y-1/2 animate-pulse"
                style={{
                  background: currentView === '7d' ? '#22c55e' : currentView === '30d' ? '#3b82f6' : currentView === '90d' ? '#f59e0b' : '#ef4444',
                  boxShadow: `0 0 10px ${currentView === '7d' ? '#22c55e' : currentView === '30d' ? '#3b82f6' : currentView === '90d' ? '#f59e0b' : '#ef4444'}`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Label */}
        <div className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
          <div>Future →</div>
        </div>
      </div>

      {/* Instruction */}
      <div className="text-xs text-gray-500 text-center max-w-xs">
        <Clock className="h-4 w-4 inline mr-1" />
        Drag throttle to navigate through time • Charts update in real-time
      </div>
    </div>
  );
}
