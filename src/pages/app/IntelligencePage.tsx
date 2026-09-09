import React, { useState, useEffect, useCallback } from 'react';
import { Lightbulb, MapPin, Plus, TrendingUp, AlertCircle, CheckCircle2, Filter, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { DemandItem, Contact, Leader } from '../../types';
import { intelligenceService, crmService, leadersService } from '../../services';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';

export const IntelligencePage: React.FC = () => {
  const { organization } = useAuth();
  const { success, error: toastError } = useToast();
  const orgId = organization?.id || '';

  const [demands, setDemands] = useState<DemandItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedTerritory, setSelectedTerritory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Infraestrutura',
    territory: 'Gonzaga',
    neighborhood: '',
    priority: 'high' as DemandItem['priority'],
    description: '',
  });

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const [demandsRes, contactsRes, leadersRes] = await Promise.all([
        intelligenceService.getDemands(orgId),
        crmService.getAll(orgId),
        leadersService.getAll(orgId),
      ]);
      setDemands(demandsRes.data || []);
      setContacts(contactsRes.data || []);
      setLeaders(leadersRes.data || []);
    } catch (err: any) {
      toastError('Erro ao carregar inteligência: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, toastError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toastError('Informe o título da demanda.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await intelligenceService.createDemand({
        organization_id: orgId,
        title: formData.title.trim(),
        category: formData.category,
        territory: formData.territory,
        neighborhood: formData.neighborhood.trim() || undefined,
        priority: formData.priority,
        status: 'analyzing',
        description: formData.description.trim() || undefined,
      });

      if (error) {
        toastError('Erro ao registrar demanda: ' + error.message);
      } else {
        await loadData();
        setIsModalOpen(false);
        success('Demanda territorial cadastrada no Supabase!');
      }
    } catch (err: any) {
      toastError('Erro inesperado: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir esta demanda?')) {
      const { error } = await intelligenceService.deleteDemand(id);
      if (error) {
        toastError('Erro ao remover: ' + error.message);
      } else {
        await loadData();
        success('Demanda removida.');
      }
    }
  };

  // Dynamically group contacts and leaders by territory/neighborhood
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

  const territoriesList = Array.from(territoryMap.entries()).map(([name, data]) => {
    let status = 'Ativo';
    if (data.contactsCount > 100 || data.leadersCount >= 5) status = 'Forte';
    else if (data.contactsCount > 20 || data.leadersCount >= 2) status = 'Em expansão';
    else status = 'Iniciando';

    return {
      name,
      contactsCount: data.contactsCount,
      leadersCount: data.leadersCount,
      status,
    };
  });

  const filteredDemands = demands.filter(d => 
    selectedTerritory === 'all' || d.territory === selectedTerritory
  );

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-slate-700" />
            Inteligência Territorial & Demandas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mapeamento de vulnerabilidades, demandas populares por bairro e densidade de apoiadores
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setFormData({
              title: '',
              category: 'Infraestrutura',
              territory: territoriesList[0]?.name || 'Geral',
              neighborhood: '',
              priority: 'high',
              description: '',
            });
            setIsModalOpen(true);
          }}
          leftIcon={<Plus className="w-4 h-4" />}
          className="text-xs"
        >
          Nova Demanda Territorial
        </Button>
      </div>

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-slate-600" />
          <span className="text-xs font-medium">Carregando inteligência do Supabase...</span>
        </div>
      ) : (
        <>
          {/* Territories Overview */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-500" />
              Densidade Territorial da Base Eleitoral
            </h3>
            {territoriesList.length === 0 ? (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-500">
                Nenhum território mapeado ainda. Cadastre lideranças e apoiadores no CRM com bairros definidos.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {territoriesList.map((t) => (
                  <div key={t.name} className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{t.name}</span>
                      <Badge variant={t.status === 'Forte' ? 'success' : t.status === 'Em expansão' ? 'primary' : 'neutral'} size="sm">
                        {t.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Apoiadores</span>
                        <strong className="text-slate-800 font-mono text-sm">{t.contactsCount}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Lideranças</span>
                        <strong className="text-slate-800 font-mono text-sm">{t.leadersCount}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Demands Table */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-slate-500" />
                Demandas & Reivindicações Locais ({filteredDemands.length})
              </h3>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Filtrar por Região:</span>
                <select
                  value={selectedTerritory}
                  onChange={(e) => setSelectedTerritory(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg py-1 px-3 text-slate-800 text-xs focus:outline-none"
                >
                  <option value="all">Todas as Regiões</option>
                  {territoriesList.map(t => (
                    <option key={t.name} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredDemands.length === 0 ? (
              <EmptyState
                icon={<Lightbulb className="w-6 h-6" />}
                title="Nenhuma demanda registrada"
                description="Cadastre problemas de asfalto, postos de saúde, segurança ou iluminação identificados nas visitas."
                actionLabel="Registrar Demanda"
                onAction={() => setIsModalOpen(true)}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Demanda & Categoria</TableHead>
                    <TableHead>Território / Bairro</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDemands.map((demand) => (
                    <TableRow key={demand.id}>
                      <TableCell>
                        <div className="font-semibold text-slate-900">{demand.title}</div>
                        {demand.description && (
                          <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">{demand.description}</div>
                        )}
                        <span className="inline-block mt-1 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                          {demand.category}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-slate-800 font-medium">{demand.territory}</div>
                        {demand.neighborhood && <div className="text-[11px] text-slate-500">{demand.neighborhood}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={demand.priority === 'high' ? 'danger' : demand.priority === 'medium' ? 'warning' : 'neutral'} size="sm">
                          {demand.priority === 'high' ? 'Alta' : demand.priority === 'medium' ? 'Média' : 'Baixa'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={demand.status === 'resolved' ? 'success' : 'primary'} size="sm">
                          {demand.status === 'resolved' ? 'Atendida' : demand.status === 'in_progress' ? 'Em Ação' : 'Em Análise'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => handleDelete(demand.id)}
                          className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nova Demanda Popular Territorial"
        description="Salve no Supabase os pontos e propostas colhidos no campo."
      >
        <form onSubmit={handleSave} className="space-y-3.5 text-left">
          <Input
            label="Título da Demanda"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex.: Falta de médicos na UBS Central"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Categoria"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={[
                { value: 'Saúde', label: 'Saúde' },
                { value: 'Educação', label: 'Educação' },
                { value: 'Segurança', label: 'Segurança' },
                { value: 'Infraestrutura', label: 'Infraestrutura & Asfalto' },
                { value: 'Transporte', label: 'Transporte & Trânsito' },
                { value: 'Social', label: 'Ação Social' },
                { value: 'Outros', label: 'Outros' },
              ]}
            />

            <Select
              label="Prioridade Política"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              options={[
                { value: 'high', label: 'Alta Prioridade' },
                { value: 'medium', label: 'Média Prioridade' },
                { value: 'low', label: 'Baixa Prioridade' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Território / Região"
              value={formData.territory}
              onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
              placeholder="Ex.: Zona Sul"
              required
            />
            <Input
              label="Bairro Específico"
              value={formData.neighborhood}
              onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
              placeholder="Ex.: Gonzaga"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">Detalhamento da Reivindicação</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva o que a comunidade solicitou durante a reunião ou caminhada..."
              rows={3}
              className="w-full bg-white text-slate-900 text-xs rounded-lg border border-slate-200 p-3 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Salvar Demanda
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
