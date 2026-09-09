import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  UserCheck, 
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
  ChevronRight,
  Car,
  Home,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Contact, Leader, Coordinator, Goal, CampaignEvent, CarSticker, HouseSticker, PresenceLog } from '../../types';
import { crmService, leadersService, coordinatorsService, goalsService, eventsService, stickersService, presenceService } from '../../services';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { organization, profile } = useAuth();
  const { error: toastError } = useToast();
  const orgId = organization?.id || '';

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [events, setEvents] = useState<CampaignEvent[]>([]);
  const [carStickers, setCarStickers] = useState<CarSticker[]>([]);
  const [houseStickers, setHouseStickers] = useState<HouseSticker[]>([]);
  const [presenceLogs, setPresenceLogs] = useState<PresenceLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const [
        contactsRes,
        leadersRes,
        coordsRes,
        goalsRes,
        eventsRes,
        carsRes,
        housesRes,
        presenceRes,
      ] = await Promise.all([
        crmService.getAll(orgId),
        leadersService.getAll(orgId),
        coordinatorsService.getAll(orgId),
        goalsService.getAll(orgId),
        eventsService.getAll(orgId),
        stickersService.getCarStickers(orgId),
        stickersService.getHouseStickers(orgId),
        presenceService.getLogs(orgId),
      ]);

      setContacts(contactsRes.data || []);
      setLeaders(leadersRes.data || []);
      setCoordinators(coordsRes.data || []);
      setGoals(goalsRes.data || []);
      setEvents(eventsRes.data || []);
      setCarStickers(carsRes.data || []);
      setHouseStickers(housesRes.data || []);
      setPresenceLogs(presenceRes.data || []);
    } catch (err: any) {
      toastError('Erro ao carregar painel geral: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, toastError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Overall goal percentage calculation
  const totalTarget = goals.reduce((acc, g) => acc + (Number(g.target_value) || 0), 0);
  const totalCurrent = goals.reduce((acc, g) => acc + (Number(g.current_value) || 0), 0);
  const goalsPercentage = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;

  // Multiplier contacts count
  const multipliersCount = contacts.filter(c => c.status === 'multiplier').length;

  // Real calculation for contacts added in the last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentContactsCount = contacts.filter(c => c.created_at && new Date(c.created_at) >= sevenDaysAgo).length;

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

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
          <span className="text-sm font-medium">Carregando dados da campanha...</span>
        </div>
      ) : (
        <>
          {/* Main 4 Eixos KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <StatCard
              title="1. Apoiadores Cadastrados"
              value={contacts.length}
              subtitle={`${multipliersCount} multiplicadores ativos`}
              icon={<Users className="w-4 h-4 text-slate-700" />}
              trend={recentContactsCount > 0 ? `+${recentContactsCount} novos (7d)` : undefined}
              onClick={() => onNavigate('/app/crm')}
            />
            <StatCard
              title="2. Carros Adesivados"
              value={carStickers.length}
              subtitle="Veículos com perfurado/adesivo"
              icon={<Car className="w-4 h-4 text-emerald-600" />}
              onClick={() => onNavigate('/app/adesivos')}
            />
            <StatCard
              title="3. Casas Adesivadas"
              value={houseStickers.length}
              subtitle="Placas residenciais instaladas"
              icon={<Home className="w-4 h-4 text-amber-600" />}
              onClick={() => onNavigate('/app/adesivos')}
            />
            <StatCard
              title="4. Check-ins de Presença"
              value={presenceLogs.length}
              subtitle={`${events.length} atos e plenárias`}
              icon={<UserCheck className="w-4 h-4 text-indigo-600" />}
              onClick={() => onNavigate('/app/presenca')}
            />
          </div>

          {/* Goals & Next Events Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* 4 Eixos Progress Panel */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Metas Globais de Mobilização</h3>
                    <p className="text-xs text-slate-500">Progresso consolidado das metas operacionais</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('/app/metas')}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  Ver Todas ({goals.length})
                </Button>
              </div>

              {goals.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nenhuma meta cadastrada ainda. Clique em "Ver Todas" para criar a primeira.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {goals.slice(0, 4).map((goal) => {
                    const percent = Math.min(100, Math.round((goal.current_value / (goal.target_value || 1)) * 100));
                    return (
                      <div key={goal.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{goal.title}</span>
                          <span className="font-mono text-slate-600 font-medium">
                            {goal.current_value} / {goal.target_value} {goal.unit} ({percent}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              percent >= 100 ? 'bg-emerald-500' : percent >= 50 ? 'bg-indigo-600' : 'bg-amber-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Next Events & Quick Agenda */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Próximos Eventos</h3>
                    <p className="text-xs text-slate-500">Agenda de rua da campanha</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('/app/eventos')}
                  className="text-xs text-slate-600 hover:text-slate-900"
                >
                  Ver Todos
                </Button>
              </div>

              {events.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nenhum evento agendado para os próximos dias.
                </div>
              ) : (
                <div className="space-y-3">
                  {events.slice(0, 3).map((evt) => (
                    <div key={evt.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 text-xs">{evt.title}</span>
                        <Badge variant="primary" size="sm">{evt.event_type}</Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                        <Clock className="w-3 h-3" />
                        <span>{evt.date} às {evt.time}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-600">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{evt.location}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Territorial Breakdown */}
          {territoryHighlights.length > 0 && (
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-600" />
                  Destaques Territoriais da Operação
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('/app/inteligencia')}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  Inteligência Territorial &rarr;
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {territoryHighlights.map(([territory, data]) => (
                  <div key={territory} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <div className="font-bold text-slate-900 text-xs">{territory}</div>
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Apoiadores: <strong className="text-slate-900 font-mono">{data.contactsCount}</strong></span>
                      <span>Lideranças: <strong className="text-slate-900 font-mono">{data.leadersCount}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
