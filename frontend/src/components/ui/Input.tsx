import React, { forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-bold mb-1" style={{ color: 'var(--accent)' }}>
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div
              className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
              style={{ color: 'var(--accent)' }}
            >
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={clsx(
              'glass-input',
              icon && 'pl-10',
              error && 'border-red-500',
              className
            )}
            {...props}
          />
        </div>
        {hint && !error && (
          <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
            {hint}
          </p>
        )}
        {error && (
          <p className="mt-1 text-sm font-bold" style={{ color: 'var(--bad)' }}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
