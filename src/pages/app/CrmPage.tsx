import React, { useState, useEffect, useCallback } from 'react';
import { Contact, Plus, Phone, Mail, MapPin, Tag, Edit2, Trash2, Eye, UserCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { CrmContact, Leader } from '../../types';
import { crmService, leadersService } from '../../services';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Drawer } from '../../components/ui/Drawer';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';

export const CrmPage: React.FC = () => {
  const { organization, profile } = useAuth();
  const { success, error: toastError } = useToast();
  const orgId = organization?.id || '';

  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [leaderFilter, setLeaderFilter] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<CrmContact | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    territory: '',
    neighborhood: '',
    leader_id: '',
    status: 'supporter' as CrmContact['status'],
    tagsString: '',
    notes: '',
  });

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const [contactsRes, leadersRes] = await Promise.all([
        crmService.getAll(orgId),
        leadersService.getAll(orgId),
      ]);
      setContacts(contactsRes.data || []);
      setLeaders(leadersRes.data || []);
    } catch (err: any) {
      toastError('Erro ao carregar contatos do CRM: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, toastError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenModal = (contact?: CrmContact) => {
    if (contact) {
      setSelectedContact(contact);
      setFormData({
        full_name: contact.full_name,
        phone: contact.phone,
        email: contact.email || '',
        territory: contact.territory,
        neighborhood: contact.neighborhood || '',
        leader_id: contact.leader_id || '',
        status: contact.status,
        tagsString: contact.tags ? contact.tags.join(', ') : '',
        notes: contact.notes || '',
      });
    } else {
      setSelectedContact(null);
      setFormData({
        full_name: '',
        phone: '',
        email: '',
        territory: '',
        neighborhood: '',
        leader_id: leaders[0]?.id || '',
        status: 'supporter',
        tagsString: '',
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.phone.trim()) {
      toastError('Informe Nome completo e Telefone.');
      return;
    }

    setIsSubmitting(true);
    const assignedLeader = leaders.find(l => l.id === formData.leader_id);
    const tagsArray = formData.tagsString
      ? formData.tagsString.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
      : [];

    const combinedTags = Array.from(new Set([
      ...tagsArray,
      formData.status,
    ].filter(Boolean)));

    try {
      if (selectedContact) {
        const { data: updated, error } = await crmService.update(selectedContact.id, {
          leader_id: formData.leader_id || undefined,
          name: formData.full_name.trim(),
          whatsapp: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          city: formData.territory.trim() || 'Geral',
          neighborhood: formData.neighborhood.trim() || undefined,
          tags: combinedTags,
        });

        if (error) {
          toastError('Erro ao atualizar contato: ' + error.message);
        } else {
          success('Contato atualizado com sucesso!');
          await loadData();
          setIsModalOpen(false);
        }
      } else {
        const { data: created, error } = await crmService.create({
          organization_id: orgId,
          leader_id: formData.leader_id || undefined,
          name: formData.full_name.trim(),
          whatsapp: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          city: formData.territory.trim() || 'Geral',
          neighborhood: formData.neighborhood.trim() || undefined,
          origin: 'crm',
          tags: combinedTags,
        });

        if (error) {
          toastError('Erro ao cadastrar contato: ' + error.message);
        } else if (created) {
          success('Contato cadastrado no CRM com sucesso!');
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

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este contato do CRM?')) {
      const { error } = await crmService.delete(id);
      if (error) {
        toastError('Erro ao excluir contato: ' + error.message);
      } else {
        await loadData();
        if (isDrawerOpen && selectedContact?.id === id) setIsDrawerOpen(false);
        success('Contato removido com sucesso.');
      }
    }
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = 
      c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.territory.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.neighborhood && c.neighborhood.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesLeader = leaderFilter === 'all' || c.leader_id === leaderFilter;
    return matchesSearch && matchesStatus && matchesLeader;
  });

  const getStatusBadge = (status: CrmContact['status']) => {
    switch (status) {
      case 'supporter': return <Badge variant="success" size="sm">Apoiador</Badge>;
      case 'multiplier': return <Badge variant="primary" size="sm">Multiplicador</Badge>;
      case 'undecided': return <Badge variant="warning" size="sm">Indeciso</Badge>;
      case 'volunteer': return <Badge variant="info" size="sm">Voluntário</Badge>;
      case 'hostile': return <Badge variant="danger" size="sm">Oposição</Badge>;
      default: return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Contact className="w-5 h-5 text-slate-700" />
            CRM & Base de Contatos
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro unificado de eleitores, apoiadores e multiplicadores
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => handleOpenModal()}
          leftIcon={<Plus className="w-4 h-4" />}
          className="text-xs"
        >
          Novo Contato
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por nome, telefone ou bairro..."
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs flex-wrap">
          <select
            value={leaderFilter}
            onChange={(e) => setLeaderFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-slate-800 text-xs focus:outline-none"
          >
            <option value="all">Todos os Líderes</option>
            {leaders.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-slate-800 text-xs focus:outline-none"
          >
            <option value="all">Todos os Status ({contacts.length})</option>
            <option value="supporter">Apoiadores</option>
            <option value="multiplier">Multiplicadores</option>
            <option value="volunteer">Voluntários</option>
            <option value="undecided">Indecisos</option>
            <option value="hostile">Oposição</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-slate-600" />
          <span className="text-xs font-medium">Carregando CRM do Supabase...</span>
        </div>
      ) : filteredContacts.length === 0 ? (
        <EmptyState
          icon={<Contact className="w-6 h-6" />}
          title="Nenhum contato encontrado"
          description={searchTerm ? 'Nenhum eleitor corresponde ao filtro.' : 'Comece a cadastrar eleitores e apoiadores vinculados aos líderes.'}
          actionLabel="Adicionar Contato"
          onAction={() => handleOpenModal()}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome & Contato</TableHead>
              <TableHead>Território / Bairro</TableHead>
              <TableHead>Líder Responsável</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Classificação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell>
                  <div className="font-medium text-slate-900">{contact.full_name}</div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                    <span className="font-mono text-[11px] flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" /> {contact.phone}
                    </span>
                    {contact.email && (
                      <span className="text-[11px] flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" /> {contact.email}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{contact.neighborhood || contact.territory}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-slate-700 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>{contact.leader_name || leaders.find(l => l.id === contact.leader_id)?.name || 'Central'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {contact.tags && contact.tags.length > 0 ? (
                      contact.tags.map(t => (
                        <span key={t} className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                          #{t}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-400">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(contact.status)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => {
                        setSelectedContact(contact);
                        setIsDrawerOpen(true);
                      }}
                      title="Ver detalhes"
                      className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenModal(contact)}
                      title="Editar"
                      className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(contact.id)}
                      title="Excluir"
                      className="p-1.5 rounded text-slate-500 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
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

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedContact ? 'Editar Contato' : 'Novo Contato no CRM'}
        description="Armazene os dados com segurança no Supabase."
      >
        <form onSubmit={handleSave} className="space-y-3.5 text-left">
          <Input
            label="Nome Completo"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="Ex.: Maria Clara Souza"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Telefone / WhatsApp"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(11) 98888-7777"
              required
            />
            <Input
              label="E-mail (opcional)"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="maria@gmail.com"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Bairro"
              value={formData.neighborhood}
              onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
              placeholder="Ex.: Aparecida"
            />
            <Input
              label="Território / Zona"
              value={formData.territory}
              onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
              placeholder="Ex.: Zona Leste"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Líder Vinculado"
              value={formData.leader_id}
              onChange={(e) => setFormData({ ...formData, leader_id: e.target.value })}
              options={[
                { value: '', label: 'Coordenação Central (sem líder)' },
                ...leaders.map(l => ({ value: l.id, label: `${l.name} (${l.territory})` }))
              ]}
            />

            <Select
              label="Classificação Eleitoral"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              options={[
                { value: 'supporter', label: 'Apoiador Confirmado' },
                { value: 'multiplier', label: 'Multiplicador Ativo' },
                { value: 'volunteer', label: 'Voluntário de Ação' },
                { value: 'undecided', label: 'Indeciso / Em Conversão' },
                { value: 'hostile', label: 'Oposição / Não contatar' },
              ]}
            />
          </div>

          <Input
            label="Tags / Marcadores (separados por vírgula)"
            value={formData.tagsString}
            onChange={(e) => setFormData({ ...formData, tagsString: e.target.value })}
            placeholder="saude, comerciante, juventude, adesivo"
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">Observações & Demandas</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Anotações sobre a conversa, pedidos comunitários ou disponibilidade..."
              rows={3}
              className="w-full bg-white text-slate-900 text-xs rounded-lg border border-slate-200 p-3 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Salvar Contato
            </Button>
          </div>
        </form>
      </Modal>

      {/* Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedContact?.full_name || 'Detalhes do Eleitor'}
        description={`Telefone: ${selectedContact?.phone || ''}`}
      >
        {selectedContact && (
          <div className="space-y-6 text-left text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status:</span>
                {getStatusBadge(selectedContact.status)}
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Líder:</span>
                <span className="text-slate-900 font-medium">
                  {selectedContact.leader_name || leaders.find(l => l.id === selectedContact.leader_id)?.name || 'Central'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bairro:</span>
                <span className="text-slate-900">{selectedContact.neighborhood || 'Não informado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Território:</span>
                <span className="text-slate-900">{selectedContact.territory || 'Geral'}</span>
              </div>
            </div>

            {selectedContact.notes && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="text-slate-700 font-semibold">Observações:</div>
                <p className="text-slate-600 leading-relaxed">{selectedContact.notes}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};
