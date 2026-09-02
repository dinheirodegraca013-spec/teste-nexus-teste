import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Falha ao carregar',
  message = 'Ocorreu um problema de comunicação com o Supabase. Verifique sua conexão e tente novamente.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-10 text-center border border-rose-200 rounded-2xl bg-rose-50/50 ${className}`}>
      <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-3 border border-rose-200">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-rose-900">{title}</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button size="sm" variant="outline" onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  );
};
