import React, { useState } from 'react';
import { UserCheck, Plus, Phone, Mail, MapPin, Edit2, Trash2, Eye, Target, Contact, Share2, Copy, Check, MessageSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { localStore } from '../../lib/supabase';
import { Leader, Coordinator } from '../../types';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Drawer } from '../../components/ui/Drawer';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';

export const LeadersPage: React.FC = () => {
  const { organization } = useAuth();
  const { success, error: toastError } = useToast();
  const orgId = organization?.id || 'org-alpha';

  const [leaders, setLeaders] = useState<Leader[]>(() => localStore.getLeaders(orgId));
  const coordinators = localStore.getCoordinators(orgId);
  const contacts = localStore.getContacts(orgId);

  const [searchTerm, setSearchTerm] = useState('');
  const [coordFilter, setCoordFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLeader, setSelectedLeader] = useState<Leader | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Invite / Share Modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareLeader, setShareLeader] = useState<Leader | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    territory: '',
    neighborhood: '',
    coordinator_id: '',
    goal_target: 300,
    goal_reached: 0,
    status: 'active' as 'active' | 'inactive' | 'pending',
  });

  const reloadData = () => {
    setLeaders(localStore.getLeaders(orgId));
  };

  const getInviteLink = (lead: Leader) => {
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

  const handleOpenShare = (lead: Leader) => {
    setShareLeader(lead);
    setCopiedLink(false);
    setIsShareModalOpen(true);
  };

  const handleCopyLink = (lead: Leader) => {
    const link = getInviteLink(lead);
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    success('Link de indicação copiado!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSendWhatsApp = (lead: Leader) => {
    const link = getInviteLink(lead);
    const assignedCoord = coordinators.find(c => c.id === lead.coordinator_id);
    const coordName = assignedCoord ? assignedCoord.name : 'nossa coordenação';
    const cleanPhone = (lead.phone || '').replace(/\D/g, '');

    const text = `Olá ${lead.name}! Aqui é da coordenação (${coordName}) da campanha ${organization?.name || 'NEXUS'}. Você foi cadastrado(a) como nossa Liderança no território ${lead.neighborhood || lead.territory}. Para acessar o aplicativo de campo no seu celular e registrar apoiadores e adesivagens de carros e casas, clique no link abaixo para criar sua senha de acesso:\n\n${link}`;

    const waUrl = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    window.open(waUrl, '_blank');
  };

  const handleOpenModal = (leader?: Leader) => {
    if (leader) {
      setSelectedLeader(leader);
      setFormData({
        name: leader.name,
        email: leader.email || '',
        phone: leader.phone || '',
        territory: leader.territory,
        neighborhood: leader.neighborhood || '',
        coordinator_id: leader.coordinator_id || '',
        goal_target: leader.goal_target,
        goal_reached: leader.goal_reached,
        status: leader.status,
      });
    } else {
      setSelectedLeader(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        territory: '',
        neighborhood: '',
        coordinator_id: coordinators[0]?.id || '',
        goal_target: 300,
        goal_reached: 0,
        status: 'active',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.territory.trim()) {
      toastError('Preencha Nome e Território.');
      return;
    }

    const assignedCoord = coordinators.find(c => c.id === formData.coordinator_id);

    const newLeader: Leader = {
      id: selectedLeader ? selectedLeader.id : 'lead_' + Math.random().toString(36).substring(2, 9),
      organization_id: orgId,
      coordinator_id: formData.coordinator_id || undefined,
      coordinator_name: assignedCoord ? assignedCoord.name : undefined,
      name: formData.name.trim(),
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      territory: formData.territory.trim(),
      neighborhood: formData.neighborhood.trim() || undefined,
      goal_target: Number(formData.goal_target) || 100,
      goal_reached: Number(formData.goal_reached) || 0,
      contacts_count: Number(formData.goal_reached) || 0,
      status: formData.status,
      created_at: selectedLeader ? selectedLeader.created_at : new Date().toISOString(),
    };

    localStore.saveLeader(newLeader);
    reloadData();
    setIsModalOpen(false);
    success(selectedLeader ? 'Liderança atualizada!' : 'Liderança cadastrada! Abrindo link de convite...');
    
    // Auto prompt share modal for newly created leaders
    if (!selectedLeader) {
      setTimeout(() => {
        handleOpenShare(newLeader);
      }, 400);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta liderança?')) {
      localStore.deleteLeader(id);
      reloadData();
      if (isDrawerOpen && selectedLeader?.id === id) setIsDrawerOpen(false);
      success('Liderança removida.');
    }
  };

  const filteredLeaders = leaders.filter(l => {
    const matchesSearch = 
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.territory.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.neighborhood && l.neighborhood.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCoord = coordFilter === 'all' || l.coordinator_id === coordFilter;
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesSearch && matchesCoord && matchesStatus;
  });

  const leaderContacts = selectedLeader
    ? contacts.filter(c => c.leader_id === selectedLeader.id)
    : [];

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/60">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-zinc-400" />
            Lideranças Territoriais
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Mapeamento dos líderes comunitários, bairros e envio de links de cadastro de campo
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => handleOpenModal()}
          leftIcon={<Plus className="w-4 h-4" />}
          className="text-xs"
        >
          Nova Liderança
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por líder, bairro ou território..."
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs flex-wrap">
          <select
            value={coordFilter}
            onChange={(e) => setCoordFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 px-3 text-zinc-200 text-xs focus:outline-none"
          >
            <option value="all">Todos os Coordenadores</option>
            {coordinators.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 px-3 text-zinc-200 text-xs focus:outline-none"
          >
            <option value="all">Todos os Status ({leaders.length})</option>
            <option value="active">Ativas</option>
            <option value="pending">Pendentes</option>
            <option value="inactive">Inativas</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filteredLeaders.length === 0 ? (
        <EmptyState
          icon={<UserCheck className="w-6 h-6" />}
          title="Nenhuma liderança encontrada"
          description="Cadastre as lideranças para gerar os links de indicação e acompanhar a base territorial."
          actionLabel="Adicionar Liderança"
          onAction={() => handleOpenModal()}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Líder & Contato</TableHead>
              <TableHead>Território / Bairro</TableHead>
              <TableHead>Coordenador</TableHead>
              <TableHead>Link de Acesso</TableHead>
              <TableHead>Meta de Mobilização</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeaders.map((lead) => {
              const percent = Math.min(100, Math.round((lead.goal_reached / lead.goal_target) * 100));
              return (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div className="font-medium text-zinc-100">{lead.name}</div>
                    <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                      {lead.phone && <span className="font-mono text-[11px]">{lead.phone}</span>}
                      {lead.email && <span className="text-[11px]">{lead.email}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{lead.neighborhood || lead.territory}</span>
                    </div>
                    {lead.neighborhood && lead.territory !== lead.neighborhood && (
                      <div className="text-[11px] text-zinc-500 mt-0.5">{lead.territory}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-zinc-300">
                      {lead.coordinator_name || coordinators.find(c => c.id === lead.coordinator_id)?.name || '—'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => handleOpenShare(lead)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 transition-colors cursor-pointer"
                      title="Gerar e enviar link de cadastro para o líder"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Link de Convite</span>
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="w-32">
                      <div className="flex justify-between text-[11px] font-mono mb-1">
                        <span className="text-zinc-200 font-semibold">{lead.goal_reached}</span>
                        <span className="text-zinc-500">/ {lead.goal_target}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={lead.status === 'active' ? 'success' : lead.status === 'pending' ? 'warning' : 'neutral'} size="sm">
                      {lead.status === 'active' ? 'Ativo' : lead.status === 'pending' ? 'Pendente' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenShare(lead)}
                        title="Enviar convite"
                        className="p-1.5 rounded text-emerald-400 hover:text-emerald-300 hover:bg-zinc-800"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedLeader(lead);
                          setIsDrawerOpen(true);
                        }}
                        title="Ver detalhes"
                        className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenModal(lead)}
                        title="Editar"
                        className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(lead.id)}
                        title="Excluir"
                        className="p-1.5 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Share / Invitation Link Modal */}
      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Link de Convite e Indicação"
        description="Envie este link para que o líder faça o próprio cadastro e acesse o Modo de Campo."
      >
        {shareLeader && (
          <div className="space-y-4 text-left">
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Líder:</span>
                <span className="font-semibold text-zinc-100">{shareLeader.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Bairro / Território:</span>
                <span className="text-zinc-300">{shareLeader.neighborhood || shareLeader.territory}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Coordenador Vinculado:</span>
                <span className="text-zinc-300">
                  {shareLeader.coordinator_name || coordinators.find(c => c.id === shareLeader.coordinator_id)?.name || 'Coordenação Central'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300">
                Link Exclusivo de Cadastro
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getInviteLink(shareLeader)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 font-mono focus:outline-none selection:bg-emerald-900"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyLink(shareLeader)}
                  leftIcon={copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                >
                  {copiedLink ? 'Copiado!' : 'Copiar'}
                </Button>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Ao abrir o link, o líder terá os dados pré-preenchidos e receberá permissão de campo automaticamente.
              </p>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex flex-col sm:flex-row items-center gap-2">
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => handleSendWhatsApp(shareLeader)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                leftIcon={<MessageSquare className="w-4 h-4" />}
              >
                Enviar Convite via WhatsApp
              </Button>
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setIsShareModalOpen(false)}
                className="w-full sm:w-auto"
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedLeader ? 'Editar Liderança' : 'Nova Liderança'}
        description="Vincule a liderança a um território e coordenador responsável."
      >
        <form onSubmit={handleSave} className="space-y-3.5 text-left">
          <Input
            label="Nome da Liderança"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex.: Fabiana Rios"
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
              label="E-mail (opcional)"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="fabiana@email.com"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Bairro"
              value={formData.neighborhood}
              onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
              placeholder="Ex.: Gonzaga"
            />
            <Input
              label="Território Geral"
              value={formData.territory}
              onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
              placeholder="Ex.: Orla da Praia"
              required
            />
          </div>

          <Select
            label="Coordenador Responsável"
            value={formData.coordinator_id}
            onChange={(e) => setFormData({ ...formData, coordinator_id: e.target.value })}
            options={[
              { value: '', label: 'Sem coordenador vinculado' },
              ...coordinators.map(c => ({ value: c.id, label: `${c.name} (${c.territory})` }))
            ]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Meta de Contatos (Target)"
              type="number"
              value={formData.goal_target}
              onChange={(e) => setFormData({ ...formData, goal_target: Number(e.target.value) })}
            />
            <Input
              label="Realizado Atual"
              type="number"
              value={formData.goal_reached}
              onChange={(e) => setFormData({ ...formData, goal_reached: Number(e.target.value) })}
            />
          </div>

          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            options={[
              { value: 'active', label: 'Ativo' },
              { value: 'pending', label: 'Pendente de Confirmação' },
              { value: 'inactive', label: 'Inativo' },
            ]}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Salvar Liderança
            </Button>
          </div>
        </form>
      </Modal>

      {/* Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedLeader?.name || 'Detalhes da Liderança'}
        description={`Bairro: ${selectedLeader?.neighborhood || selectedLeader?.territory || ''}`}
      >
        {selectedLeader && (
          <div className="space-y-6 text-left text-xs">
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500">Coordenador:</span>
                <span className="text-zinc-200 font-medium">
                  {selectedLeader.coordinator_name || coordinators.find(c => c.id === selectedLeader.coordinator_id)?.name || 'Direto'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Meta:</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  {selectedLeader.goal_reached} de {selectedLeader.goal_target} ({Math.round((selectedLeader.goal_reached / selectedLeader.goal_target) * 100)}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Telefone:</span>
                <span className="font-mono text-zinc-200">{selectedLeader.phone || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">E-mail:</span>
                <span className="text-zinc-200">{selectedLeader.email || '—'}</span>
              </div>
            </div>

            {/* Quick Share from Drawer */}
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/80 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-emerald-300">Link de Indicação</div>
                <div className="text-[11px] text-emerald-400/80">Compartilhe no WhatsApp para o líder criar sua senha</div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenShare(selectedLeader)}
                className="border-emerald-700 text-emerald-200 hover:bg-emerald-900"
                leftIcon={<Share2 className="w-3.5 h-3.5" />}
              >
                Gerar Link
              </Button>
            </div>

            <div>
              <h4 className="font-semibold text-zinc-200 flex items-center gap-1.5 pb-2 border-b border-zinc-800 mb-3">
                <Contact className="w-4 h-4 text-zinc-400" />
                Contatos Vinculados a este Líder ({leaderContacts.length})
              </h4>
              {leaderContacts.length === 0 ? (
                <p className="text-zinc-500 italic py-2">Nenhum contato atribuído diretamente.</p>
              ) : (
                <div className="space-y-2">
                  {leaderContacts.map(c => (
                    <div key={c.id} className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-zinc-200">{c.full_name}</div>
                        <div className="text-[11px] text-zinc-500">{c.phone}</div>
                      </div>
                      <Badge variant="neutral" size="sm">{c.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
