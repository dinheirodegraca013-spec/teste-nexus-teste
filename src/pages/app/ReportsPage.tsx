import React from 'react';
import { FileSpreadsheet, Download, Printer, Users, Target, Tag, MapPin } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { localStore } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';

export const ReportsPage: React.FC = () => {
  const { organization } = useAuth();
  const orgId = organization?.id || 'org-alpha';

  const contacts = localStore.getContacts(orgId);
  const leaders = localStore.getLeaders(orgId);
  const coordinators = localStore.getCoordinators(orgId);
  const goals = localStore.getGoals(orgId);
  const events = localStore.getEvents(orgId);
  const carStickers = localStore.getCarStickers(orgId);
  const houseStickers = localStore.getHouseStickers(orgId);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['Nome', 'Telefone', 'Territorio', 'Lider', 'Classificacao'];
    const rows = contacts.map(c => [
      `"${c.full_name}"`,
      `"${c.phone}"`,
      `"${c.territory}"`,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/60 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-zinc-400" />
            Relatórios Estratégicos & Consolidados
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
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

      {/* Printable Report Document */}
      <div className="p-8 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-8 print:bg-white print:text-black print:border-none print:p-0">
        {/* Report Header */}
        <div className="border-b border-zinc-800 pb-6 print:border-zinc-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-950 font-black text-lg flex items-center justify-center">
                N
              </div>
              <div>
                <h1 className="text-lg font-bold text-zinc-100 print:text-zinc-900">{organization?.name || 'NEXUS Operations'}</h1>
                <p className="text-xs text-zinc-400 print:text-zinc-600">Relatório Consolidado de Desempenho Operacional</p>
              </div>
            </div>
            <div className="text-right text-xs font-mono text-zinc-400 print:text-zinc-600">
              Emitido em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
            </div>
          </div>
        </div>

        {/* Section 1: Executive KPI Summary */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest print:text-zinc-700">
            1. Indicadores Chave de Desempenho
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 print:bg-zinc-50 print:border-zinc-300">
              <div className="text-xs text-zinc-400 print:text-zinc-600">Total de Contatos</div>
              <div className="text-xl font-bold font-mono text-zinc-100 print:text-zinc-900 mt-1">
                {contacts.length.toLocaleString('pt-BR')}
              </div>
              <div className="text-[11px] text-emerald-400 mt-0.5">Base cadastrada</div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 print:bg-zinc-50 print:border-zinc-300">
              <div className="text-xs text-zinc-400 print:text-zinc-600">Lideranças Mapeadas</div>
              <div className="text-xl font-bold font-mono text-zinc-100 print:text-zinc-900 mt-1">
                {leaders.length}
              </div>
              <div className="text-[11px] text-zinc-400 print:text-zinc-600 mt-0.5">{coordinators.length} coordenadores</div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 print:bg-zinc-50 print:border-zinc-300">
              <div className="text-xs text-zinc-400 print:text-zinc-600">Adesivagem Total</div>
              <div className="text-xl font-bold font-mono text-zinc-100 print:text-zinc-900 mt-1">
                {carStickers.length + houseStickers.length}
              </div>
              <div className="text-[11px] text-zinc-400 print:text-zinc-600 mt-0.5">{carStickers.length} carros • {houseStickers.length} casas</div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 print:bg-zinc-50 print:border-zinc-300">
              <div className="text-xs text-zinc-400 print:text-zinc-600">Eventos Realizados</div>
              <div className="text-xl font-bold font-mono text-zinc-100 print:text-zinc-900 mt-1">
                {events.length}
              </div>
              <div className="text-[11px] text-emerald-400 mt-0.5">Mobilização contínua</div>
            </div>
          </div>
        </div>

        {/* Section 2: Goals Status */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest print:text-zinc-700">
            2. Cumprimento de Metas Estratégicas
          </h2>
          <div className="divide-y divide-zinc-800/60 print:divide-zinc-300 border border-zinc-800/80 print:border-zinc-300 rounded-xl overflow-hidden">
            {goals.map(g => {
              const p = Math.min(100, Math.round((g.current_value / g.target_value) * 100));
              return (
                <div key={g.id} className="p-3.5 bg-zinc-950/40 print:bg-white flex items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="font-semibold text-zinc-200 print:text-zinc-900">{g.title}</div>
                    <div className="text-[11px] text-zinc-500 print:text-zinc-600 mt-0.5">{g.responsible_name || 'Coordenação'}</div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-zinc-100 print:text-zinc-900">{g.current_value.toLocaleString('pt-BR')}</span> / {g.target_value.toLocaleString('pt-BR')} ({p}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Leaders by Territory */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest print:text-zinc-700">
            3. Relação de Lideranças Territoriais
          </h2>
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 print:border-zinc-400 text-zinc-400 print:text-zinc-600">
                <th className="py-2">Líder</th>
                <th className="py-2">Bairro / Território</th>
                <th className="py-2">Coordenador</th>
                <th className="py-2 text-right">Meta Alcançada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 print:divide-zinc-200">
              {leaders.map(l => (
                <tr key={l.id} className="text-zinc-300 print:text-zinc-800">
                  <td className="py-2 font-medium">{l.name}</td>
                  <td className="py-2">{l.neighborhood || l.territory}</td>
                  <td className="py-2">{l.coordinator_name || 'Direto'}</td>
                  <td className="py-2 text-right font-mono font-bold text-zinc-100 print:text-zinc-900">
                    {l.goal_reached} / {l.goal_target} ({Math.round((l.goal_reached / l.goal_target) * 100)}%)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
