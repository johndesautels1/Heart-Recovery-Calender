import React from 'react';
import clsx from 'clsx';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'light' | 'dark';
  onClick?: () => void;
}

export function GlassCard({ children, className, variant = 'light', onClick }: GlassCardProps) {
  return (
    <div
      className={clsx(
        'p-6 rounded-xl transition-all duration-300',
        variant === 'light' ? 'glass' : 'glass-dark',
        onClick && 'cursor-pointer hover:scale-[1.02] hover:shadow-xl',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
