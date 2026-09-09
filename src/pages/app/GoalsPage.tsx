import React, { useState, useEffect, useCallback } from 'react';
import { Target, Plus, TrendingUp, Calendar, CheckCircle2, Clock, AlertTriangle, Edit2, Trash2, Users, Car, Home, UserCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Goal, Coordinator } from '../../types';
import { goalsService, coordinatorsService } from '../../services';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';

export const GoalsPage: React.FC = () => {
  const { organization } = useAuth();
  const { success, error: toastError } = useToast();
  const orgId = organization?.id || '';

  const [goals, setGoals] = useState<Goal[]>([]);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'apoiadores' as 'apoiadores' | 'carros' | 'casas' | 'presenca' | 'geral',
    target_value: 100,
    current_value: 0,
    unit: 'apoiadores',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    responsible_name: '',
    status: 'on_track' as Goal['status'],
  });

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const [goalsRes, coordsRes] = await Promise.all([
        goalsService.getAll(orgId),
        coordinatorsService.getAll(orgId),
      ]);
      setGoals(goalsRes.data || []);
      setCoordinators(coordsRes.data || []);
    } catch (err: any) {
      toastError('Erro ao carregar metas: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, toastError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenModal = (goal?: Goal, presetCategory?: typeof formData.category) => {
    if (goal) {
      setSelectedGoal(goal);
      setFormData({
        title: goal.title,
        description: goal.description || '',
        category: (goal.category as any) || 'geral',
        target_value: goal.target_value,
        current_value: goal.current_value,
        unit: goal.unit,
        start_date: goal.start_date || '',
        end_date: goal.end_date || '',
        responsible_name: goal.responsible_name || '',
        status: goal.status,
      });
    } else {
      setSelectedGoal(null);
      const cat = presetCategory || 'apoiadores';
      let defaultTitle = 'Meta de Apoiadores Cadastrados';
      let defaultUnit = 'apoiadores';
      let defaultTarget = 100;

      if (cat === 'carros') {
        defaultTitle = 'Meta de Carros Adesivados';
        defaultUnit = 'carros';
        defaultTarget = 50;
      } else if (cat === 'casas') {
        defaultTitle = 'Meta de Casas / Placas Residenciais';
        defaultUnit = 'casas';
        defaultTarget = 30;
      } else if (cat === 'presenca') {
        defaultTitle = 'Meta de Presença em Eventos & Atos';
        defaultUnit = 'check-ins';
        defaultTarget = 20;
      }

      setFormData({
        title: defaultTitle,
        description: '',
        category: cat,
        target_value: defaultTarget,
        current_value: 0,
        unit: defaultUnit,
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        responsible_name: coordinators[0]?.name || 'Equipe Geral',
        status: 'on_track',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toastError('Informe o título da meta.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedGoal) {
        const { error } = await goalsService.update(selectedGoal.id, {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          category: formData.category,
          target_value: Number(formData.target_value) || 100,
          current_value: Number(formData.current_value) || 0,
          unit: formData.unit || 'unidades',
          start_date: formData.start_date || undefined,
          end_date: formData.end_date || undefined,
          responsible_name: formData.responsible_name.trim() || 'Coordenação Geral',
          status: formData.status,
        });

        if (error) {
          toastError('Erro ao atualizar meta: ' + error.message);
        } else {
          success('Meta atualizada no Supabase!');
          await loadData();
          setIsModalOpen(false);
        }
      } else {
        const { error } = await goalsService.create({
          organization_id: orgId,
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          category: formData.category,
          target_value: Number(formData.target_value) || 100,
          current_value: Number(formData.current_value) || 0,
          unit: formData.unit || 'unidades',
          start_date: formData.start_date || new Date().toISOString(),
          end_date: formData.end_date || undefined,
          responsible_name: formData.responsible_name.trim() || 'Coordenação Geral',
          status: formData.status,
        });

        if (error) {
          toastError('Erro ao cadastrar meta: ' + error.message);
        } else {
          success('Nova meta cadastrada com sucesso!');
          await loadData();
          setIsModalOpen(false);
        }
      }
    } catch (err: any) {
      toastError('Erro inesperado: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickIncrement = async (goal: Goal, amount: number) => {
    const nextVal = Math.max(0, goal.current_value + amount);
    const nextStatus = nextVal >= goal.target_value ? 'completed' : goal.status;
    const { error } = await goalsService.update(goal.id, {
      current_value: nextVal,
      status: nextStatus,
    });

    if (error) {
      toastError('Erro ao atualizar progresso: ' + error.message);
    } else {
      await loadData();
      success(`Progresso atualizado: +${amount} ${goal.unit}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir esta meta?')) {
      const { error } = await goalsService.delete(id);
      if (error) {
        toastError('Erro ao remover meta: ' + error.message);
      } else {
        await loadData();
        success('Meta removida.');
      }
    }
  };

  const getStatusBadge = (status: Goal['status']) => {
    switch (status) {
      case 'completed': return <Badge variant="success" size="sm">Concluída</Badge>;
      case 'on_track': return <Badge variant="primary" size="sm">No Prazo</Badge>;
      case 'at_risk': return <Badge variant="warning" size="sm">Em Risco</Badge>;
      case 'behind': return <Badge variant="danger" size="sm">Atrasada</Badge>;
      default: return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-slate-700" />
            Metas & Desempenho Operacional
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhamento numérico de entrega dos 4 eixos: Apoiadores, Carros, Casas e Presença
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenModal()}
            leftIcon={<Plus className="w-4 h-4" />}
            className="text-xs"
          >
            Nova Meta
          </Button>
        </div>
      </div>

      {/* 4 Eixos Quick Creation / Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => handleOpenModal(undefined, 'apoiadores')}
          className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all text-left group cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">1. Apoiadores</span>
            <Users className="w-4 h-4 text-slate-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xs text-slate-500 mt-1">Mapear e cadastrar base</div>
        </button>

        <button
          type="button"
          onClick={() => handleOpenModal(undefined, 'carros')}
          className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 hover:border-emerald-300 hover:shadow-xs transition-all text-left group cursor-pointer"
        >
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">2. Carros</span>
            <Car className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xs text-emerald-700 mt-1">Adesivaço de veículos</div>
        </button>

        <button
          type="button"
          onClick={() => handleOpenModal(undefined, 'casas')}
          className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 hover:border-amber-300 hover:shadow-xs transition-all text-left group cursor-pointer"
        >
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">3. Casas</span>
            <Home className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xs text-amber-700 mt-1">Placas residenciais</div>
        </button>

        <button
          type="button"
          onClick={() => handleOpenModal(undefined, 'presenca')}
          className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-200 hover:border-indigo-300 hover:shadow-xs transition-all text-left group cursor-pointer"
        >
          <div className="flex items-center justify-between text-indigo-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">4. Presença</span>
            <UserCheck className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xs text-indigo-700 mt-1">Check-ins em plenárias</div>
        </button>
      </div>

      {/* Goals Grid */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-slate-600" />
          <span className="text-xs font-medium">Carregando metas do Supabase...</span>
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={<Target className="w-6 h-6" />}
          title="Nenhuma meta cadastrada"
          description="Defina metas para coordenadores e lideranças acompanharem o avanço da campanha."
          actionLabel="Criar Primeira Meta"
          onAction={() => handleOpenModal()}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const percent = Math.min(100, Math.round((goal.current_value / (goal.target_value || 1)) * 100));
            return (
              <div
                key={goal.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4 hover:border-slate-300 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">{goal.title}</h3>
                      {getStatusBadge(goal.status)}
                    </div>
                    {goal.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">{goal.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenModal(goal)}
                      className="p-1.5 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress bar and values */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Progresso Realizado</span>
                    <span className="font-mono font-bold text-slate-900">
                      {goal.current_value} / {goal.target_value} <span className="text-slate-400 font-normal">{goal.unit}</span>
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        percent >= 100 ? 'bg-emerald-500' : percent >= 60 ? 'bg-indigo-600' : 'bg-amber-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Responsável: <strong className="text-slate-700">{goal.responsible_name || 'Geral'}</strong></span>
                    <span className="font-bold text-slate-900">{percent}%</span>
                  </div>
                </div>

                {/* Quick increment buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">Incremento rápido:</span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickIncrement(goal, 1)}
                      className="text-[11px] py-1 px-2.5 h-7"
                    >
                      +1
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickIncrement(goal, 5)}
                      className="text-[11px] py-1 px-2.5 h-7"
                    >
                      +5
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickIncrement(goal, 10)}
                      className="text-[11px] py-1 px-2.5 h-7"
                    >
                      +10
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedGoal ? 'Editar Meta' : 'Nova Meta Operacional'}
        description="Defina os parâmetros no banco de dados Supabase."
      >
        <form onSubmit={handleSave} className="space-y-3.5 text-left">
          <Input
            label="Título da Meta"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex.: Meta 50 Carros Adesivados"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Eixo Estratégico"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              options={[
                { value: 'apoiadores', label: '1. Apoiadores' },
                { value: 'carros', label: '2. Carros Adesivados' },
                { value: 'casas', label: '3. Casas Adesivadas' },
                { value: 'presenca', label: '4. Presença em Eventos' },
                { value: 'geral', label: 'Meta Geral' },
              ]}
            />
            <Input
              label="Unidade de Medida"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              placeholder="Ex.: contatos, carros, casas, pessoas"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Valor Alvo (Meta)"
              type="number"
              value={formData.target_value}
              onChange={(e) => setFormData({ ...formData, target_value: Number(e.target.value) })}
              required
            />
            <Input
              label="Valor Realizado Atual"
              type="number"
              value={formData.current_value}
              onChange={(e) => setFormData({ ...formData, current_value: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Coordenador / Responsável"
              value={formData.responsible_name}
              onChange={(e) => setFormData({ ...formData, responsible_name: e.target.value })}
              options={[
                { value: 'Equipe Geral', label: 'Toda a Equipe' },
                ...coordinators.map(c => ({ value: c.name, label: `${c.name} (${c.territory})` }))
              ]}
            />

            <Select
              label="Status do Prazo"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              options={[
                { value: 'on_track', label: 'No Prazo' },
                { value: 'at_risk', label: 'Em Risco' },
                { value: 'behind', label: 'Atrasada' },
                { value: 'completed', label: 'Concluída' },
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">Descrição / Diretrizes</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Instruções para a equipe de campo alcançar a meta..."
              rows={3}
              className="w-full bg-white text-slate-900 text-xs rounded-lg border border-slate-200 p-3 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Salvar Meta
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
