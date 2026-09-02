import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'neutral' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  const variantStyles = {
    default: 'bg-slate-100 text-slate-800 border border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-semibold',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200/80 font-semibold',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/80 font-semibold',
    neutral: 'bg-slate-50 text-slate-600 border border-slate-200',
    info: 'bg-sky-50 text-sky-700 border border-sky-200/80 font-semibold',
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-md whitespace-nowrap ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
};
