import React from 'react';

export interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  change?: {
    value: string;
    isPositive?: boolean;
  };
  icon?: React.ReactNode;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  change,
  icon,
  className = '',
}) => {
  return (
    <div className={`p-5 rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between transition-all hover:border-slate-300 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>
      <div className="mt-2">
        <div className="text-2xl sm:text-3xl font-semibold tracking-tighter text-slate-900 font-mono">
          {value}
        </div>
        {(subValue || change) && (
          <div className="mt-1.5 flex items-center gap-2 text-xs">
            {change && (
              <span className={`font-semibold ${change.isPositive ? 'text-emerald-600' : 'text-slate-500'}`}>
                {change.value}
              </span>
            )}
            {subValue && <span className="text-slate-400">{subValue}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
