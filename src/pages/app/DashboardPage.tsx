import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Users, 
  UserCheck, 
  Target, 
  Calendar, 
  Clock, 
  MapPin, 
  Plus,
  Smartphone,
  Car,
  Home,
  Loader2,
  Bell,
  AlertTriangle,
  Package
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Contact, Leader, Coordinator, Goal, CampaignEvent, CarSticker, HouseSticker, PresenceLog } from '../../types';
import { crmService, leadersService, coordinatorsService, goalsService, eventsService, stickersService, presenceService } from '../../services';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { getOperationalIdentity } from '../../utils/operationalIdentity';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
}

/**
 * Utilitário com timeout estrito para garantir que nenhuma consulta individual
 * trave a renderização do Dashboard.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, serviceName: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`Tempo limite de ${timeoutMs}ms excedido ao consultar ${serviceName}`);
      (err as any).code = 'TIMEOUT';
      (err as any).details = `A requisição para ${serviceName} não respondeu em ${timeoutMs}ms.`;
      (err as any).hint = 'Verifique se há bloqueio de RLS, conectividade ou latência do Supabase.';
      reject(err);
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function summarizeDashboardError(error: unknown) {
  const candidate = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  return {
    code: typeof candidate.code === 'string' ? candidate.code : undefined,
    message: typeof candidate.message === 'string' ? candidate.message : String(error),
    status: typeof candidate.status === 'number' ? candidate.status : undefined,
  };
}

/**
 * Trata o resultado de cada consulta sem mascarar o erro.
 * Registra no console apenas tabela/serviço e um resumo seguro do erro.
 * Se a tabela estiver vazia, retorna array vazio sem registrar erro.
 */
function processQueryResult<T>(
  result: PromiseSettledResult<{ data?: T[] | null; error?: any }>,
  serviceName: string
): T[] {
  if (result.status === 'rejected') {
    const err = result.reason;
    console.error(`[NEXUS DASHBOARD] Erro no serviço: ${serviceName}`, {
      service: serviceName,
      ...summarizeDashboardError(err),
      code: err?.code || 'FETCH_REJECTED',
    });
    return [];
  }

  const { data, error } = result.value;
  if (error) {
    console.error(`[NEXUS DASHBOARD] Erro retornado pela tabela/serviço: ${serviceName}`, {
      service: serviceName,
      ...summarizeDashboardError(error),
      code: error.code || 'UNKNOWN_ERROR',
    });
    return [];
  }

  return Array.isArray(data) ? data : [];
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { organization, profile, user } = useAuth();
  const operationalIdentity = getOperationalIdentity(profile, user?.email);
  const { error: toastError } = useToast();
  const orgId = organization?.id || profile?.organization_id || '';

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [events, setEvents] = useState<CampaignEvent[]>([]);
  const [carStickers, setCarStickers] = useState<CarSticker[]>([]);
  const [houseStickers, setHouseStickers] = useState<HouseSticker[]>([]);
  const [presenceLogs, setPresenceLogs] = useState<PresenceLog[]>([]);
  const [activeView, setActiveView] = useState<'overview' | 'report'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadGenerationRef = useRef(0);

  const loadData = useCallback(async () => {
    const loadGeneration = ++loadGenerationRef.current;
    const isCurrentLoad = () => loadGeneration === loadGenerationRef.current;
    setIsLoading(true);
    try {
      if (!orgId) {
        if (!isCurrentLoad()) return;
        console.warn('[NEXUS DASHBOARD] Nenhum organization_id válido encontrado no perfil ou organização.');
        setContacts([]);
        setLeaders([]);
        setCoordinators([]);
        setGoals([]);
        setEvents([]);
        setCarStickers([]);
        setHouseStickers([]);
        setPresenceLogs([]);
        setLoadError('Nenhuma organização vinculada ao seu usuário. Entre em contato com o administrador para vincular sua conta.');
        return;
      }
      setLoadError(null);

      const [
        contactsRes,
        leadersRes,
        coordsRes,
        goalsRes,
        eventsRes,
        carsRes,
        housesRes,
        presenceRes,
      ] = await Promise.allSettled([
        withTimeout(crmService.getAll(orgId), 6000, 'crm_contacts'),
        withTimeout(leadersService.getAll(orgId), 6000, 'leaders'),
        withTimeout(coordinatorsService.getAll(orgId), 6000, 'coordinators'),
        withTimeout(goalsService.getAll(orgId), 6000, 'goals'),
        withTimeout(eventsService.getAll(orgId), 6000, 'campaign_events'),
        withTimeout(stickersService.getCarStickers(orgId), 6000, 'car_stickers'),
        withTimeout(stickersService.getHouseStickers(orgId), 6000, 'house_stickers'),
        withTimeout(presenceService.getLogs(orgId), 6000, 'field_presences'),
      ]);

      if (!isCurrentLoad()) return;

      const failedQuery = [
        contactsRes, leadersRes, coordsRes, goalsRes,
        eventsRes, carsRes, housesRes, presenceRes,
      ].find((result) => result.status === 'rejected' || Boolean(result.value?.error));
      if (failedQuery) {
        setLoadError('Não foi possível carregar todos os dados do painel. Tente novamente.');
      }

      setContacts(processQueryResult(contactsRes, 'crm_contacts'));
      setLeaders(processQueryResult(leadersRes, 'leaders'));
      setCoordinators(processQueryResult(coordsRes, 'coordinators'));
      setGoals(processQueryResult(goalsRes, 'goals'));
      setEvents(processQueryResult(eventsRes, 'campaign_events'));
      setCarStickers(processQueryResult(carsRes, 'car_stickers'));
      setHouseStickers(processQueryResult(housesRes, 'house_stickers'));
      setPresenceLogs(processQueryResult(presenceRes, 'field_presences'));
    } catch (err: any) {
      if (!isCurrentLoad()) return;
      console.error('[NEXUS DASHBOARD] Erro inesperado ao carregar dados da dashboard:', {
        service: 'dashboard_general',
        ...summarizeDashboardError(err),
        code: err?.code || 'UNEXPECTED_ERROR',
      });
      toastError('Erro ao carregar painel geral: ' + (err?.message || 'Erro inesperado'));
    } finally {
      if (isCurrentLoad()) setIsLoading(false);
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
  const alertGoals = goals.filter((goal) => Number(goal.target_value) > 0 && Number(goal.current_value) < Number(goal.target_value));
  const criticalGoals = alertGoals.filter((goal) => Number(goal.current_value) / Number(goal.target_value) < 0.5);
  const goalCompletion = goals.length > 0 ? Math.round(goalsPercentage) : 0;

  return (
    <div className="-m-3 sm:-m-6 md:-m-8 min-h-[calc(100vh-3.5rem)] bg-[#090c1b] p-3 text-left text-slate-100 sm:p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
            NEXUS · Centro de operação
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Olá, {operationalIdentity.label}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {organization?.name || 'Sua organização'} · {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date())}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
            <Bell className="h-3.5 w-3.5 text-amber-300" />
            Alertas <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{criticalGoals.length}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate('/app/campo')}
            leftIcon={<Smartphone className="w-3.5 h-3.5 text-emerald-600" />}
            className="border-emerald-400/30 bg-emerald-400/10 text-xs text-emerald-300 hover:bg-emerald-400/20"
          >
            Ação de Campo
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => onNavigate('/app/crm')}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            className="bg-gradient-to-r from-violet-500 to-blue-500 text-xs shadow-lg shadow-violet-950/30"
          >
            Novo Contato
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#11152b] py-20 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-violet-300" />
          <span className="text-sm font-medium">Carregando dados da campanha...</span>
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-rose-300/20 bg-[#11152b] py-12">
          <ErrorState
            title="Organização não identificada"
            message={loadError}
            onRetry={() => loadData()}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'Apoiadores', value: contacts.length, detail: `${multipliersCount} multiplicadores`, icon: <Users className="h-4 w-4" />, color: 'text-violet-300', path: '/app/crm' },
              { label: 'Carros', value: carStickers.length, detail: 'adesivados', icon: <Car className="h-4 w-4" />, color: 'text-emerald-300', path: '/app/adesivos' },
              { label: 'Casas', value: houseStickers.length, detail: 'placas instaladas', icon: <Home className="h-4 w-4" />, color: 'text-amber-300', path: '/app/adesivos' },
              { label: 'Presença', value: presenceLogs.length, detail: `${events.length} eventos`, icon: <UserCheck className="h-4 w-4" />, color: 'text-blue-300', path: '/app/presenca' },
            ].map((stat) => (
              <button key={stat.label} type="button" onClick={() => onNavigate(stat.path)} className="rounded-2xl border border-white/10 bg-[#11152b] p-4 text-left transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-[#151a35]">
                <div className={`flex items-center justify-between text-[10px] font-bold uppercase tracking-widest ${stat.color}`}><span>{stat.label}</span>{stat.icon}</div>
                <div className="mt-3 text-3xl font-semibold tracking-tight text-white">{stat.value}</div>
                <div className="mt-1 text-xs text-slate-500">{stat.detail}</div>
              </button>
            ))}
          </div>

          <div className="flex w-full gap-1 rounded-xl border border-white/10 bg-[#11152b] p-1 sm:w-fit">
            <button type="button" onClick={() => setActiveView('overview')} className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${activeView === 'overview' ? 'bg-gradient-to-r from-violet-500 to-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Mapa da operação</button>
            <button type="button" onClick={() => setActiveView('report')} className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${activeView === 'report' ? 'bg-gradient-to-r from-violet-500 to-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Relatório</button>
          </div>

          {activeView === 'overview' ? <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
            {/* 4 Eixos Progress Panel */}
            <div className="space-y-4 rounded-2xl border border-white/10 bg-[#11152b] p-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-violet-500/15 p-1.5 text-violet-300">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Mapa da operação</h3>
                    <p className="text-xs text-slate-500">Intensidade por território a partir dos registros reais</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('/app/metas')}
                  className="text-xs font-semibold text-violet-300 hover:text-violet-200"
                >
                  Ver Todas ({goals.length})
                </Button>
              </div>

              {territoryMap.size === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                  Nenhum registro territorial disponível.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  {Array.from(territoryMap.entries()).slice(0, 6).map(([territory, data], index) => {
                    const intensity = Math.min(100, Math.round(((data.contactsCount + data.leadersCount * 2) / Math.max(1, contacts.length + leaders.length * 2)) * 100));
                    return <div key={territory} className="rounded-xl border border-white/10 bg-[#0c1022] p-3"><div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-semibold text-slate-200">{territory}</span><span className="text-[10px] text-slate-500">{index + 1}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${intensity > 60 ? 'bg-rose-400' : intensity > 30 ? 'bg-amber-300' : 'bg-emerald-300'}`} style={{ width: `${Math.max(8, intensity)}%` }} /></div><div className="mt-2 flex justify-between text-[10px] text-slate-500"><span>{data.contactsCount} apoiadores</span><span>{data.leadersCount} lideranças</span></div></div>;
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4 rounded-2xl border border-white/10 bg-[#11152b] p-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-amber-400/15 p-1.5 text-amber-300">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Alertas</h3>
                    <p className="text-xs text-slate-500">Itens que pedem atenção</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('/app/eventos')}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  {criticalGoals.length} críticos
                </Button>
              </div>

              {alertGoals.length === 0 && events.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                  Nenhum alerta pendente.
                </div>
              ) : (
                <div className="space-y-2">
                  {alertGoals.slice(0, 5).map((goal) => <div key={goal.id} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-xs ${Number(goal.current_value) / Number(goal.target_value) < 0.5 ? 'border-rose-400/30 bg-rose-400/10' : 'border-amber-300/20 bg-amber-300/10'}`}><div className="flex min-w-0 items-center gap-2"><AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-300" /><span className="truncate text-slate-200">{goal.title}</span></div><span className="shrink-0 font-mono text-slate-400">{goal.current_value}/{goal.target_value}</span></div>)}
                  {events.slice(0, 2).map((evt) => <div key={evt.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0c1022] px-3 py-2.5 text-xs text-slate-300"><Clock className="h-3.5 w-3.5 shrink-0 text-blue-300" /><span className="truncate">{evt.title}</span></div>)}
                </div>
              )}
            </div>
          </div> : <div className="space-y-4 rounded-2xl border border-white/10 bg-[#11152b] p-5"><div className="flex items-center justify-between border-b border-white/10 pb-4"><div><h3 className="text-sm font-bold text-white">Relatório consolidado</h3><p className="text-xs text-slate-500">Resumo operacional da organização</p></div><Package className="h-5 w-5 text-violet-300" /></div><div className="grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-[#0c1022] p-4"><span className="text-xs text-slate-500">Metas atingidas</span><strong className="mt-2 block text-2xl text-white">{goalCompletion}%</strong></div><div className="rounded-xl bg-[#0c1022] p-4"><span className="text-xs text-slate-500">Novos apoiadores (7d)</span><strong className="mt-2 block text-2xl text-white">+{recentContactsCount}</strong></div><div className="rounded-xl bg-[#0c1022] p-4"><span className="text-xs text-slate-500">Eventos registrados</span><strong className="mt-2 block text-2xl text-white">{events.length}</strong></div></div><div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-xs"><thead className="border-b border-white/10 text-[10px] uppercase tracking-widest text-slate-500"><tr><th className="py-3">Meta</th><th className="py-3">Atual</th><th className="py-3">Objetivo</th><th className="py-3">Status</th></tr></thead><tbody>{goals.map((goal) => { const percent = Math.min(100, Math.round((Number(goal.current_value) / Math.max(1, Number(goal.target_value))) * 100)); return <tr key={goal.id} className="border-b border-white/5 text-slate-300"><td className="py-3 font-medium text-white">{goal.title}</td><td className="py-3">{goal.current_value} {goal.unit}</td><td className="py-3">{goal.target_value} {goal.unit}</td><td className="py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${percent >= 100 ? 'bg-emerald-400/15 text-emerald-300' : percent >= 50 ? 'bg-amber-300/15 text-amber-200' : 'bg-rose-400/15 text-rose-300'}`}>{percent >= 100 ? 'Normal' : percent >= 50 ? 'Atenção' : 'Crítico'}</span></td></tr>; })}</tbody></table></div></div>}

          {/* Quick Territorial Breakdown */}
          {territoryHighlights.length > 0 && (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-[#11152b] p-5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <MapPin className="h-4 w-4 text-violet-300" />
                  Territórios em destaque
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('/app/inteligencia')}
                  className="text-xs font-semibold text-violet-300 hover:text-violet-200"
                >
                  Inteligência Territorial &rarr;
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {territoryHighlights.map(([territory, data]) => (
                  <div key={territory} className="space-y-1.5 rounded-xl border border-white/10 bg-[#0c1022] p-3.5">
                    <div className="text-xs font-bold text-white">{territory}</div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Apoiadores: <strong className="font-mono text-slate-200">{data.contactsCount}</strong></span>
                      <span>Lideranças: <strong className="font-mono text-slate-200">{data.leadersCount}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
};
