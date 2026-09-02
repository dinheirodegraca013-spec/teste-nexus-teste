import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface TermsPageProps {
  onNavigate: (path: string) => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onNavigate }) => {
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
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100">Termos de Uso do NEXUS</h1>
          <p className="text-xs text-zinc-500 mt-1">Última atualização: Setembro de 2026</p>
        </div>

        <section className="space-y-2 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-base font-semibold text-zinc-100">1. Escopo do Serviço</h2>
          <p>
            O NEXUS é uma plataforma de software como serviço (SaaS) multi-tenant voltada para gestão estratégica, coordenação de lideranças, CRM de contatos e inteligência territorial de operações.
          </p>
        </section>

        <section className="space-y-2 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-base font-semibold text-zinc-100">2. Isolamento de Dados e Multi-Tenancy</h2>
          <p>
            Cada organização cadastrada opera em ambiente isolado. É estritamente garantido por políticas de segurança no nível de banco de dados (PostgreSQL Row Level Security) que nenhuma organização ou usuário terá acesso aos dados de terceiros.
          </p>
        </section>

        <section className="space-y-2 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-base font-semibold text-zinc-100">3. Responsabilidade do Usuário</h2>
          <p>
            O usuário administrador é responsável pela guarda das credenciais de acesso, pelo gerenciamento de permissões atribuídas aos membros da sua equipe e pela legalidade das informações cadastradas.
          </p>
        </section>

        <section className="space-y-2 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-base font-semibold text-zinc-100">4. Disponibilidade e Infraestrutura</h2>
          <p>
            A plataforma opera sobre infraestrutura moderna em nuvem com alta redundância e backups automáticos.
          </p>
        </section>
      </div>
    </div>
  );
};
