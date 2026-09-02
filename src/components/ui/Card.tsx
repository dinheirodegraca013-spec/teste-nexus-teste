import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs text-slate-900 transition-all ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
