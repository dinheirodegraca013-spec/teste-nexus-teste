import React from 'react';
import { Zap, Check, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { localStore } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const PlansPage: React.FC = () => {
  const { organization } = useAuth();
  const { success } = useToast();
  const currentPlan = organization?.plan || 'starter';

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 'R$ 0',
      period: '/mês',
      description: 'Ideal para testes de conceito e pequenas organizações de bairro.',
      features: [
        'Até 500 contatos no CRM',
        '2 Coordenadores territoriais',
        '10 Lideranças comunitárias',
        '1 Usuário administrador',
        'Isolamento RLS Supabase',
      ],
      limit: '500 contatos',
    },
    {
      id: 'starter',
      name: 'Starter',
      price: 'R$ 290',
      period: '/mês',
      description: 'Para campanhas locais e vereadores em cidades de médio porte.',
      features: [
        'Até 10.000 contatos no CRM',
        '10 Coordenadores territoriais',
        '100 Lideranças comunitárias',
        '5 Usuários com papéis granulares',
        'Adesivagem de veículos e casas',
        'Controle de campo mobile-first',
      ],
      limit: '10.000 contatos',
      popular: true,
    },
    {
      id: 'pro',
      name: 'Professional',
      price: 'R$ 790',
      period: '/mês',
      description: 'Estrutura completa para prefeitos e grandes mandatos legislativos.',
      features: [
        'Até 50.000 contatos no CRM',
        '30 Coordenadores territoriais',
        '500 Lideranças comunitárias',
        '15 Usuários na equipe',
        'Inteligência territorial e demandas',
        'Relatórios executivos e exportação',
        'Suporte prioritário',
      ],
      limit: '50.000 contatos',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Sob Consulta',
      period: '',
      description: 'Para campanhas majoritárias estaduais, federais e diretórios nacionais.',
      features: [
        'Contatos Ilimitados',
        'Coordenadores Ilimitados',
        'Lideranças Ilimitadas',
        'Usuários ilimitados com auditoria',
        'SLA 99.9% e backup dedicado',
        'Gestor de conta exclusivo',
      ],
      limit: 'Ilimitado',
    },
  ];

  const handleSelectPlan = (planId: string) => {
    if (organization) {
      const updated = {
        ...organization,
        plan: planId as any,
      };
      localStore.saveOrganization(updated);
      success(`Plano atualizado para ${planId.toUpperCase()}!`);
      setTimeout(() => {
        window.location.reload();
      }, 400);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/60">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-zinc-400" />
            Planos & Capacidade SaaS
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Escalabilidade operacional e limites de armazenamento de contatos e usuários
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p) => {
          const isCurrent = currentPlan === p.id;

          return (
            <div
              key={p.id}
              className={`p-6 rounded-2xl border flex flex-col justify-between space-y-6 relative transition-all ${
                isCurrent
                  ? 'bg-zinc-900 border-zinc-500 shadow-xl ring-1 ring-zinc-500/50'
                  : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {p.popular && !isCurrent && (
                <span className="absolute -top-2.5 right-4 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-950 font-mono">
                  Mais Escolhido
                </span>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-zinc-100">{p.name}</h3>
                  {isCurrent && (
                    <Badge variant="success" size="sm">
                      Plano Atual
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-zinc-400 mt-2 min-h-[36px]">{p.description}</p>

                <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-baseline gap-1">
                  <span className="text-2xl font-black font-mono text-zinc-100">{p.price}</span>
                  <span className="text-xs text-zinc-500">{p.period}</span>
                </div>

                <div className="mt-5 space-y-2.5 text-xs text-zinc-300">
                  {p.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                {isCurrent ? (
                  <div className="text-center py-2 text-xs font-semibold text-zinc-400 bg-zinc-950/60 rounded-lg border border-zinc-800">
                    Plano Ativo
                  </div>
                ) : (
                  <Button
                    variant={p.popular ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => handleSelectPlan(p.id)}
                    className="w-full text-xs"
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Mudar para {p.name}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
