import React from 'react';

interface CircularGaugeProps {
  value: number | string | null;
  label: string;
  unit?: string;
  min?: number;
  max?: number;
  targetMin?: number;
  targetMax?: number;
  size?: 'small' | 'medium' | 'large';
  style?: 'luxury' | 'modern';
  color?: string;
  icon?: React.ReactNode;
  subLabel?: string;
  onClick?: () => void;
  source?: 'manual' | 'device' | 'import';
  deviceId?: string;
}

export function CircularGauge({
  value,
  label,
  unit = '',
  min = 0,
  max = 100,
  targetMin,
  targetMax,
  size = 'medium',
  style = 'modern',
  color = '#3b82f6',
  icon,
  subLabel,
  onClick,
  source = 'manual',
  deviceId,
}: CircularGaugeProps) {
  const sizes = {
    small: { diameter: 120, stroke: 8, fontSize: 24, labelSize: 12 },
    medium: { diameter: 160, stroke: 10, fontSize: 32, labelSize: 14 },
    large: { diameter: 200, stroke: 12, fontSize: 40, labelSize: 16 },
  };

  const { diameter, stroke, fontSize, labelSize } = sizes[size];
  const radius = (diameter - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate percentage
  const numValue = typeof value === 'number' ? value : null;
  const percentage = numValue !== null ? ((numValue - min) / (max - min)) * 100 : 0;
  const offset = circumference - (percentage / 100) * circumference;

  // Determine status color based on target range
  let statusColor = color;
  if (numValue !== null && targetMin !== undefined && targetMax !== undefined) {
    if (numValue < targetMin || numValue > targetMax) {
      statusColor = '#ef4444'; // Red for out of range
    } else {
      statusColor = '#22c55e'; // Green for in range
    }
  }

  // Display value
  const displayValue = value !== null && value !== undefined ? value : '--';

  // Device mode indicator
  const getModeIndicator = () => {
    if (source === 'device') {
      return {
        label: deviceId ? deviceId.split('_')[0].toUpperCase() : 'AUTO',
        color: '#22c55e',
        bgColor: 'rgba(34, 197, 94, 0.15)',
        borderColor: '#22c55e',
        icon: '📡',
      };
    } else if (source === 'import') {
      return {
        label: 'IMPORT',
        color: '#fbbf24',
        bgColor: 'rgba(251, 191, 36, 0.15)',
        borderColor: '#fbbf24',
        icon: '📥',
      };
    } else {
      return {
        label: 'MANUAL',
        color: '#60a5fa',
        bgColor: 'rgba(96, 165, 250, 0.15)',
        borderColor: '#60a5fa',
        icon: '✍️',
      };
    }
  };

  const modeIndicator = getModeIndicator();

  return (
    <div
      className={`relative flex flex-col items-center justify-center ${onClick ? 'cursor-pointer' : ''}`}
      style={{ width: diameter, height: diameter + 60 }}
      onClick={onClick}
    >
      {/* Device Mode Indicator Badge */}
      <div
        className="absolute top-0 right-0 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold group"
        style={{
          backgroundColor: modeIndicator.bgColor,
          borderColor: modeIndicator.borderColor,
          color: '#FFFFFF',
          fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          textShadow: `0 0 12px ${modeIndicator.color}, 0 0 24px ${modeIndicator.color}80, 0 2px 4px rgba(0,0,0,0.8)`,
          boxShadow: `0 0 16px ${modeIndicator.color}50, inset 0 0 12px ${modeIndicator.color}30`,
          backdropFilter: 'blur(10px)',
          animation: source === 'device' ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
          transition: 'all 0.2s ease-in-out',
        }}
      >
        <span style={{ fontSize: '10px' }}>{modeIndicator.icon}</span>
        <span
          className="opacity-0 group-hover:opacity-100 max-w-0 group-hover:max-w-[60px] overflow-hidden"
          style={{
            fontSize: '9px',
            letterSpacing: '0.5px',
            fontWeight: '900',
            transition: 'all 0.3s ease-in-out',
          }}
        >{modeIndicator.label}</span>
      </div>

      {/* Gauge SVG */}
      <div
        className="relative"
        style={{
          width: diameter,
          height: diameter,
        }}
      >
        {/* Luxury Watch Style */}
        {style === 'luxury' && (
          <>
            {/* Gold bezel with 5D quartz effect */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(135deg, #D4AF37 0%, #F4E6B8 50%, #D4AF37 100%)',
                boxShadow: `
                  0 2px 4px rgba(212, 175, 55, 0.3),
                  0 4px 8px rgba(212, 175, 55, 0.2),
                  0 8px 16px rgba(212, 175, 55, 0.1),
                  inset 0 1px 2px rgba(255, 255, 255, 0.5),
                  inset 0 -1px 2px rgba(0, 0, 0, 0.3)
                `,
                padding: '4px',
              }}
            >
              {/* Inner face */}
              <div
                className="w-full h-full rounded-full relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
                  boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.5)',
                }}
              >
                {/* Subtle texture overlay */}
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 60%)',
                  }}
                />
              </div>
            </div>

            {/* Roman numerals */}
            <svg className="absolute inset-0" viewBox={`0 0 ${diameter} ${diameter}`}>
              {[0, 90, 180, 270].map((angle, i) => {
                const radian = ((angle - 90) * Math.PI) / 180;
                const x = diameter / 2 + (radius * 0.7) * Math.cos(radian);
                const y = diameter / 2 + (radius * 0.7) * Math.sin(radian);
                const numerals = ['XII', 'III', 'VI', 'IX'];
                return (
                  <text
                    key={i}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#D4AF37"
                    fontSize={labelSize}
                    fontFamily="serif"
                    fontWeight="bold"
                  >
                    {numerals[i]}
                  </text>
                );
              })}
            </svg>
          </>
        )}

        {/* Modern Style */}
        {style === 'modern' && (
          <>
            {/* Outer glow ring */}
            <div
              className="absolute inset-0 rounded-full animate-pulse"
              style={{
                background: `radial-gradient(circle, ${statusColor}20 0%, transparent 70%)`,
                filter: 'blur(8px)',
              }}
            />

            {/* Glass morphic background */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.8))',
                backdropFilter: 'blur(20px)',
                border: `2px solid ${statusColor}40`,
                boxShadow: `
                  0 0 20px ${statusColor}30,
                  inset 0 0 20px ${statusColor}10
                `,
              }}
            />
          </>
        )}

        {/* Progress circle */}
        <svg className="absolute inset-0 -rotate-90" viewBox={`0 0 ${diameter} ${diameter}`}>
          {/* Background track */}
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={radius}
            fill="none"
            stroke={style === 'luxury' ? '#3a3a3a' : 'rgba(255,255,255,0.1)'}
            strokeWidth={stroke}
          />

          {/* Progress arc */}
          {numValue !== null && (
            <circle
              cx={diameter / 2}
              cy={diameter / 2}
              r={radius}
              fill="none"
              stroke={statusColor}
              strokeWidth={stroke}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease',
                filter: style === 'modern' ? `drop-shadow(0 0 8px ${statusColor})` : 'none',
              }}
            />
          )}
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {icon && <div className="mb-1">{icon}</div>}
          <div
            className="font-bold"
            style={{
              fontSize: `${fontSize}px`,
              color: style === 'luxury' ? '#D4AF37' : '#ffffff',
              textShadow:
                style === 'modern' ? `0 0 20px ${statusColor}80` : '0 2px 4px rgba(0,0,0,0.5)',
              fontFamily: style === 'luxury' ? 'serif' : 'monospace',
            }}
          >
            {displayValue}
          </div>
          {unit && (
            <div
              className="text-xs font-bold"
              style={{
                color: style === 'luxury' ? '#F4E6B8' : 'rgba(255,255,255,0.95)',
                fontFamily: style === 'luxury' ? 'serif' : 'sans-serif',
                textShadow: style === 'modern' ? `0 0 12px ${statusColor}80, 0 0 24px ${statusColor}40` : '0 2px 4px rgba(0,0,0,0.5)',
                fontWeight: '700',
              }}
            >
              {unit}
            </div>
          )}
          {subLabel && (
            <div className="text-xs text-gray-400 mt-1 text-center px-2">{subLabel}</div>
          )}
        </div>
      </div>

      {/* Label below gauge */}
      <div className="mt-2 text-center">
        <div
          className="font-bold uppercase tracking-wide"
          style={{
            fontSize: `${labelSize}px`,
            color: style === 'luxury' ? '#FFFFFF' : '#FFFFFF',
            fontFamily: style === 'luxury' ? 'serif' : 'sans-serif',
            textShadow: style === 'modern' ? `0 0 20px ${statusColor}, 0 0 40px ${statusColor}, 0 0 60px ${statusColor}80, 0 2px 4px rgba(0,0,0,0.8)` : '0 0 20px #F4E6B8, 0 0 40px #D4AF37, 0 2px 4px rgba(0,0,0,0.8)',
            fontWeight: '900',
            letterSpacing: '0.1em',
            filter: `drop-shadow(0 0 10px ${statusColor}) drop-shadow(0 0 20px ${statusColor}80)`,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}
