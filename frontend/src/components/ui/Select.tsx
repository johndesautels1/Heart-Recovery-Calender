import React, { forwardRef } from 'react';
import clsx from 'clsx';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder = 'Select an option', className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-bold mb-1" style={{ color: 'var(--accent)' }}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={clsx(
            'glass-input cursor-pointer',
            error && 'border-red-500',
            className
          )}
          {...props}
        >
          <option value="" disabled className="text-gray-600">
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value} className="text-gray-900 font-semibold bg-white">
              {option.label}
            </option>
          ))}
        </select>
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

Select.displayName = 'Select';
