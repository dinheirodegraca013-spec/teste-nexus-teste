import React from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface ConfirmationPageProps {
  onNavigate: (path: string) => void;
}

export const ConfirmationPage: React.FC<ConfirmationPageProps> = ({ onNavigate }) => {
  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-zinc-100">
          Ação Confirmada com Sucesso
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
          Seu e-mail ou procedimento foi validado junto aos serviços do Supabase. Você já pode acessar todas as funcionalidades da sua organização.
        </p>
        <div className="mt-6">
          <Button
            variant="primary"
            size="md"
            onClick={() => onNavigate('/login')}
            className="w-full"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Acessar o Painel
          </Button>
        </div>
      </div>
    </div>
  );
};
