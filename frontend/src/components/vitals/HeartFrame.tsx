import React from 'react';

interface HeartFrameProps {
  children: React.ReactNode;
}

export function HeartFrame({ children }: HeartFrameProps) {
  return (
    <div className="relative min-h-screen">
      {/* Very faint heart outline SVG as background */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
        style={{
          opacity: 0.03,
          filter: 'drop-shadow(0 0 20px rgba(239, 68, 68, 0.1))',
        }}
      >
        <defs>
          <linearGradient id="heartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
            <stop offset="50%" stopColor="#dc2626" stopOpacity="1" />
            <stop offset="100%" stopColor="#991b1b" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Heart path */}
        <path
          d="M 500,300
             C 500,250 450,200 400,200
             C 350,200 300,250 300,300
             C 300,350 350,400 500,600
             C 650,400 700,350 700,300
             C 700,250 650,200 600,200
             C 550,200 500,250 500,300 Z"
          fill="none"
          stroke="url(#heartGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Subtle inner glow */}
        <path
          d="M 500,300
             C 500,250 450,200 400,200
             C 350,200 300,250 300,300
             C 300,350 350,400 500,600
             C 650,400 700,350 700,300
             C 700,250 650,200 600,200
             C 550,200 500,250 500,300 Z"
          fill="none"
          stroke="url(#heartGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.3"
          filter="blur(4px)"
        />
      </svg>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
