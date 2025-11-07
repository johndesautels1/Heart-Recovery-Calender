import React, { useState } from 'react';

interface LuxuryVitalGaugeProps {
  label: string;
  subtitle?: string; // Optional subtitle (e.g., "A1C: 5.7%")
  recentValue: number | string | null;
  averageValue: number | string | null;
  restingValue?: number | string | null; // Resting heart rate (for HR gauge only)
  showRestingToggle?: boolean; // Show the "R" resting toggle button
  unit: string;
  min: number;
  max: number;
  targetMin?: number;
  targetMax?: number;
  size?: 'medium' | 'large';
  color: string;
  timePeriod: 'Wk' | '30d' | '60d' | 'ssd';
  isAuto: boolean; // true = auto-calculated, false = manual entry
  icon?: React.ReactNode;
  onManualClick?: () => void; // Click handler for MANUAL badge
  defaultMode?: 'recent' | 'average' | 'resting'; // Default display mode
}

export function LuxuryVitalGauge({
  label,
  subtitle,
  recentValue,
  averageValue,
  restingValue,
  showRestingToggle = false,
  unit,
  min,
  max,
  targetMin,
  targetMax,
  size = 'large',
  color,
  timePeriod,
  isAuto,
  icon,
  onManualClick,
  defaultMode = 'recent',
}: LuxuryVitalGaugeProps) {
  // State: 'recent' | 'average' | 'resting'
  const [displayMode, setDisplayMode] = useState<'recent' | 'average' | 'resting'>(defaultMode);

  const sizes = {
    medium: { diameter: 180, stroke: 14, fontSize: 36, labelSize: 11, subFontSize: 13 },
    large: { diameter: 240, stroke: 18, fontSize: 48, labelSize: 13, subFontSize: 16 },
  };

  const { diameter, stroke, fontSize, labelSize, subFontSize } = sizes[size];
  const radius = (diameter - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate percentage for the dial
  const displayValue = displayMode === 'recent' ? recentValue :
                       displayMode === 'resting' ? restingValue :
                       averageValue;
  const numValue = typeof displayValue === 'number' ? displayValue :
                   typeof displayValue === 'string' && displayValue.includes('/')
                     ? parseFloat(displayValue.split('/')[0]) // Use systolic for BP
                     : null;

  const percentage = numValue !== null ? ((numValue - min) / (max - min)) * 100 : 0;
  const offset = circumference - (percentage / 100) * circumference;

  // Determine status color and severity with multi-tier system
  let statusColor = color;
  let severityLevel: 'optimal' | 'caution' | 'warning' | 'danger' | 'critical' = 'optimal';
  let pulseSpeed = 0; // 0 = no pulse, 1 = slow, 2 = medium, 3 = fast

  if (numValue !== null && targetMin !== undefined && targetMax !== undefined) {
    const rangeSize = targetMax - targetMin;
    const cautionThreshold = rangeSize * 0.15; // 15% outside range = caution
    const warningThreshold = rangeSize * 0.30; // 30% outside range = warning
    const dangerThreshold = rangeSize * 0.50; // 50% outside range = danger

    if (numValue >= targetMin && numValue <= targetMax) {
      // Optimal - within target range
      statusColor = '#22c55e'; // Green
      severityLevel = 'optimal';
      pulseSpeed = 0;
    } else if (numValue < targetMin) {
      // Below target range
      const deficit = targetMin - numValue;
      if (deficit <= cautionThreshold) {
        statusColor = '#eab308'; // Yellow - Caution
        severityLevel = 'caution';
        pulseSpeed = 1;
      } else if (deficit <= warningThreshold) {
        statusColor = '#f97316'; // Orange - Warning
        severityLevel = 'warning';
        pulseSpeed = 2;
      } else if (deficit <= dangerThreshold) {
        statusColor = '#ef4444'; // Red - Danger
        severityLevel = 'danger';
        pulseSpeed = 3;
      } else {
        statusColor = '#991b1b'; // Dark Red - Critical
        severityLevel = 'critical';
        pulseSpeed = 3;
      }
    } else {
      // Above target range
      const excess = numValue - targetMax;
      if (excess <= cautionThreshold) {
        statusColor = '#eab308'; // Yellow - Caution
        severityLevel = 'caution';
        pulseSpeed = 1;
      } else if (excess <= warningThreshold) {
        statusColor = '#f97316'; // Orange - Warning
        severityLevel = 'warning';
        pulseSpeed = 2;
      } else if (excess <= dangerThreshold) {
        statusColor = '#ef4444'; // Red - Danger
        severityLevel = 'danger';
        pulseSpeed = 3;
      } else {
        statusColor = '#991b1b'; // Dark Red - Critical
        severityLevel = 'critical';
        pulseSpeed = 3;
      }
    }
  }

  // Pulse animation keyframes based on severity
  const pulseAnimation = pulseSpeed > 0 ? `pulse-vital-${pulseSpeed}` : 'none';

  // Display formatted value
  const formattedValue = displayValue !== null && displayValue !== undefined ? displayValue : '--';

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: diameter + 40, height: diameter + 100 }}>
      {/* CSS Animations for pulsing halos */}
      <style>{`
        @keyframes pulse-vital-1 {
          0%, 100% { opacity: 0.3; filter: blur(8px); }
          50% { opacity: 0.5; filter: blur(10px); }
        }
        @keyframes pulse-vital-2 {
          0%, 100% { opacity: 0.3; filter: blur(8px); }
          50% { opacity: 0.7; filter: blur(12px); }
        }
        @keyframes pulse-vital-3 {
          0%, 100% { opacity: 0.3; filter: blur(8px); }
          50% { opacity: 0.9; filter: blur(16px); }
        }
        @keyframes pulse-arc-1 {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes pulse-arc-2 {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes pulse-arc-3 {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Outer luxury bezel - Multiple layers for depth */}
      <div
        className="relative"
        style={{
          width: diameter + 20,
          height: diameter + 20,
        }}
      >
        {/* Outermost bezel ring - Dark metal */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
            boxShadow: `
              0 8px 16px rgba(0,0,0,0.7),
              inset 0 2px 4px rgba(255,255,255,0.1),
              inset 0 -2px 4px rgba(0,0,0,0.5)
            `,
          }}
        >
          {/* Mid bezel ring - Polished metal with brushed texture */}
          <div
            className="absolute rounded-full"
            style={{
              top: '6px',
              left: '6px',
              right: '6px',
              bottom: '6px',
              background: 'linear-gradient(135deg, #3a3a3a 0%, #4d4d4d 50%, #3a3a3a 100%)',
              boxShadow: `
                0 4px 8px rgba(0,0,0,0.5),
                inset 0 1px 2px rgba(255,255,255,0.2),
                inset 0 -1px 2px rgba(0,0,0,0.4)
              `,
            }}
          >
            {/* Inner bezel ring - Glossy with subtle gold accent */}
            <div
              className="absolute rounded-full"
              style={{
                top: '4px',
                left: '4px',
                right: '4px',
                bottom: '4px',
                background: `linear-gradient(135deg,
                  #2a2a2a 0%,
                  #3d3d3d 25%,
                  ${color}20 50%,
                  #3d3d3d 75%,
                  #2a2a2a 100%)`,
                boxShadow: `
                  0 2px 4px rgba(0,0,0,0.6),
                  inset 0 2px 4px rgba(255,255,255,0.15),
                  inset 0 -2px 4px rgba(0,0,0,0.6)
                `,
              }}
            >
              {/* Main gauge face - Deep black with subtle texture */}
              <div
                className="absolute rounded-full"
                style={{
                  top: '10px',
                  left: '10px',
                  right: '10px',
                  bottom: '10px',
                  background: `radial-gradient(circle at 30% 30%, #1a1a1a 0%, #0a0a0a 100%)`,
                  boxShadow: `
                    inset 0 4px 12px rgba(0,0,0,0.8),
                    inset 0 0 40px rgba(0,0,0,0.6)
                  `,
                }}
              >
                {/* Subtle radial lines for texture */}
                <svg className="absolute inset-0" viewBox={`0 0 ${diameter} ${diameter}`} style={{ opacity: 0.15 }}>
                  {[...Array(12)].map((_, i) => {
                    const angle = (i * 30 - 90) * (Math.PI / 180);
                    const x1 = diameter / 2 + (radius * 0.75) * Math.cos(angle);
                    const y1 = diameter / 2 + (radius * 0.75) * Math.sin(angle);
                    const x2 = diameter / 2 + (radius * 0.85) * Math.cos(angle);
                    const y2 = diameter / 2 + (radius * 0.85) * Math.sin(angle);
                    return (
                      <line
                        key={i}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Manual/Auto indicator badge - Inside bezel at 12 o'clock - CLICKABLE */}
        <button
          className="absolute flex items-center justify-center"
          onClick={onManualClick}
          disabled={!onManualClick}
          style={{
            top: size === 'large' ? '32px' : '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: size === 'large' ? '50px' : '25px',
            height: size === 'large' ? '18px' : '12px',
            background: isAuto
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            borderRadius: size === 'large' ? '9px' : '6px',
            boxShadow: `
              0 2px 4px rgba(0,0,0,0.4),
              inset 0 1px 2px rgba(255,255,255,0.3)
            `,
            border: '1px solid rgba(255,255,255,0.2)',
            cursor: onManualClick ? 'pointer' : 'default',
            transition: 'all 0.2s ease',
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            if (onManualClick) {
              e.currentTarget.style.transform = 'translateX(-50%) scale(1.1)';
              e.currentTarget.style.boxShadow = `
                0 4px 8px rgba(0,0,0,0.6),
                inset 0 1px 2px rgba(255,255,255,0.4)
              `;
            }
          }}
          onMouseLeave={(e) => {
            if (onManualClick) {
              e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
              e.currentTarget.style.boxShadow = `
                0 2px 4px rgba(0,0,0,0.4),
                inset 0 1px 2px rgba(255,255,255,0.3)
              `;
            }
          }}
        >
          <span style={{
            fontSize: size === 'large' ? '8px' : '6px',
            fontWeight: 'bold',
            color: '#ffffff',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
            letterSpacing: size === 'large' ? '0.3px' : '0.3px',
            pointerEvents: 'none',
          }}>
            {isAuto ? 'AUTO' : 'MANUAL'}
          </span>
        </button>

        {/* Progress circle SVG */}
        <svg
          className="absolute -rotate-90"
          viewBox={`0 0 ${diameter} ${diameter}`}
          style={{
            top: '10px',
            left: '10px',
            width: diameter,
            height: diameter,
          }}
        >
          <defs>
            {/* Radial gradient glow - properly circular */}
            <filter id={`glow-${label.replace(/\s+/g, '-')}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Mask to exclude top area - minimal to prevent edge wrap */}
            <mask id={`mask-${label.replace(/\s+/g, '-')}`}>
              <rect x="0" y="0" width={diameter} height={diameter} fill="white" />
              {/* Black out the top 30px to prevent glow from wrapping around top edge */}
              <rect x="0" y="0" width={diameter} height="30" fill="black" />
            </mask>
          </defs>

          {/* Background track - Subtle */}
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
          />

          {/* Glow layer behind progress arc - masked to avoid MANUAL badge */}
          {numValue !== null && (
            <g mask={`url(#mask-${label.replace(/\s+/g, '-')})`}>
              <circle
                cx={diameter / 2}
                cy={diameter / 2}
                r={radius}
                fill="none"
                stroke={statusColor}
                strokeWidth={stroke + 6}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                opacity="0.3"
                style={{
                  transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease',
                  filter: 'blur(8px)',
                  animation: pulseSpeed > 0
                    ? `pulse-vital-${pulseSpeed} ${pulseSpeed === 1 ? '3s' : pulseSpeed === 2 ? '2s' : '1s'} ease-in-out infinite`
                    : 'none',
                }}
              />
            </g>
          )}

          {/* Progress arc - Sharp and clean */}
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
                transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease',
                animation: pulseSpeed > 0
                  ? `pulse-arc-${pulseSpeed} ${pulseSpeed === 1 ? '3s' : pulseSpeed === 2 ? '2s' : '1s'} ease-in-out infinite`
                  : 'none',
              }}
            />
          )}
        </svg>

        {/* Center content */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ top: '10px', left: '10px', width: diameter, height: diameter }}
        >
          {/* Icon */}
          {icon && <div className="mb-1" style={{ filter: `drop-shadow(0 2px 4px ${color}60)` }}>{icon}</div>}

          {/* Main value - Elegant serif font */}
          <div
            style={{
              fontSize: `${fontSize}px`,
              fontWeight: '300',
              color: '#ffffff',
              textShadow: `0 0 20px ${statusColor}80, 0 2px 4px rgba(0,0,0,0.8)`,
              fontFamily: '"Playfair Display", "Times New Roman", serif',
              letterSpacing: '1px',
              lineHeight: '1',
            }}
          >
            {formattedValue}
          </div>

          {/* Unit - Modern sans-serif */}
          <div
            style={{
              fontSize: `${subFontSize}px`,
              fontWeight: '600',
              color: 'rgba(255,255,255,0.7)',
              marginTop: '4px',
              fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
              letterSpacing: '1.5px',
            }}
          >
            {unit}
          </div>

          {/* Mode toggle button - Centered, clickable - toggles between recent and average */}
          <button
            onClick={() => {
              if (displayMode === 'recent') {
                setDisplayMode('average');
              } else {
                setDisplayMode('recent');
              }
            }}
            style={{
              marginTop: '8px',
              fontSize: `${labelSize}px`,
              fontWeight: 'bold',
              color: displayMode === 'recent' ? color : displayMode === 'resting' ? '#a78bfa' : '#60a5fa',
              background: 'rgba(0,0,0,0.4)',
              padding: '4px 12px',
              borderRadius: '12px',
              border: `1px solid ${displayMode === 'recent' ? color + '60' : displayMode === 'resting' ? '#a78bfa60' : '#60a5fa60'}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              boxShadow: `0 0 12px ${displayMode === 'recent' ? color : displayMode === 'resting' ? '#a78bfa' : '#60a5fa'}60, inset 0 1px 2px rgba(255,255,255,0.2)`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {displayMode === 'recent' ? 'Recent' : displayMode === 'resting' ? `Resting ${timePeriod}` : `Avg ${timePeriod}`}
          </button>

          {/* Cursive "avg" button below Recent - clickable to switch to average mode */}
          {displayMode === 'recent' && averageValue !== null && (
            <button
              onClick={() => setDisplayMode('average')}
              style={{
                marginTop: '4px',
                fontSize: `${labelSize}px`,
                fontWeight: '500',
                color: '#eab308', // Yellow
                background: 'rgba(234, 179, 8, 0.15)',
                padding: '2px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(234, 179, 8, 0.4)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: '"Brush Script MT", "Apple Chancery", cursive',
                fontStyle: 'italic',
                letterSpacing: '0.8px',
                textShadow: '0 0 6px rgba(234, 179, 8, 0.6)',
                boxShadow: '0 0 8px rgba(234, 179, 8, 0.3), inset 0 1px 2px rgba(255,255,255,0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 0 12px rgba(234, 179, 8, 0.5), inset 0 1px 2px rgba(255,255,255,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 0 8px rgba(234, 179, 8, 0.3), inset 0 1px 2px rgba(255,255,255,0.1)';
              }}
            >
              avg
            </button>
          )}
        </div>

        {/* Average Heart Rate Toggle - Cursive "A" button at BOTTOM LEFT (inside bezel) */}
        {showRestingToggle && (
          <button
            onClick={() => {
              setDisplayMode('average');
            }}
            title="Toggle Average Heart Rate"
            style={{
              position: 'absolute',
              bottom: size === 'large' ? '50px' : '40px',
              left: size === 'large' ? '55px' : '45px',
              fontSize: `${labelSize + 4}px`,
              fontWeight: '400',
              color: displayMode === 'average' ? '#60a5fa' : 'rgba(96, 165, 250, 0.6)',
              background: 'rgba(0,0,0,0.5)',
              padding: '2px 8px',
              borderRadius: '10px',
              border: `1px solid ${displayMode === 'average' ? '#60a5fa80' : '#60a5fa40'}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: '"Brush Script MT", "Apple Chancery", cursive',
              fontStyle: 'italic',
              letterSpacing: '0.5px',
              boxShadow: displayMode === 'average'
                ? '0 0 12px #60a5fa60, inset 0 1px 2px rgba(255,255,255,0.2)'
                : '0 2px 4px rgba(0,0,0,0.3)',
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.15)';
              e.currentTarget.style.boxShadow = displayMode === 'average'
                ? '0 0 16px #60a5fa80, inset 0 1px 2px rgba(255,255,255,0.3)'
                : '0 0 12px #60a5fa60, inset 0 1px 2px rgba(255,255,255,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = displayMode === 'average'
                ? '0 0 12px #60a5fa60, inset 0 1px 2px rgba(255,255,255,0.2)'
                : '0 2px 4px rgba(0,0,0,0.3)';
            }}
          >
            A
          </button>
        )}

        {/* Resting Heart Rate Toggle - Cursive "R" button at BOTTOM RIGHT (inside bezel) */}
        {showRestingToggle && (
          <button
            onClick={() => {
              setDisplayMode('resting');
            }}
            title="Toggle Resting Heart Rate"
            style={{
              position: 'absolute',
              bottom: size === 'large' ? '50px' : '40px',
              right: size === 'large' ? '55px' : '45px',
              fontSize: `${labelSize + 4}px`,
              fontWeight: '400',
              color: displayMode === 'resting' ? '#a78bfa' : 'rgba(167, 139, 250, 0.6)',
              background: 'rgba(0,0,0,0.5)',
              padding: '2px 8px',
              borderRadius: '10px',
              border: `1px solid ${displayMode === 'resting' ? '#a78bfa80' : '#a78bfa40'}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: '"Brush Script MT", "Apple Chancery", cursive',
              fontStyle: 'italic',
              letterSpacing: '0.5px',
              boxShadow: displayMode === 'resting'
                ? '0 0 12px #a78bfa60, inset 0 1px 2px rgba(255,255,255,0.2)'
                : '0 2px 4px rgba(0,0,0,0.3)',
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.15)';
              e.currentTarget.style.boxShadow = displayMode === 'resting'
                ? '0 0 16px #a78bfa80, inset 0 1px 2px rgba(255,255,255,0.3)'
                : '0 0 12px #a78bfa60, inset 0 1px 2px rgba(255,255,255,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = displayMode === 'resting'
                ? '0 0 12px #a78bfa60, inset 0 1px 2px rgba(255,255,255,0.2)'
                : '0 2px 4px rgba(0,0,0,0.3)';
            }}
          >
            R
          </button>
        )}
      </div>

      {/* Label below gauge - Elegant display */}
      <div className="mt-4 text-center">
        <div
          style={{
            fontSize: `${labelSize + 2}px`,
            fontWeight: '600',
            color: color,
            fontFamily: '"Montserrat", "SF Pro Display", sans-serif',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            textShadow: `0 0 16px ${color}60, 0 2px 4px rgba(0,0,0,0.6)`,
          }}
        >
          {label}
        </div>
        {/* Subtitle - Optional additional info like A1C */}
        {subtitle && (
          <div
            style={{
              fontSize: `${labelSize}px`,
              fontWeight: '500',
              color: 'rgba(255, 255, 255, 0.8)',
              fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
              letterSpacing: '1px',
              marginTop: '4px',
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
