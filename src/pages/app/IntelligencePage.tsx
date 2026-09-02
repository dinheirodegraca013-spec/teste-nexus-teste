import React, { useState } from 'react';
import { Lightbulb, MapPin, Plus, TrendingUp, AlertCircle, CheckCircle2, Filter, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { localStore } from '../../lib/supabase';
import { DemandItem } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

export const IntelligencePage: React.FC = () => {
  const { organization } = useAuth();
  const { success, error: toastError } = useToast();
  const orgId = organization?.id || 'org-alpha';

  const [demands, setDemands] = useState<DemandItem[]>(() => localStore.getDemands(orgId));
  const contacts = localStore.getContacts(orgId);
  const leaders = localStore.getLeaders(orgId);

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

  const reloadData = () => {
    setDemands(localStore.getDemands(orgId));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toastError('Informe o título da demanda.');
      return;
    }

    localStore.saveDemand({
      id: 'dem_' + Math.random().toString(36).substring(2, 9),
      organization_id: orgId,
      title: formData.title.trim(),
      category: formData.category,
      territory: formData.territory,
      neighborhood: formData.neighborhood.trim() || undefined,
      priority: formData.priority,
      status: 'analyzing',
      description: formData.description.trim() || undefined,
      created_at: new Date().toISOString(),
    });

    reloadData();
    setIsModalOpen(false);
    success('Demanda territorial registrada!');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Excluir esta demanda?')) {
      localStore.deleteDemand(id);
      reloadData();
      success('Demanda removida.');
    }
  };

  const territoriesList = [
    { name: 'Gonzaga / Orla', contactsCount: 4120, leadersCount: 5, status: 'Forte' },
    { name: 'Zona Noroeste', contactsCount: 3890, leadersCount: 8, status: 'Em expansão' },
    { name: 'Morros / Nova Cintra', contactsCount: 2440, leadersCount: 4, status: 'Moderado' },
    { name: 'Centro Histórico & Porto', contactsCount: 2000, leadersCount: 3, status: 'Atenção' },
  ];

  const filteredDemands = demands.filter(d => 
    selectedTerritory === 'all' || d.territory.toLowerCase().includes(selectedTerritory.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/60">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-zinc-400" />
            Inteligência Territorial & Demandas
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Diagnóstico de presença por território, mapeamento de pautas locais e sentimento popular
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
          className="text-xs"
        >
          Registrar Demanda
        </Button>
      </div>

      {/* Territorial Density Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {territoriesList.map((t) => (
          <div key={t.name} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">{t.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                {t.status}
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-zinc-100">{t.contactsCount.toLocaleString('pt-BR')}</div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>{t.leadersCount} lideranças ativas</span>
              <span className="text-emerald-400 font-medium">Penetração alta</span>
            </div>
          </div>
        ))}
      </div>

      {/* Demands Section */}
      <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Demandas & Pautas Locais Coletadas</h3>
            <p className="text-xs text-zinc-400">Pautas trazidas pelas lideranças para plano de ação e discursos</p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
            <span className="text-zinc-500">Filtrar Região:</span>
            <select
              value={selectedTerritory}
              onChange={(e) => setSelectedTerritory(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg py-1 px-2.5 text-zinc-200 text-xs focus:outline-none"
            >
              <option value="all">Todas as Regiões</option>
              <option value="Gonzaga">Gonzaga</option>
              <option value="Zona Noroeste">Zona Noroeste</option>
              <option value="Morros">Morros</option>
              <option value="Centro">Centro</option>
            </select>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pauta / Demanda</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Território</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDemands.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <div className="font-medium text-zinc-100">{d.title}</div>
                  {d.description && <div className="text-xs text-zinc-400 mt-0.5">{d.description}</div>}
                </TableCell>
                <TableCell>
                  <span className="text-xs text-zinc-300">{d.category}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-xs text-zinc-300">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{d.territory}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={d.priority === 'urgent' ? 'danger' : d.priority === 'high' ? 'warning' : 'neutral'} size="sm">
                    {d.priority === 'urgent' ? 'Urgente' : d.priority === 'high' ? 'Alta' : 'Média'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={d.status === 'addressed' ? 'success' : 'info'} size="sm">
                    {d.status === 'addressed' ? 'Atendida' : 'Em Análise'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <button
                    onClick={() => handleDelete(d.id)}
                    title="Excluir"
                    className="p-1.5 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Pauta / Demanda Territorial"
        description="Catalogação de reivindicações populares para embasamento de estratégia."
      >
        <form onSubmit={handleSave} className="space-y-3.5 text-left">
          <Input
            label="Título da Pauta"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex.: Melhoria na iluminação e ronda no Morro Nova Cintra"
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Categoria"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={[
                { value: 'Infraestrutura', label: 'Infraestrutura & Obras' },
                { value: 'Saúde', label: 'Saúde & UBS' },
                { value: 'Segurança', label: 'Segurança & Iluminação' },
                { value: 'Educação', label: 'Educação & Creches' },
                { value: 'Transporte', label: 'Transporte & Trânsito' },
                { value: 'Meio Ambiente', label: 'Meio Ambiente & Zeladoria' },
              ]}
            />
            <Select
              label="Prioridade Política"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              options={[
                { value: 'urgent', label: 'Urgente / Crítica' },
                { value: 'high', label: 'Alta Relevância' },
                { value: 'medium', label: 'Média' },
                { value: 'low', label: 'Baixa' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Território Principal"
              value={formData.territory}
              onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
              placeholder="Ex.: Morros"
              required
            />
            <Input
              label="Bairro Específico"
              value={formData.neighborhood}
              onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
              placeholder="Ex.: Nova Cintra"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-300">Detalhes & Contexto</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva a demanda coletada e o número de pessoas impactadas..."
              rows={3}
              className="w-full bg-zinc-900 text-zinc-100 text-xs rounded-lg border border-zinc-800 p-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Salvar Demanda
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
