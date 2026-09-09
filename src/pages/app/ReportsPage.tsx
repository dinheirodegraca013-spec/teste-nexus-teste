import React, { useState, useEffect, useCallback } from 'react';
import { FileSpreadsheet, Download, Printer, Users, Target, Tag, MapPin, Loader2, Car, Home, UserCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Contact, Leader, Coordinator, Goal, CampaignEvent, CarSticker, HouseSticker } from '../../types';
import { crmService, leadersService, coordinatorsService, goalsService, eventsService, stickersService } from '../../services';
import { Button } from '../../components/ui/Button';

export const ReportsPage: React.FC = () => {
  const { organization } = useAuth();
  const { error: toastError } = useToast();
  const orgId = organization?.id || '';

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [events, setEvents] = useState<CampaignEvent[]>([]);
  const [carStickers, setCarStickers] = useState<CarSticker[]>([]);
  const [houseStickers, setHouseStickers] = useState<HouseSticker[]>([]);
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
      ] = await Promise.all([
        crmService.getAll(orgId),
        leadersService.getAll(orgId),
        coordinatorsService.getAll(orgId),
        goalsService.getAll(orgId),
        eventsService.getAll(orgId),
        stickersService.getCarStickers(orgId),
        stickersService.getHouseStickers(orgId),
      ]);

      setContacts(contactsRes.data || []);
      setLeaders(leadersRes.data || []);
      setCoordinators(coordsRes.data || []);
      setGoals(goalsRes.data || []);
      setEvents(eventsRes.data || []);
      setCarStickers(carsRes.data || []);
      setHouseStickers(housesRes.data || []);
    } catch (err: any) {
      toastError('Erro ao carregar dados do relatório: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, toastError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['Nome', 'Telefone', 'Territorio', 'Lider', 'Status'];
    const rows = contacts.map(c => [
      `"${c.full_name}"`,
      `"${c.phone}"`,
      `"${c.territory || ''}"`,
      `"${c.leader_name || ''}"`,
      `"${c.status}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nexus_relatorio_contatos_${orgId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-slate-700" />
            Relatórios Estratégicos & Consolidados
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Documento analítico executivo pronto para impressão ou exportação tabular
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
            className="text-xs"
          >
            Imprimir / Salvar PDF
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-4 h-4" />}
            className="text-xs"
          >
            Exportar CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
          <span className="text-sm font-medium">Consolidando dados do Supabase...</span>
        </div>
      ) : (
        /* Printable Report Document */
        <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-8 print:bg-white print:text-black print:border-none print:p-0">
          {/* Report Header */}
          <div className="border-b border-slate-200 pb-6 print:border-slate-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-black text-lg flex items-center justify-center">
                  N
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 print:text-slate-900">{organization?.name || 'NEXUS Operations'}</h1>
                  <p className="text-xs text-slate-500 print:text-slate-600">Relatório Consolidado dos 4 Eixos Operacionais</p>
                </div>
              </div>
              <div className="text-right text-xs font-mono text-slate-500 print:text-slate-600">
                Emitido em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
              </div>
            </div>
          </div>

          {/* Section 1: 4 Eixos KPI Summary */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest print:text-slate-700">
              1. Indicadores Chave dos 4 Eixos de Mobilização
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 print:border-slate-300">
                <div className="flex items-center justify-between text-slate-500 text-xs">
                  <span>1. Apoiadores</span>
                  <Users className="w-4 h-4 text-slate-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">{contacts.length}</div>
                <span className="text-[11px] text-slate-500">Cadastrados no CRM</span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 print:border-slate-300">
                <div className="flex items-center justify-between text-emerald-800 text-xs">
                  <span>2. Carros Adesivados</span>
                  <Car className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-emerald-950 mt-2 font-mono">{carStickers.length}</div>
                <span className="text-[11px] text-emerald-700">Veículos em trânsito</span>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 print:border-slate-300">
                <div className="flex items-center justify-between text-amber-800 text-xs">
                  <span>3. Casas Adesivadas</span>
                  <Home className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-bold text-amber-950 mt-2 font-mono">{houseStickers.length}</div>
                <span className="text-[11px] text-amber-700">Placas residenciais</span>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 print:border-slate-300">
                <div className="flex items-center justify-between text-indigo-800 text-xs">
                  <span>4. Lideranças & Eventos</span>
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-bold text-indigo-950 mt-2 font-mono">{leaders.length}</div>
                <span className="text-[11px] text-indigo-700">Em {events.length} atos programados</span>
              </div>
            </div>
          </div>

          {/* Section 2: Goals Status */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest print:text-slate-700">
              2. Metas Operacionais Cadastradas ({goals.length})
            </h2>
            {goals.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Nenhuma meta configurada no período.</p>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-3">Título da Meta</th>
                      <th className="p-3">Responsável</th>
                      <th className="p-3 text-right">Progresso</th>
                      <th className="p-3 text-right">Conclusão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {goals.map(g => {
                      const p = Math.min(100, Math.round((g.current_value / (g.target_value || 1)) * 100));
                      return (
                        <tr key={g.id}>
                          <td className="p-3 font-semibold text-slate-900">{g.title}</td>
                          <td className="p-3 text-slate-700">{g.responsible_name || 'Geral'}</td>
                          <td className="p-3 text-right font-mono">{g.current_value} / {g.target_value} {g.unit}</td>
                          <td className="p-3 text-right font-bold font-mono text-slate-900">{p}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 3: Coordinators & Territories */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest print:text-slate-700">
              3. Estrutura de Coordenação e Territórios
            </h2>
            <div className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-3">Coordenador</th>
                    <th className="p-3">Território</th>
                    <th className="p-3">Contato</th>
                    <th className="p-3">Meta Individual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {coordinators.map(c => (
                    <tr key={c.id}>
                      <td className="p-3 font-semibold text-slate-900">{c.name}</td>
                      <td className="p-3 text-slate-700">{c.territory}</td>
                      <td className="p-3 font-mono text-slate-600">{c.phone || '—'}</td>
                      <td className="p-3 font-mono text-slate-900">{c.target_contacts || 0} contatos</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
