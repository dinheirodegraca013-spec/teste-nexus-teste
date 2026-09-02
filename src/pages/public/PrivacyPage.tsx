import React from 'react';
import { ArrowLeft, Lock } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface PrivacyPageProps {
  onNavigate: (path: string) => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onNavigate }) => {
  return (
    <div className="flex-1 py-12 px-4 sm:px-6 max-w-4xl mx-auto text-left">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate('/')}
        leftIcon={<ArrowLeft className="w-4 h-4" />}
        className="mb-6 text-zinc-400"
      >
        Voltar à página inicial
      </Button>

      <div className="p-8 sm:p-10 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-6">
        <div className="border-b border-zinc-800 pb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100">Política de Privacidade</h1>
          <p className="text-xs text-zinc-500 mt-1">Conformidade com a LGPD e Melhores Práticas de Segurança</p>
        </div>

        <section className="space-y-2 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-base font-semibold text-zinc-100">1. Coleta e Tratamento de Dados</h2>
          <p>
            Os dados coletados (nomes, e-mails, telefones, territórios e informações operacionais) pertencem exclusivamente à organização que os registrou. O NEXUS não comercializa, não compartilha e não utiliza esses dados para finalidades alheias à prestação do serviço.
          </p>
        </section>

        <section className="space-y-2 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-base font-semibold text-zinc-100">2. Criptografia e Armazenamento</h2>
          <p>
            Todas as comunicações são trafegadas sob protocolo seguro HTTPS com criptografia TLS. Os dados em repouso são protegidos no PostgreSQL com chaves de acesso anônimas e controle estrito por RLS (Row Level Security).
          </p>
        </section>

        <section className="space-y-2 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-base font-semibold text-zinc-100">3. Direitos do Titular</h2>
          <p>
            Em conformidade com a LGPD, os administradores de cada organização possuem total autonomia para visualizar, retificar ou excluir qualquer registro de contato ou membro a qualquer momento.
          </p>
        </section>
      </div>
    </div>
  );
};
