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
          <label className="block text-sm font-bold text-blue-900 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-700">
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
          <p className="mt-1 text-sm font-semibold text-gray-700">{hint}</p>
        )}
        {error && (
          <p className="mt-1 text-sm font-bold text-red-700">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
