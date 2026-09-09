import React, { useState, useEffect, useCallback } from 'react';
import { UserCheck, Plus, Phone, Mail, MapPin, Edit2, Trash2, Eye, Target, Contact, Share2, Copy, Check, MessageSquare, Car, Home, Users, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Leader, Coordinator, CrmContact } from '../../types';
import { leadersService, coordinatorsService, crmService } from '../../services';
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
  const orgId = organization?.id || '';

  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    goal_target: 10,
    goal_reached: 0,
    goal_cars: 50,
    goal_houses: 30,
    goal_presence: 20,
    status: 'active' as 'active' | 'inactive' | 'pending',
  });

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const [leadsRes, coordsRes, contactsRes] = await Promise.all([
        leadersService.getAll(orgId),
        coordinatorsService.getAll(orgId),
        crmService.getAll(orgId),
      ]);
      setLeaders(leadsRes.data || []);
      setCoordinators(coordsRes.data || []);
      setContacts(contactsRes.data || []);
    } catch (err: any) {
      toastError('Erro ao carregar lideranças: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, toastError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        goal_target: leader.goal_target ?? 10,
        goal_reached: leader.goal_reached ?? 0,
        goal_cars: leader.goal_cars ?? 50,
        goal_houses: leader.goal_houses ?? 30,
        goal_presence: leader.goal_presence ?? 20,
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
        goal_target: 10,
        goal_reached: 0,
        goal_cars: 50,
        goal_houses: 30,
        goal_presence: 20,
        status: 'active',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.territory.trim()) {
      toastError('Preencha Nome e Território.');
      return;
    }

    setIsSubmitting(true);
    const assignedCoord = coordinators.find(c => c.id === formData.coordinator_id);

    try {
      if (selectedLeader) {
        const { data: updated, error } = await leadersService.update(selectedLeader.id, {
          coordinator_id: formData.coordinator_id || undefined,
          coordinator_name: assignedCoord ? assignedCoord.name : undefined,
          name: formData.name.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          territory: formData.territory.trim(),
          neighborhood: formData.neighborhood.trim() || undefined,
          goal_target: Number(formData.goal_target) || 0,
          goal_reached: Number(formData.goal_reached) || 0,
          goal_cars: Number(formData.goal_cars) || 0,
          goal_houses: Number(formData.goal_houses) || 0,
          goal_presence: Number(formData.goal_presence) || 0,
          contacts_count: Number(formData.goal_reached) || 0,
          status: formData.status,
        });

        if (error) {
          toastError('Erro ao atualizar liderança: ' + error.message);
        } else {
          success('Liderança atualizada com sucesso!');
          await loadData();
          setIsModalOpen(false);
        }
      } else {
        const { data: created, error } = await leadersService.create({
          organization_id: orgId,
          coordinator_id: formData.coordinator_id || undefined,
          coordinator_name: assignedCoord ? assignedCoord.name : undefined,
          name: formData.name.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          territory: formData.territory.trim(),
          neighborhood: formData.neighborhood.trim() || undefined,
          goal_target: Number(formData.goal_target) || 10,
          goal_reached: Number(formData.goal_reached) || 0,
          goal_cars: Number(formData.goal_cars) || 50,
          goal_houses: Number(formData.goal_houses) || 30,
          goal_presence: Number(formData.goal_presence) || 20,
          contacts_count: Number(formData.goal_reached) || 0,
          status: formData.status,
        });

        if (error) {
          toastError('Erro ao cadastrar liderança: ' + error.message);
        } else if (created) {
          success('Liderança cadastrada com sucesso!');
          await loadData();
          setIsModalOpen(false);
          setTimeout(() => {
            handleOpenShare(created);
          }, 300);
        }
      }
    } catch (err: any) {
      toastError('Erro inesperado: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta liderança?')) {
      const { error } = await leadersService.delete(id);
      if (error) {
        toastError('Erro ao excluir liderança: ' + error.message);
      } else {
        await loadData();
        if (isDrawerOpen && selectedLeader?.id === id) setIsDrawerOpen(false);
        success('Liderança removida com sucesso.');
      }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-slate-700" />
            Lideranças Territoriais
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
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
            className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-slate-800 text-xs focus:outline-none"
          >
            <option value="all">Todos os Coordenadores</option>
            {coordinators.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-slate-800 text-xs focus:outline-none"
          >
            <option value="all">Todos os Status ({leaders.length})</option>
            <option value="active">Ativas</option>
            <option value="pending">Pendentes</option>
            <option value="inactive">Inativas</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-slate-600" />
          <span className="text-xs font-medium">Carregando lideranças do Supabase...</span>
        </div>
      ) : filteredLeaders.length === 0 ? (
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
              <TableHead>Metas de Mobilização</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeaders.map((lead) => {
              const target = lead.goal_target || 10;
              const percent = Math.min(100, Math.round(((lead.goal_reached || 0) / target) * 100));
              return (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div className="font-medium text-slate-900">{lead.name}</div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      {lead.phone && <span className="font-mono text-[11px]">{lead.phone}</span>}
                      {lead.email && <span className="text-[11px]">{lead.email}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{lead.neighborhood || lead.territory}</span>
                    </div>
                    {lead.neighborhood && lead.territory !== lead.neighborhood && (
                      <div className="text-[11px] text-slate-500 mt-0.5">{lead.territory}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-slate-700">
                      {lead.coordinator_name || coordinators.find(c => c.id === lead.coordinator_id)?.name || '—'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => handleOpenShare(lead)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                      title="Gerar e enviar link de cadastro para o líder"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Link de Convite</span>
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1.5 min-w-[170px]">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" /> Apoiadores
                        </span>
                        <span className="font-mono text-slate-900 font-semibold">
                          {lead.goal_reached || 0}/{lead.goal_target || 10}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/60">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 pt-0.5 text-[10px] text-slate-500">
                        <span className="flex items-center gap-0.5 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200" title="Meta Carros">
                          <Car className="w-2.5 h-2.5 text-emerald-600" /> {lead.goal_cars || 50}
                        </span>
                        <span className="flex items-center gap-0.5 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200" title="Meta Casas">
                          <Home className="w-2.5 h-2.5 text-amber-600" /> {lead.goal_houses || 30}
                        </span>
                        <span className="flex items-center gap-0.5 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200" title="Meta Presença">
                          <UserCheck className="w-2.5 h-2.5 text-indigo-600" /> {lead.goal_presence || 20}
                        </span>
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
                        className="p-1.5 rounded text-emerald-600 hover:text-emerald-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedLeader(lead);
                          setIsDrawerOpen(true);
                        }}
                        title="Ver detalhes"
                        className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenModal(lead)}
                        title="Editar"
                        className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(lead.id)}
                        title="Excluir"
                        className="p-1.5 rounded text-slate-500 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
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
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Líder:</span>
                <span className="font-semibold text-slate-900">{shareLeader.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Bairro / Território:</span>
                <span className="text-slate-700">{shareLeader.neighborhood || shareLeader.territory}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Coordenador Vinculado:</span>
                <span className="text-slate-700">
                  {shareLeader.coordinator_name || coordinators.find(c => c.id === shareLeader.coordinator_id)?.name || 'Coordenação Central'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Link Exclusivo de Cadastro
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getInviteLink(shareLeader)}
                  className="flex-1 bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-mono focus:outline-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyLink(shareLeader)}
                  leftIcon={copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                >
                  {copiedLink ? 'Copiado!' : 'Copiar'}
                </Button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Ao abrir o link, o líder terá os dados pré-preenchidos e receberá permissão de campo automaticamente.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-2">
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

      {/* Create / Edit Modal */}
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

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
              <Target className="w-4 h-4 text-emerald-600" />
              <span>Metas da Liderança (Definidas pelo Coordenador)</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="1. Meta Apoiadores"
                type="number"
                value={formData.goal_target}
                onChange={(e) => setFormData({ ...formData, goal_target: Number(e.target.value) })}
                placeholder="Ex.: 10"
                required
              />
              <Input
                label="2. Meta Carros Adesivados"
                type="number"
                value={formData.goal_cars}
                onChange={(e) => setFormData({ ...formData, goal_cars: Number(e.target.value) })}
                placeholder="Ex.: 50"
                required
              />
              <Input
                label="3. Meta Casas Adesivadas"
                type="number"
                value={formData.goal_houses}
                onChange={(e) => setFormData({ ...formData, goal_houses: Number(e.target.value) })}
                placeholder="Ex.: 30"
                required
              />
              <Input
                label="4. Meta Presença (Check-ins)"
                type="number"
                value={formData.goal_presence}
                onChange={(e) => setFormData({ ...formData, goal_presence: Number(e.target.value) })}
                placeholder="Ex.: 20"
                required
              />
            </div>

            <div className="pt-2 border-t border-slate-200">
              <Input
                label="Apoiadores Realizados Atualmente"
                type="number"
                value={formData.goal_reached}
                onChange={(e) => setFormData({ ...formData, goal_reached: Number(e.target.value) })}
              />
            </div>
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

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
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
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Coordenador:</span>
                <span className="text-slate-800 font-medium">
                  {selectedLeader.coordinator_name || coordinators.find(c => c.id === selectedLeader.coordinator_id)?.name || 'Direto'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Telefone:</span>
                <span className="font-mono text-slate-800">{selectedLeader.phone || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">E-mail:</span>
                <span className="text-slate-800">{selectedLeader.email || '—'}</span>
              </div>
            </div>

            {/* 4 Goals Grid in Drawer */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-600" />
                <span>Metas Operacionais (4 Eixos)</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Apoiadores</span>
                    <Users className="w-3 h-3 text-slate-400" />
                  </div>
                  <div className="mt-1 font-mono text-sm font-bold text-slate-900">
                    {selectedLeader.goal_reached || 0} <span className="text-xs text-slate-500 font-normal">/ {selectedLeader.goal_target || 10}</span>
                  </div>
                  <div className="text-[10px] text-emerald-600 font-semibold mt-1">
                    {Math.round(((selectedLeader.goal_reached || 0) / (selectedLeader.goal_target || 1)) * 100)}%
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-[11px] text-emerald-800 flex items-center justify-between">
                    <span>Carros</span>
                    <Car className="w-3 h-3 text-emerald-600" />
                  </div>
                  <div className="mt-1 font-mono text-sm font-bold text-emerald-900">
                    Meta: {selectedLeader.goal_cars || 50}
                  </div>
                  <div className="text-[10px] text-emerald-700 mt-1">Adesivagens</div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="text-[11px] text-amber-800 flex items-center justify-between">
                    <span>Casas</span>
                    <Home className="w-3 h-3 text-amber-600" />
                  </div>
                  <div className="mt-1 font-mono text-sm font-bold text-amber-900">
                    Meta: {selectedLeader.goal_houses || 30}
                  </div>
                  <div className="text-[10px] text-amber-700 mt-1">Placas/Adesivos</div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                  <div className="text-[11px] text-indigo-800 flex items-center justify-between">
                    <span>Presença</span>
                    <UserCheck className="w-3 h-3 text-indigo-600" />
                  </div>
                  <div className="mt-1 font-mono text-sm font-bold text-indigo-900">
                    Meta: {selectedLeader.goal_presence || 20}
                  </div>
                  <div className="text-[10px] text-indigo-700 mt-1">Check-ins em Atos</div>
                </div>
              </div>
            </div>

            {/* Quick Share from Drawer */}
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-emerald-900">Link de Indicação</div>
                <div className="text-[11px] text-emerald-700">Compartilhe no WhatsApp para o líder criar sua senha</div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenShare(selectedLeader)}
                className="border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                leftIcon={<Share2 className="w-3.5 h-3.5" />}
              >
                Gerar Link
              </Button>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-200 mb-3">
                <Contact className="w-4 h-4 text-slate-500" />
                Contatos Vinculados a este Líder ({leaderContacts.length})
              </h4>
              {leaderContacts.length === 0 ? (
                <p className="text-slate-500 italic py-2">Nenhum contato atribuído diretamente.</p>
              ) : (
                <div className="space-y-2">
                  {leaderContacts.map(c => (
                    <div key={c.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-900">{c.full_name}</div>
                        <div className="text-[11px] text-slate-500">{c.phone}</div>
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
