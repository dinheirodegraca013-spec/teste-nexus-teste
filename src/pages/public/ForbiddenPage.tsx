import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface ForbiddenPageProps {
  onNavigate: (path: string) => void;
}

export const ForbiddenPage: React.FC<ForbiddenPageProps> = ({ onNavigate }) => {
  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 text-center">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        <div className="w-14 h-14 rounded-full bg-rose-950/80 border border-rose-800/60 flex items-center justify-center text-rose-400 mx-auto mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-1">
          Erro 403
        </div>
        <h2 className="text-xl font-bold text-zinc-100">
          Acesso Não Autorizado
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
          Você não possui permissão para visualizar este módulo ou recurso na organização ativa. Contate o administrador da conta para solicitar acesso.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('/app/dashboard')}
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
          >
            Voltar ao Dashboard
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('/')}
          >
            Página Inicial
          </Button>
        </div>
      </div>
    </div>
  );
};
