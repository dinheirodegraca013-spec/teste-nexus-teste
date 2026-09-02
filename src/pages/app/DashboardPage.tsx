import React, { useState } from 'react';
import { 
  Users, 
  UserCheck, 
  Contact, 
  Target, 
  Calendar, 
  Tag, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  ArrowUpRight, 
  Plus,
  TrendingUp,
  Smartphone,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { localStore } from '../../lib/supabase';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { organization, profile } = useAuth();
  const orgId = organization?.id || 'org-alpha';

  const contacts = localStore.getContacts(orgId);
  const leaders = localStore.getLeaders(orgId);
  const coordinators = localStore.getCoordinators(orgId);
  const goals = localStore.getGoals(orgId);
  const events = localStore.getEvents(orgId);
  const carStickers = localStore.getCarStickers(orgId);
  const houseStickers = localStore.getHouseStickers(orgId);

  // Overall goal percentage calculation
  const totalTarget = goals.reduce((acc, g) => acc + (Number(g.target_value) || 0), 0);
  const totalCurrent = goals.reduce((acc, g) => acc + (Number(g.current_value) || 0), 0);
  const goalsPercentage = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;

  // Multiplier contacts count
  const multipliersCount = contacts.filter(c => c.status === 'multiplier').length;

  // Dynamic territorial breakdown from real data
  const territoryMap = new Map<string, { contactsCount: number; leadersCount: number }>();
  leaders.forEach(l => {
    const t = l.territory || l.neighborhood || 'Geral';
    const current = territoryMap.get(t) || { contactsCount: 0, leadersCount: 0 };
    current.leadersCount += 1;
    territoryMap.set(t, current);
  });
  contacts.forEach(c => {
    const t = c.territory || c.neighborhood || 'Geral';
    const current = territoryMap.get(t) || { contactsCount: 0, leadersCount: 0 };
    current.contactsCount += 1;
    territoryMap.set(t, current);
  });
  const territoryHighlights = Array.from(territoryMap.entries()).slice(0, 3);

  return (
    <div className="space-y-6 text-left">
      {/* Top Greeting & Fast Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs text-slate-400 font-mono">
            {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date())}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-950 mt-0.5 tracking-tight">
            Olá, {profile?.full_name?.split(' ')[0] || 'Gestor'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Visão geral da operação em <strong className="text-slate-800 font-semibold">{organization?.name || 'Sua Organização'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate('/app/campo')}
            leftIcon={<Smartphone className="w-3.5 h-3.5 text-emerald-600" />}
            className="text-xs border-emerald-300 text-emerald-800 bg-emerald-50/50 hover:bg-emerald-50"
          >
            Ação de Campo
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => onNavigate('/app/crm')}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            Novo Contato
          </Button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Contatos CRM"
          value={contacts.length.toLocaleString('pt-BR')}
          subValue="Base ativa cadastrada"
          change={{ value: `${multipliersCount} multiplicadores`, isPositive: true }}
          icon={<Contact className="w-4 h-4" />}
        />
        <StatCard
          label="Lideranças"
          value={leaders.length.toLocaleString('pt-BR')}
          subValue={`${coordinators.length} coordenadores`}
          change={{ value: `${territoryMap.size} territórios`, isPositive: true }}
          icon={<UserCheck className="w-4 h-4" />}
        />
        <StatCard
          label="Metas Globais"
          value={goals.length > 0 ? `${goalsPercentage}%` : '0%'}
          subValue={`${goals.length} metas cadastradas`}
          change={{ value: goals.length > 0 ? `${totalCurrent}/${totalTarget}` : 'Sem metas', isPositive: true }}
          icon={<Target className="w-4 h-4" />}
        />
        <StatCard
          label="Adesivagem Total"
          value={(carStickers.length + houseStickers.length).toLocaleString('pt-BR')}
          subValue={`${carStickers.length} carros • ${houseStickers.length} casas`}
          change={{ value: 'Registros ativos', isPositive: true }}
          icon={<Tag className="w-4 h-4" />}
        />
      </div>

      {/* Central Split: Metas & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Goals Progress */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Target className="w-4 h-4 text-slate-500" />
                  Metas Estratégicas em Andamento
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Acompanhamento de volume e entrega por setor</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('/app/metas')}
                className="text-xs text-slate-500 hover:text-slate-900"
                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              >
                Ver todas
              </Button>
            </div>

            {goals.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <Target className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-medium text-slate-600">Nenhuma meta cadastrada ainda</p>
                <p className="text-slate-400 text-[11px] mt-0.5">Defina metas para contatos, lideranças ou adesivagens.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigate('/app/metas')}
                  className="mt-3 text-xs"
                >
                  Cadastrar Primeira Meta
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 mt-2">
                {goals.slice(0, 4).map((goal) => {
                  const percent = goal.target_value > 0 ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100)) : 0;
                  return (
                    <div key={goal.id} className="py-3.5 first:pt-2 last:pb-0">
                      <div className="flex items-start justify-between gap-2 text-xs">
                        <div>
                          <div className="font-semibold text-slate-900">{goal.title}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">{goal.responsible_name || 'Responsável não definido'}</div>
                        </div>
                        <div className="text-right font-mono">
                          <span className="font-semibold text-slate-900">{goal.current_value.toLocaleString('pt-BR')}</span>
                          <span className="text-slate-400 text-[11px]"> / {goal.target_value.toLocaleString('pt-BR')} {goal.unit}</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-slate-900 rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700 w-9 text-right font-mono">
                          {percent}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Territorial Breakdown */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-500" />
                Destaques por Território
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('/app/inteligencia')}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                Inteligência Territorial
              </Button>
            </div>
            
            {territoryHighlights.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                <p className="font-medium text-slate-600">Nenhum território mapeado ainda</p>
                <p className="text-slate-400 text-[11px] mt-0.5">Os territórios e bairros aparecerão conforme contatos e líderes forem cadastrados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                {territoryHighlights.map(([name, data]) => (
                  <div key={name} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-xs font-semibold text-slate-900 truncate">{name}</div>
                    <div className="text-lg font-bold font-mono text-slate-950 mt-1">{data.contactsCount} contatos</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-medium">{data.leadersCount} lideranças</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Upcoming Events & Activity Log */}
        <div className="space-y-4">
          {/* Upcoming Events Box */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                Próximos Eventos
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('/app/eventos')}
                className="text-xs text-slate-500 hover:text-slate-900 p-0"
              >
                Ver todos
              </Button>
            </div>

            <div className="mt-3 space-y-3">
              {events.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  <p className="font-medium text-slate-600">Nenhum evento agendado</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">Agende plenárias, caminhadas ou encontros.</p>
                </div>
              ) : (
                events.slice(0, 3).map((evt) => (
                  <div key={evt.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-slate-900 truncate">{evt.title}</span>
                      <Badge variant="neutral" size="sm">
                        {evt.event_type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1 font-mono text-slate-700">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(evt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • {evt.time}
                      </span>
                      <span className="truncate flex items-center gap-1 text-slate-500">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {evt.territory || evt.location}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 text-xs">
            <h3 className="font-semibold text-slate-900 border-b border-slate-100 pb-2">
              Resumo Operacional
            </h3>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-slate-700">
                <span className="text-slate-500">Multiplicadores Chave:</span>
                <span className="font-mono font-semibold text-slate-900">{multipliersCount} líderes</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="text-slate-500">Adesivos Carros:</span>
                <span className="font-mono font-semibold text-slate-900">{carStickers.length} registros</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="text-slate-500">Adesivos Casas:</span>
                <span className="font-mono font-semibold text-slate-900">{houseStickers.length} registros</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="text-slate-500">Plano Atual:</span>
                <span className="uppercase font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                  {organization?.plan || 'Starter'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
