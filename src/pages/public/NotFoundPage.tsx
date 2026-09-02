import React from 'react';
import { HelpCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface NotFoundPageProps {
  onNavigate: (path: string) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigate }) => {
  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 text-center">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 mx-auto mb-4">
          <HelpCircle className="w-7 h-7" />
        </div>
        <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
          Erro 404
        </div>
        <h2 className="text-xl font-bold text-zinc-100">
          Página Não Encontrada
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
          O endereço acessado não existe ou foi movido. Verifique o caminho ou retorne para o início.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('/app/dashboard')}
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
          >
            Ir para o Dashboard
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('/')}
          >
            Início
          </Button>
        </div>
      </div>
    </div>
  );
};
