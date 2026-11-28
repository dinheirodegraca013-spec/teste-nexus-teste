import React, { SelectHTMLAttributes, forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  options,
  error,
  helperText,
  className = '',
  id,
  ...props
}, ref) => {
  const generatedId = useId();
  const selectId = id || (label || error || helperText ? `select-${generatedId.replace(/:/g, '')}` : undefined);
  const messageId = selectId && (error || helperText) ? `${selectId}-message` : undefined;

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-slate-700">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={messageId}
          className={`w-full appearance-none bg-white text-slate-900 text-sm rounded-lg border py-2 pl-3 pr-9 transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 shadow-2xs ${
            error ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 hover:border-slate-300'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-white text-slate-900">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
      {error ? (
        <p id={messageId} className="text-xs text-rose-600 font-medium">{error}</p>
      ) : helperText ? (
        <p id={messageId} className="text-xs text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
});

Select.displayName = 'Select';
