import React, { useState } from 'react';
import { Package, Plus, ArrowUpRight, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { localStore } from '../../lib/supabase';
import { MaterialItem, MaterialDistribution } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

export const MaterialsPage: React.FC = () => {
  const { organization } = useAuth();
  const { success, error: toastError } = useToast();
  const orgId = organization?.id || 'org-alpha';

  const [materials, setMaterials] = useState<MaterialItem[]>(() => localStore.getMaterials(orgId));
  const [distributions, setDistributions] = useState<MaterialDistribution[]>(() => localStore.getMaterialDistributions(orgId));
  const coordinators = localStore.getCoordinators(orgId);

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
    material_id: materials[0]?.id || '',
    recipient_name: coordinators[0]?.name || '',
    territory: coordinators[0]?.territory || 'Geral',
    quantity: 500,
  });

  const reloadData = () => {
    setMaterials(localStore.getMaterials(orgId));
    setDistributions(localStore.getMaterialDistributions(orgId));
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name.trim()) return;

    localStore.saveMaterial({
      id: 'mat_' + Math.random().toString(36).substring(2, 9),
      organization_id: orgId,
      name: itemForm.name.trim(),
      category: itemForm.category,
      total_quantity: Number(itemForm.total_quantity) || 0,
      distributed_quantity: 0,
      unit: itemForm.unit,
      min_stock_alert: Number(itemForm.min_stock_alert) || 0,
      created_at: new Date().toISOString(),
    });

    reloadData();
    setIsNewItemModalOpen(false);
    success('Material cadastrado no estoque!');
  };

  const handleSaveDistribution = (e: React.FormEvent) => {
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

    // Update material distributed count
    localStore.saveMaterial({
      ...mat,
      distributed_quantity: mat.distributed_quantity + qty,
    });

    // Save distribution log
    localStore.saveMaterialDistribution({
      id: 'dist_' + Math.random().toString(36).substring(2, 9),
      organization_id: orgId,
      material_id: mat.id,
      material_name: mat.name,
      recipient_name: distForm.recipient_name,
      territory: distForm.territory,
      quantity: qty,
      status: 'delivered',
      created_at: new Date().toISOString(),
    });

    reloadData();
    setIsDistributeModalOpen(false);
    success('Distribuição registrada com sucesso!');
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/60">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-zinc-400" />
            Estoque & Distribuição de Materiais
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Controle de santinhos, panfletos, praguinhas, bandeiras e entregas para coordenadores
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsNewItemModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="text-xs"
          >
            Novo Item
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsDistributeModalOpen(true)}
            leftIcon={<ArrowUpRight className="w-4 h-4" />}
            className="text-xs"
          >
            Registrar Entrega
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-2 text-xs font-medium">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            activeTab === 'inventory' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Estoque Geral ({materials.length})
        </button>
        <button
          onClick={() => setActiveTab('distributions')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            activeTab === 'distributions' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Histórico de Entregas ({distributions.length})
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item / Material</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Total Produzido</TableHead>
              <TableHead>Distribuído</TableHead>
              <TableHead>Disponível em Estoque</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map((mat) => {
              const available = mat.total_quantity - mat.distributed_quantity;
              const isLow = mat.min_stock_alert ? available <= mat.min_stock_alert : false;

              return (
                <TableRow key={mat.id}>
                  <TableCell>
                    <div className="font-medium text-zinc-100">{mat.name}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-zinc-400">{mat.category || 'Geral'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-zinc-200">{mat.total_quantity.toLocaleString('pt-BR')} {mat.unit}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-zinc-300">{mat.distributed_quantity.toLocaleString('pt-BR')} {mat.unit}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-xs font-bold ${isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {available.toLocaleString('pt-BR')} {mat.unit}
                      </span>
                      {isLow && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Estoque baixo
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDistForm({
                          material_id: mat.id,
                          recipient_name: coordinators[0]?.name || '',
                          territory: coordinators[0]?.territory || 'Geral',
                          quantity: 500,
                        });
                        setIsDistributeModalOpen(true);
                      }}
                      className="text-xs py-1"
                    >
                      Entregar
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead>Destinatário / Coordenador</TableHead>
              <TableHead>Território</TableHead>
              <TableHead>Quantidade Entregue</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {distributions.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <div className="font-medium text-zinc-100">{d.material_name}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-zinc-200">{d.recipient_name}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-zinc-300">{d.territory}</div>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs font-bold text-zinc-100">{d.quantity.toLocaleString('pt-BR')}</span>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-mono text-zinc-400">{new Date(d.created_at).toLocaleDateString('pt-BR')}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="success" size="sm">Entregue</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* New Item Modal */}
      <Modal
        isOpen={isNewItemModalOpen}
        onClose={() => setIsNewItemModalOpen(false)}
        title="Cadastrar Material no Estoque"
        description="Adicione material de campanha para controle de remessas."
      >
        <form onSubmit={handleSaveItem} className="space-y-3.5 text-left">
          <Input
            label="Nome do Material"
            value={itemForm.name}
            onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
            placeholder="Ex.: Santinho Dobrado 4x4"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Categoria"
              value={itemForm.category}
              onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
              options={[
                { value: 'Gráfica', label: 'Material Gráfico / Papel' },
                { value: 'Adesivo', label: 'Adesivos & Praguinhas' },
                { value: 'Bandeira', label: 'Bandeiras & Windbanners' },
                { value: 'Vestuário', label: 'Camisetas & Bonés' },
                { value: 'Geral', label: 'Outros' },
              ]}
            />
            <Input
              label="Unidade de Medida"
              value={itemForm.unit}
              onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
              placeholder="unid, pacotes, caixas"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantidade Total Recebida"
              type="number"
              value={itemForm.total_quantity}
              onChange={(e) => setItemForm({ ...itemForm, total_quantity: Number(e.target.value) })}
              required
            />
            <Input
              label="Alerta de Estoque Baixo"
              type="number"
              value={itemForm.min_stock_alert}
              onChange={(e) => setItemForm({ ...itemForm, min_stock_alert: Number(e.target.value) })}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsNewItemModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Cadastrar Material
            </Button>
          </div>
        </form>
      </Modal>

      {/* Distribution Modal */}
      <Modal
        isOpen={isDistributeModalOpen}
        onClose={() => setIsDistributeModalOpen(false)}
        title="Registrar Entrega de Material"
        description="Baixa de estoque e entrega para coordenador ou território."
      >
        <form onSubmit={handleSaveDistribution} className="space-y-3.5 text-left">
          <Select
            label="Material"
            value={distForm.material_id}
            onChange={(e) => setDistForm({ ...distForm, material_id: e.target.value })}
            options={materials.map(m => ({
              value: m.id,
              label: `${m.name} (${m.total_quantity - m.distributed_quantity} ${m.unit} disponíveis)`
            }))}
          />

          <Input
            label="Destinatário / Coordenador"
            value={distForm.recipient_name}
            onChange={(e) => setDistForm({ ...distForm, recipient_name: e.target.value })}
            placeholder="Ex.: Carlos Alberto"
            required
          />

          <Input
            label="Território / Destino"
            value={distForm.territory}
            onChange={(e) => setDistForm({ ...distForm, territory: e.target.value })}
            placeholder="Ex.: Zona Central / Bairro Gonzaga"
            required
          />

          <Input
            label="Quantidade a Entregar"
            type="number"
            value={distForm.quantity}
            onChange={(e) => setDistForm({ ...distForm, quantity: Number(e.target.value) })}
            required
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsDistributeModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Confirmar Entrega
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
