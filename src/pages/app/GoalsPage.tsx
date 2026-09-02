import React, { useState } from 'react';
import { Target, Plus, TrendingUp, Calendar, CheckCircle2, Clock, AlertTriangle, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { localStore } from '../../lib/supabase';
import { Goal } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';

export const GoalsPage: React.FC = () => {
  const { organization } = useAuth();
  const { success, error: toastError } = useToast();
  const orgId = organization?.id || 'org-alpha';

  const [goals, setGoals] = useState<Goal[]>(() => localStore.getGoals(orgId));
  const coordinators = localStore.getCoordinators(orgId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_value: 1000,
    current_value: 0,
    unit: 'contatos',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    responsible_name: '',
    status: 'on_track' as Goal['status'],
  });

  const reloadData = () => {
    setGoals(localStore.getGoals(orgId));
  };

  const handleOpenModal = (goal?: Goal) => {
    if (goal) {
      setSelectedGoal(goal);
      setFormData({
        title: goal.title,
        description: goal.description || '',
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
      setFormData({
        title: '',
        description: '',
        target_value: 1000,
        current_value: 0,
        unit: 'contatos',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        responsible_name: coordinators[0]?.name || 'Equipe Geral',
        status: 'on_track',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toastError('Informe o título da meta.');
      return;
    }

    const newGoal: Goal = {
      id: selectedGoal ? selectedGoal.id : 'goal_' + Math.random().toString(36).substring(2, 9),
      organization_id: orgId,
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      category: 'geral',
      target_value: Number(formData.target_value) || 100,
      current_value: Number(formData.current_value) || 0,
      unit: formData.unit || 'unidades',
      start_date: formData.start_date || new Date().toISOString(),
      end_date: formData.end_date || new Date().toISOString(),
      responsible_name: formData.responsible_name.trim() || 'Coordenação Geral',
      status: formData.status,
      created_at: selectedGoal ? selectedGoal.created_at : new Date().toISOString(),
    };

    localStore.saveGoal(newGoal);
    reloadData();
    setIsModalOpen(false);
    success(selectedGoal ? 'Meta atualizada!' : 'Nova meta cadastrada com sucesso!');
  };

  const handleQuickIncrement = (goal: Goal, amount: number) => {
    const updated: Goal = {
      ...goal,
      current_value: Math.max(0, goal.current_value + amount),
      status: goal.current_value + amount >= goal.target_value ? 'completed' : goal.status,
    };
    localStore.saveGoal(updated);
    reloadData();
    success(`Progresso atualizado: +${amount} ${goal.unit}`);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Excluir esta meta?')) {
      localStore.deleteGoal(id);
      reloadData();
      success('Meta removida.');
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/60">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-zinc-400" />
            Metas & Desempenho Operacional
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Acompanhamento numérico de entrega, metas territoriais e percentuais de conclusão
          </p>
        </div>

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

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <EmptyState
          icon={<Target className="w-6 h-6" />}
          title="Nenhuma meta cadastrada"
          description="Estabeleça objetivos de contatos, adesivagens ou reuniões para engajar a equipe."
          actionLabel="Cadastrar Meta"
          onAction={() => handleOpenModal()}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const percent = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
            const remaining = Math.max(0, goal.target_value - goal.current_value);

            return (
              <div
                key={goal.id}
                className="p-5 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-100">{goal.title}</h3>
                      {goal.responsible_name && (
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          Responsável: <span className="text-zinc-300 font-medium">{goal.responsible_name}</span>
                        </div>
                      )}
                    </div>
                    <Badge
                      variant={
                        goal.status === 'completed' ? 'success' :
                        goal.status === 'on_track' ? 'info' :
                        goal.status === 'delayed' ? 'danger' : 'neutral'
                      }
                      size="sm"
                    >
                      {goal.status === 'completed' ? 'Concluída' :
                       goal.status === 'on_track' ? 'No Prazo' :
                       goal.status === 'delayed' ? 'Atrasada' : 'Pendente'}
                    </Badge>
                  </div>

                  {goal.description && (
                    <p className="text-xs text-zinc-400 mt-2 line-clamp-2">{goal.description}</p>
                  )}

                  {/* Numbers */}
                  <div className="mt-4 flex items-baseline justify-between font-mono">
                    <div>
                      <span className="text-2xl font-bold text-zinc-100">{goal.current_value.toLocaleString('pt-BR')}</span>
                      <span className="text-xs text-zinc-500 ml-1">/ {goal.target_value.toLocaleString('pt-BR')} {goal.unit}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-400">{percent}%</span>
                      <div className="text-[10px] text-zinc-500 font-sans">
                        {remaining === 0 ? 'Meta batida!' : `Faltam ${remaining.toLocaleString('pt-BR')}`}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        percent >= 100 ? 'bg-emerald-400' : percent >= 60 ? 'bg-zinc-100' : 'bg-amber-400'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Footer Controls: Quick update + edit/delete */}
                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-zinc-500 mr-1">Lançar:</span>
                    <button
                      onClick={() => handleQuickIncrement(goal, 10)}
                      className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-mono transition-colors"
                    >
                      +10
                    </button>
                    <button
                      onClick={() => handleQuickIncrement(goal, 50)}
                      className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-mono transition-colors"
                    >
                      +50
                    </button>
                    <button
                      onClick={() => handleQuickIncrement(goal, 100)}
                      className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-mono transition-colors"
                    >
                      +100
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenModal(goal)}
                      title="Editar"
                      className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      title="Excluir"
                      className="p-1.5 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedGoal ? 'Editar Meta' : 'Nova Meta Operacional'}
        description="Defina parâmetros de volume, prazo e responsável."
      >
        <form onSubmit={handleSave} className="space-y-3.5 text-left">
          <Input
            label="Título da Meta"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex.: Cadastrar 5.000 contatos na Zona Noroeste"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Valor Alvo (Target)"
              type="number"
              value={formData.target_value}
              onChange={(e) => setFormData({ ...formData, target_value: Number(e.target.value) })}
              required
            />
            <Input
              label="Realizado Atual"
              type="number"
              value={formData.current_value}
              onChange={(e) => setFormData({ ...formData, current_value: Number(e.target.value) })}
            />
            <Input
              label="Unidade"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              placeholder="contatos, adesivos..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Responsável"
              value={formData.responsible_name}
              onChange={(e) => setFormData({ ...formData, responsible_name: e.target.value })}
              placeholder="Ex.: Coordenação Geral"
            />
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              options={[
                { value: 'on_track', label: 'No Prazo / Em Andamento' },
                { value: 'completed', label: 'Concluída / Batida' },
                { value: 'delayed', label: 'Atrasada' },
                { value: 'pending', label: 'Pendente' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Data de Início"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            />
            <Input
              label="Data Prevista de Término"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Salvar Meta
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
