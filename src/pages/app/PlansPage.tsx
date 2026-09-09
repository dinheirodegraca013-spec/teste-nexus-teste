import React, { useState } from 'react';
import { Zap, Check, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { organizationsService } from '../../services';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const PlansPage: React.FC = () => {
  const { organization } = useAuth();
  const { success, error: toastError } = useToast();
  const currentPlan = organization?.plan || 'starter';
  const [isUpdating, setIsUpdating] = useState(false);

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

  const handleSelectPlan = async (planId: string) => {
    if (organization?.id) {
      setIsUpdating(true);
      try {
        const { error } = await organizationsService.update(organization.id, {
          plan: planId as any,
        });

        if (error) {
          toastError('Erro ao atualizar plano: ' + error.message);
        } else {
          success(`Plano atualizado para ${planId.toUpperCase()} no Supabase!`);
          setTimeout(() => {
            window.location.reload();
          }, 400);
        }
      } catch (err: any) {
        toastError('Erro inesperado: ' + err.message);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-slate-700" />
            Planos & Capacidade SaaS
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
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
              className={`p-6 rounded-2xl border flex flex-col justify-between space-y-6 relative transition-all bg-white ${
                isCurrent
                  ? 'border-indigo-500 shadow-lg ring-1 ring-indigo-500/30'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {p.popular && !isCurrent && (
                <span className="absolute -top-2.5 right-4 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900 text-white font-mono">
                  Mais Escolhido
                </span>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-900">{p.name}</h3>
                  {isCurrent && (
                    <Badge variant="success" size="sm">
                      Plano Atual
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-slate-500 mt-2 min-h-[36px]">{p.description}</p>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-900">{p.price}</span>
                    <span className="text-xs text-slate-400">{p.period}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inclui:</span>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {p.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                {isCurrent ? (
                  <div className="text-xs text-emerald-700 font-semibold flex items-center justify-center gap-1 py-2 bg-emerald-50 rounded-xl">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Plano Ativo</span>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectPlan(p.id)}
                    disabled={isUpdating}
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
