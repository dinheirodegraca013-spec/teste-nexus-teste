import React, { useState, useEffect, useCallback } from 'react';
import { Package, Plus, ArrowUpRight, AlertTriangle, CheckCircle2, Trash2, Loader2, Send } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { MaterialItem, MaterialDistribution, Coordinator } from '../../types';
import { materialsService, coordinatorsService } from '../../services';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';

export const MaterialsPage: React.FC = () => {
  const { organization } = useAuth();
  const { success, error: toastError } = useToast();
  const orgId = organization?.id || '';

  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [distributions, setDistributions] = useState<MaterialDistribution[]>([]);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<'inventory' | 'distributions'>('inventory');

  // New item modal
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'Gráfica',
    total_quantity: 10000,
    unit: 'unid',
    min_stock_alert: 500,
  });

  // Distribute modal
  const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);
  const [distForm, setDistForm] = useState({
    material_id: '',
    recipient_name: '',
    territory: 'Geral',
    quantity: 500,
  });

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const [matsRes, distRes, coordsRes] = await Promise.all([
        materialsService.getItems(orgId),
        materialsService.getDistributions(orgId),
        coordinatorsService.getAll(orgId),
      ]);
      setMaterials(matsRes.data || []);
      setDistributions(distRes.data || []);
      setCoordinators(coordsRes.data || []);
      if (matsRes.data && matsRes.data.length > 0) {
        setDistForm(prev => ({
          ...prev,
          material_id: prev.material_id || matsRes.data[0].id,
          recipient_name: prev.recipient_name || coordsRes.data?.[0]?.name || 'Equipe de Rua',
          territory: prev.territory || coordsRes.data?.[0]?.territory || 'Geral',
        }));
      }
    } catch (err: any) {
      toastError('Erro ao carregar materiais: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, toastError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await materialsService.createItem({
        organization_id: orgId,
        name: itemForm.name.trim(),
        category: itemForm.category,
        total_quantity: Number(itemForm.total_quantity) || 0,
        distributed_quantity: 0,
        unit: itemForm.unit,
        min_stock_alert: Number(itemForm.min_stock_alert) || 0,
      });

      if (error) {
        toastError('Erro ao cadastrar material: ' + error.message);
      } else {
        await loadData();
        setIsNewItemModalOpen(false);
        success('Material cadastrado no estoque!');
      }
    } catch (err: any) {
      toastError('Erro inesperado: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDistribution = async (e: React.FormEvent) => {
    e.preventDefault();
    const mat = materials.find(m => m.id === distForm.material_id);
    if (!mat) {
      toastError('Selecione o material.');
      return;
    }

    const qty = Number(distForm.quantity) || 0;
    const available = mat.total_quantity - mat.distributed_quantity;
    if (qty > available) {
      toastError(`Quantidade indisponível em estoque (Disponível: ${available} ${mat.unit})`);
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create distribution record
      const { error: distErr } = await materialsService.createDistribution({
        organization_id: orgId,
        material_id: mat.id,
        material_name: mat.name,
        recipient_name: distForm.recipient_name,
        territory: distForm.territory,
        quantity: qty,
        status: 'delivered',
      });

      if (distErr) {
        toastError('Erro ao registrar distribuição: ' + distErr.message);
        return;
      }

      // 2. Update material distributed_quantity
      await materialsService.updateItem(mat.id, {
        distributed_quantity: mat.distributed_quantity + qty,
      });

      await loadData();
      setIsDistributeModalOpen(false);
      success(`${qty} ${mat.unit} de ${mat.name} entregues a ${distForm.recipient_name}!`);
    } catch (err: any) {
      toastError('Erro inesperado: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (window.confirm('Excluir este material do estoque?')) {
      const { error } = await materialsService.deleteItem(id);
      if (error) {
        toastError('Erro ao excluir material: ' + error.message);
      } else {
        await loadData();
        success('Material removido.');
      }
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-slate-700" />
            Controle de Materiais de Campanha
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Estoque central de santinhos, praguinhas, bandeiras e registro de entregas
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (materials.length === 0) {
                toastError('Cadastre primeiro um material no estoque.');
                return;
              }
              setIsDistributeModalOpen(true);
            }}
            leftIcon={<Send className="w-4 h-4 text-indigo-600" />}
            className="text-xs"
          >
            Registrar Entrega / Saída
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setItemForm({
                name: '',
                category: 'Gráfica',
                total_quantity: 5000,
                unit: 'unid',
                min_stock_alert: 500,
              });
              setIsNewItemModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
            className="text-xs"
          >
            Novo Material
          </Button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200 w-full sm:w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`py-1.5 px-4 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'inventory'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4 text-slate-600" />
          <span>Estoque Central ({materials.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('distributions')}
          className={`py-1.5 px-4 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'distributions'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-indigo-600" />
          <span>Histórico de Saídas ({distributions.length})</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-slate-600" />
          <span className="text-xs font-medium">Carregando estoque do Supabase...</span>
        </div>
      ) : activeTab === 'inventory' ? (
        materials.length === 0 ? (
          <EmptyState
            icon={<Package className="w-6 h-6" />}
            title="Nenhum material no estoque"
            description="Cadastre santinhos, praguinhas, adesivos ou bandeiras para controlar a distribuição."
            actionLabel="Cadastrar Material"
            onAction={() => setIsNewItemModalOpen(true)}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material & Categoria</TableHead>
                <TableHead>Total Produzido</TableHead>
                <TableHead>Distribuído</TableHead>
                <TableHead>Saldo em Estoque</TableHead>
                <TableHead>Nível de Alerta</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((mat) => {
                const available = mat.total_quantity - mat.distributed_quantity;
                const isLow = available <= (mat.min_stock_alert || 0);
                const percent = Math.min(100, Math.round((mat.distributed_quantity / (mat.total_quantity || 1)) * 100));

                return (
                  <TableRow key={mat.id}>
                    <TableCell>
                      <div className="font-semibold text-slate-900">{mat.name}</div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">{mat.category}</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-mono font-medium text-slate-800">
                        {mat.total_quantity.toLocaleString()} {mat.unit}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-mono text-indigo-600 font-medium">
                        {mat.distributed_quantity.toLocaleString()} {mat.unit} ({percent}%)
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`text-xs font-mono font-bold ${isLow ? 'text-amber-600' : 'text-emerald-700'}`}>
                        {available.toLocaleString()} {mat.unit}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isLow ? (
                        <Badge variant="warning" size="sm">Estoque Baixo</Badge>
                      ) : (
                        <Badge variant="success" size="sm">Normal</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => handleDeleteItem(mat.id)}
                        className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )
      ) : (
        distributions.length === 0 ? (
          <EmptyState
            icon={<ArrowUpRight className="w-6 h-6" />}
            title="Nenhuma saída registrada"
            description="Registre entregas de materiais para lideranças e coordenadores."
            actionLabel="Registrar Entrega"
            onAction={() => setIsDistributeModalOpen(true)}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Destinatário / Liderança</TableHead>
                <TableHead>Território / Bairro</TableHead>
                <TableHead>Quantidade Entregue</TableHead>
                <TableHead>Data de Entrega</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {distributions.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="font-medium text-slate-900">{d.material_name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold text-slate-800">{d.recipient_name}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-600">{d.territory}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs font-bold text-indigo-700">{d.quantity.toLocaleString()}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono text-slate-500">
                      {new Date(d.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="success" size="sm">Entregue</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      )}

      {/* New Material Modal */}
      <Modal
        isOpen={isNewItemModalOpen}
        onClose={() => setIsNewItemModalOpen(false)}
        title="Cadastrar Novo Material no Estoque"
        description="Salve no Supabase o lote produzido e a unidade de contagem."
      >
        <form onSubmit={handleSaveItem} className="space-y-3.5 text-left">
          <Input
            label="Nome do Material"
            value={itemForm.name}
            onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
            placeholder="Ex.: Santinho Dobrado 4x4"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Categoria"
              value={itemForm.category}
              onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
              options={[
                { value: 'Gráfica', label: 'Gráfica (Santinhos, Jornais)' },
                { value: 'Adesivos', label: 'Adesivos & Praguinhas' },
                { value: 'Tecido', label: 'Bandeiras & Camisetas' },
                { value: 'Brindes', label: 'Brindes & Outros' },
              ]}
            />
            <Input
              label="Unidade"
              value={itemForm.unit}
              onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
              placeholder="Ex.: unid, pacotes, caixas"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Quantidade Total em Estoque"
              type="number"
              value={itemForm.total_quantity}
              onChange={(e) => setItemForm({ ...itemForm, total_quantity: Number(e.target.value) })}
              required
            />
            <Input
              label="Alerta de Estoque Mínimo"
              type="number"
              value={itemForm.min_stock_alert}
              onChange={(e) => setItemForm({ ...itemForm, min_stock_alert: Number(e.target.value) })}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsNewItemModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Salvar Material
            </Button>
          </div>
        </form>
      </Modal>

      {/* Distribution Modal */}
      <Modal
        isOpen={isDistributeModalOpen}
        onClose={() => setIsDistributeModalOpen(false)}
        title="Registrar Entrega de Material"
        description="Baixa no estoque e registro para o coordenador/liderança."
      >
        <form onSubmit={handleSaveDistribution} className="space-y-3.5 text-left">
          <Select
            label="Material a Entregar"
            value={distForm.material_id}
            onChange={(e) => setDistForm({ ...distForm, material_id: e.target.value })}
            options={materials.map(m => ({
              value: m.id,
              label: `${m.name} (Disponível: ${m.total_quantity - m.distributed_quantity} ${m.unit})`
            }))}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nome do Destinatário / Coordenador"
              value={distForm.recipient_name}
              onChange={(e) => setDistForm({ ...distForm, recipient_name: e.target.value })}
              placeholder="Ex.: Valmir Silva"
              required
            />
            <Input
              label="Território / Região"
              value={distForm.territory}
              onChange={(e) => setDistForm({ ...distForm, territory: e.target.value })}
              placeholder="Ex.: Zona Sul"
              required
            />
          </div>

          <Input
            label="Quantidade a Entregar"
            type="number"
            value={distForm.quantity}
            onChange={(e) => setDistForm({ ...distForm, quantity: Number(e.target.value) })}
            required
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsDistributeModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Confirmar Entrega
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
