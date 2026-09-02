import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Carregando dados...',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center text-slate-800 ${className}`}>
      <Loader2 className="w-6 h-6 text-slate-900 animate-spin mb-3" />
      <p className="text-xs text-slate-500 font-medium tracking-wide">{message}</p>
    </div>
  );
};
