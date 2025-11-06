import React, { useState } from 'react';
import { Droplet, Waves } from 'lucide-react';

interface WaterButtonProps {
  ounces: number;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'glass';
  disabled?: boolean;
}

export function WaterButton({ ounces, onClick, size = 'md', variant = 'primary', disabled = false }: WaterButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;

    // Create ripple effect
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples(prev => [...prev, { id, x, y }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 600);

    // Trigger press animation
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 150);

    onClick();
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm min-w-[80px]',
    md: 'px-6 py-3 text-base min-w-[100px]',
    lg: 'px-8 py-4 text-lg min-w-[120px]',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        relative overflow-hidden rounded-2xl font-bold
        ${sizeClasses[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${isPressed ? 'scale-95' : 'scale-100'}
        transition-all duration-150 ease-out
        group
      `}
      style={{
        background: variant === 'primary'
          ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%)'
          : 'rgba(6, 182, 212, 0.1)',
        boxShadow: variant === 'primary'
          ? `
            0 0 20px rgba(6, 182, 212, 0.4),
            0 0 40px rgba(6, 182, 212, 0.2),
            0 4px 8px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.3),
            inset 0 -1px 0 rgba(0, 0, 0, 0.2)
          `
          : `
            0 0 15px rgba(6, 182, 212, 0.2),
            0 2px 4px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.1)
          `,
        backdropFilter: variant === 'glass' ? 'blur(10px)' : 'none',
        border: variant === 'glass' ? '1px solid rgba(6, 182, 212, 0.3)' : 'none',
      }}
    >
      {/* Animated water wave background */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
          animation: 'wave 2s infinite',
        }}
      />

      {/* Ripple effects */}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 animate-ripple pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: '10px',
            height: '10px',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}

      {/* Glowing orb effect on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.3) 0%, transparent 70%)',
        }}
      />

      {/* Content */}
      <div className="relative flex items-center justify-center gap-2 text-white drop-shadow-lg z-10">
        <div className="relative">
          <Droplet
            className={`${iconSizes[size]} group-hover:scale-110 transition-transform duration-200`}
            fill="currentColor"
          />
          {/* Droplet shine effect */}
          <div
            className="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full opacity-70 group-hover:opacity-100 transition-opacity"
            style={{ filter: 'blur(0.5px)' }}
          />
        </div>
        <span className="font-extrabold tracking-wide">
          +{ounces} oz
        </span>
        <Waves
          className={`${iconSizes[size]} opacity-70 group-hover:opacity-100 group-hover:animate-pulse transition-all duration-200`}
        />
      </div>

      {/* Bottom shine/reflection */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1/3 opacity-20"
        style={{
          background: 'linear-gradient(to top, rgba(255, 255, 255, 0.4), transparent)',
        }}
      />

      {/* Top glass reflection */}
      <div
        className="absolute top-0 left-0 right-0 h-1/4 opacity-30"
        style={{
          background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.6), transparent)',
        }}
      />

      {/* Animated floating bubbles on hover */}
      <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bubble bubble-1" />
        <div className="bubble bubble-2" />
        <div className="bubble bubble-3" />
      </div>

      <style>{`
        @keyframes wave {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes ripple {
          0% {
            width: 10px;
            height: 10px;
            opacity: 1;
          }
          100% {
            width: 200px;
            height: 200px;
            opacity: 0;
          }
        }

        @keyframes bubble-float {
          0% {
            transform: translateY(100%) scale(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100%) scale(1);
            opacity: 0;
          }
        }

        .bubble {
          position: absolute;
          bottom: 0;
          background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.2));
          border-radius: 50%;
          animation: bubble-float 3s ease-in-out infinite;
        }

        .bubble-1 {
          left: 20%;
          width: 8px;
          height: 8px;
          animation-delay: 0s;
          animation-duration: 2.5s;
        }

        .bubble-2 {
          left: 50%;
          width: 6px;
          height: 6px;
          animation-delay: 0.5s;
          animation-duration: 3s;
        }

        .bubble-3 {
          left: 75%;
          width: 10px;
          height: 10px;
          animation-delay: 1s;
          animation-duration: 2.8s;
        }

        .animate-ripple {
          animation: ripple 0.6s ease-out;
        }
      `}</style>
    </button>
  );
}
