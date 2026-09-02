import React, { useState } from 'react';
import { UsersRound, Plus, Phone, Mail, MapPin, Edit2, Trash2, Eye, UserCheck, Share2, Copy, Check, MessageSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { localStore } from '../../lib/supabase';
import { Coordinator, Leader } from '../../types';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Drawer } from '../../components/ui/Drawer';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';

export const CoordinatorsPage: React.FC = () => {
  const { organization } = useAuth();
  const { success, error: toastError } = useToast();
  const orgId = organization?.id || 'org-alpha';

  const [coordinators, setCoordinators] = useState<Coordinator[]>(() => localStore.getCoordinators(orgId));
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal / Drawer state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCoord, setSelectedCoord] = useState<Coordinator | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Invite Modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteCoord, setInviteCoord] = useState<Coordinator | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    territory: '',
    region: '',
    status: 'active' as 'active' | 'inactive',
    notes: '',
  });

  const reloadData = () => {
    setCoordinators(localStore.getCoordinators(orgId));
  };

  const getCoordInviteLink = (coord: Coordinator) => {
    const origin = window.location.origin;
    const params = new URLSearchParams({
      convite: 'lider',
      coord_id: coord.id,
      org: orgId,
    });
    return `${origin}/cadastro?${params.toString()}`;
  };

  const getLeaderInviteLink = (lead: Leader) => {
    const origin = window.location.origin;
    const params = new URLSearchParams({
      convite: 'lider',
      lider_id: lead.id,
      org: orgId,
      nome: lead.name,
      coord_id: lead.coordinator_id || '',
    });
    return `${origin}/cadastro?${params.toString()}`;
  };

  const handleOpenCoordInvite = (coord: Coordinator) => {
    setInviteCoord(coord);
    setCopiedLink(false);
    setIsInviteModalOpen(true);
  };

  const handleCopyCoordLink = (coord: Coordinator) => {
    const link = getCoordInviteLink(coord);
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    success('Link de indicação do coordenador copiado!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSendWhatsAppLeader = (lead: Leader, coord?: Coordinator) => {
    const link = getLeaderInviteLink(lead);
    const coordName = coord ? coord.name : 'Coordenação';
    const text = `Olá ${lead.name}! Aqui é ${coordName} da campanha ${organization?.name || 'NEXUS'}. Segue o seu link de acesso exclusivo para o aplicativo de campo. Clique no link abaixo e cadastre sua senha para começar a registrar apoiadores e adesivos:\n\n${link}`;
    const cleanPhone = (lead.phone || '').replace(/\D/g, '');
    const waUrl = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const handleOpenCreate = (coord?: Coordinator) => {
    if (coord) {
      setSelectedCoord(coord);
      setFormData({
        name: coord.name,
        email: coord.email || '',
        phone: coord.phone || '',
        territory: coord.territory,
        region: coord.region || '',
        status: coord.status,
        notes: coord.notes || '',
      });
    } else {
      setSelectedCoord(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        territory: '',
        region: '',
        status: 'active',
        notes: '',
      });
    }
    setIsCreateModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.territory.trim()) {
      toastError('Preencha pelo menos Nome e Território.');
      return;
    }

    const newCoord: Coordinator = {
      id: selectedCoord ? selectedCoord.id : 'coord_' + Math.random().toString(36).substring(2, 9),
      organization_id: orgId,
      name: formData.name.trim(),
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      territory: formData.territory.trim(),
      region: formData.region.trim() || undefined,
      status: formData.status,
      notes: formData.notes.trim() || undefined,
      leaders_count: selectedCoord ? selectedCoord.leaders_count : 0,
      created_at: selectedCoord ? selectedCoord.created_at : new Date().toISOString(),
    };

    localStore.saveCoordinator(newCoord);
    reloadData();
    setIsCreateModalOpen(false);
    success(selectedCoord ? 'Coordenador atualizado!' : 'Coordenador cadastrado com sucesso!');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este coordenador?')) {
      localStore.deleteCoordinator(id);
      reloadData();
      if (isDrawerOpen && selectedCoord?.id === id) {
        setIsDrawerOpen(false);
      }
      success('Coordenador removido.');
    }
  };

  const handleViewDetails = (coord: Coordinator) => {
    setSelectedCoord(coord);
    setIsDrawerOpen(true);
  };

  const filteredCoordinators = coordinators.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.territory.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm));
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const allLeaders = localStore.getLeaders(orgId);
  const coordLeaders = selectedCoord 
    ? allLeaders.filter(l => l.coordinator_id === selectedCoord.id)
    : [];

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/60">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <UsersRound className="w-5 h-5 text-zinc-400" />
            Coordenadores de Articulação
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Gestão dos líderes de polo, zonas eleitorais e links de indicação para cadastro de novas lideranças
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => handleOpenCreate()}
          leftIcon={<Plus className="w-4 h-4" />}
          className="text-xs"
        >
          Novo Coordenador
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por nome, território, telefone..."
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
          <span className="text-zinc-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 px-3 text-zinc-200 text-xs focus:outline-none"
          >
            <option value="all">Todos ({coordinators.length})</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filteredCoordinators.length === 0 ? (
        <EmptyState
          icon={<UsersRound className="w-6 h-6" />}
          title="Nenhum coordenador encontrado"
          description={searchTerm ? 'Nenhum resultado corresponde à sua busca.' : 'Cadastre o primeiro coordenador territorial para estruturar a equipe.'}
          actionLabel="Adicionar Coordenador"
          onAction={() => handleOpenCreate()}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome & Contato</TableHead>
              <TableHead>Território / Região</TableHead>
              <TableHead>Lideranças</TableHead>
              <TableHead>Link do Polo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCoordinators.map((coord) => (
              <TableRow key={coord.id}>
                <TableCell>
                  <div className="font-medium text-zinc-100">{coord.name}</div>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                    {coord.phone && (
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Phone className="w-3 h-3 text-zinc-500" />
                        {coord.phone}
                      </span>
                    )}
                    {coord.email && (
                      <span className="flex items-center gap-1 text-[11px]">
                        <Mail className="w-3 h-3 text-zinc-500" />
                        {coord.email}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{coord.territory}</span>
                  </div>
                  {coord.region && <div className="text-[11px] text-zinc-500 mt-0.5">{coord.region}</div>}
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs font-semibold text-zinc-200">
                    {allLeaders.filter(l => l.coordinator_id === coord.id).length || coord.leaders_count || 0}
                  </span>
                  <span className="text-[11px] text-zinc-500 ml-1">lideranças</span>
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => handleOpenCoordInvite(coord)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer"
                    title="Link de cadastro direto para este coordenador"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Link do Polo</span>
                  </button>
                </TableCell>
                <TableCell>
                  <Badge variant={coord.status === 'active' ? 'success' : 'neutral'} size="sm">
                    {coord.status === 'active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => handleOpenCoordInvite(coord)}
                      title="Compartilhar link do coordenador"
                      className="p-1.5 rounded text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleViewDetails(coord)}
                      title="Ver detalhes"
                      className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenCreate(coord)}
                      title="Editar"
                      className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(coord.id)}
                      title="Excluir"
                      className="p-1.5 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Coordinator Referral Link Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Link de Indicação do Coordenador"
        description="Qualquer líder que se cadastrar por este link ficará automaticamente vinculado a este coordenador."
      >
        {inviteCoord && (
          <div className="space-y-4 text-left">
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Coordenador:</span>
                <span className="font-semibold text-zinc-100">{inviteCoord.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Território / Polo:</span>
                <span className="text-zinc-300">{inviteCoord.territory}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300">
                Link de Indicação Direta
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getCoordInviteLink(inviteCoord)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 font-mono focus:outline-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyCoordLink(inviteCoord)}
                  leftIcon={copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                >
                  {copiedLink ? 'Copiado!' : 'Copiar'}
                </Button>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex justify-end">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setIsInviteModalOpen(false)}
              >
                Concluído
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={selectedCoord ? 'Editar Coordenador' : 'Novo Coordenador'}
        description="Registre as informações do coordenador regional."
      >
        <form onSubmit={handleSave} className="space-y-3.5 text-left">
          <Input
            label="Nome Completo"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex.: Carlos Alberto Mendonça"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Telefone / WhatsApp"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(11) 99999-9999"
            />
            <Input
              label="E-mail"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="carlos@nexus.com.br"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Território / Área de Atuação"
              value={formData.territory}
              onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
              placeholder="Ex.: Gonzaga / Zona Leste"
              required
            />
            <Input
              label="Macro-Região / Polo"
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              placeholder="Ex.: Região Central"
            />
          </div>

          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            options={[
              { value: 'active', label: 'Ativo na Operação' },
              { value: 'inactive', label: 'Inativo' },
            ]}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-300">Observações Estratégicas</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Anotações sobre perfil de liderança, contatos e articulação..."
              rows={3}
              className="w-full bg-zinc-900 text-zinc-100 text-xs rounded-lg border border-zinc-800 p-3 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {selectedCoord ? 'Salvar Alterações' : 'Cadastrar Coordenador'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Details Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedCoord?.name || 'Detalhes do Coordenador'}
        description={`Território: ${selectedCoord?.territory || ''}`}
      >
        {selectedCoord && (
          <div className="space-y-6 text-left text-xs">
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500">Status:</span>
                <Badge variant={selectedCoord.status === 'active' ? 'success' : 'neutral'} size="sm">
                  {selectedCoord.status === 'active' ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Telefone:</span>
                <span className="font-mono text-zinc-200">{selectedCoord.phone || 'Não informado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">E-mail:</span>
                <span className="text-zinc-200">{selectedCoord.email || 'Não informado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Região:</span>
                <span className="text-zinc-200">{selectedCoord.region || '—'}</span>
              </div>
            </div>

            {/* Referral Link Box in Drawer */}
            <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-zinc-200">Link do Polo Regional</div>
                <div className="text-[11px] text-zinc-500">Cadastre novas lideranças vinculadas a este coordenador</div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenCoordInvite(selectedCoord)}
                className="border-zinc-700 text-zinc-200"
                leftIcon={<Share2 className="w-3.5 h-3.5 text-emerald-400" />}
              >
                Gerar Link
              </Button>
            </div>

            {/* Leaders list under this coordinator */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800 mb-3">
                <h4 className="font-semibold text-zinc-200 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-zinc-400" />
                  Lideranças Vinculadas ({coordLeaders.length})
                </h4>
              </div>

              {coordLeaders.length === 0 ? (
                <p className="text-zinc-500 italic py-2">Nenhuma liderança atribuída diretamente a este coordenador.</p>
              ) : (
                <div className="space-y-2">
                  {coordLeaders.map((lead) => (
                    <div key={lead.id} className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-zinc-200 truncate">{lead.name}</div>
                        <div className="text-[11px] text-zinc-500">{lead.neighborhood || lead.territory}</div>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSendWhatsAppLeader(lead, selectedCoord)}
                          title="Enviar convite via WhatsApp"
                          className="px-2 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 text-[11px] flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedCoord.notes && (
              <div className="p-3 bg-zinc-950/40 rounded-lg border border-zinc-800">
                <div className="text-zinc-400 font-semibold mb-1">Notas:</div>
                <p className="text-zinc-300 leading-relaxed">{selectedCoord.notes}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};
