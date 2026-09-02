import React, { useState } from 'react';
import { Contact, Plus, Phone, Mail, MapPin, Tag, Edit2, Trash2, Eye, UserCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { localStore } from '../../lib/supabase';
import { CrmContact } from '../../types';
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
  const { organization } = useAuth();
  const { success, error: toastError } = useToast();
  const orgId = organization?.id || 'org-alpha';

  const [contacts, setContacts] = useState<CrmContact[]>(() => localStore.getContacts(orgId));
  const leaders = localStore.getLeaders(orgId);

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

  const reloadData = () => {
    setContacts(localStore.getContacts(orgId));
  };

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.phone.trim()) {
      toastError('Informe Nome completo e Telefone.');
      return;
    }

    const assignedLeader = leaders.find(l => l.id === formData.leader_id);
    const tagsArray = formData.tagsString
      ? formData.tagsString.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
      : [];

    const newContact: CrmContact = {
      id: selectedContact ? selectedContact.id : 'crm_' + Math.random().toString(36).substring(2, 9),
      organization_id: orgId,
      leader_id: formData.leader_id || undefined,
      leader_name: assignedLeader ? assignedLeader.name : undefined,
      coordinator_id: assignedLeader ? assignedLeader.coordinator_id : undefined,
      full_name: formData.full_name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || undefined,
      territory: formData.territory.trim() || assignedLeader?.territory || 'Geral',
      neighborhood: formData.neighborhood.trim() || assignedLeader?.neighborhood || undefined,
      status: formData.status,
      tags: tagsArray,
      notes: formData.notes.trim() || undefined,
      responsible: assignedLeader?.name || 'Coordenação',
      created_at: selectedContact ? selectedContact.created_at : new Date().toISOString(),
    };

    localStore.saveContact(newContact);
    reloadData();
    setIsModalOpen(false);
    success(selectedContact ? 'Contato atualizado!' : 'Contato registrado no CRM!');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Deseja excluir este contato?')) {
      localStore.deleteContact(id);
      reloadData();
      if (isDrawerOpen && selectedContact?.id === id) setIsDrawerOpen(false);
      success('Contato removido.');
    }
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = 
      c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.neighborhood && c.neighborhood.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.tags && c.tags.some(t => t.includes(searchTerm.toLowerCase())));
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesLeader = leaderFilter === 'all' || c.leader_id === leaderFilter;
    return matchesSearch && matchesStatus && matchesLeader;
  });

  const getStatusBadge = (status: CrmContact['status']) => {
    switch (status) {
      case 'multiplier': return <Badge variant="success" size="sm">Multiplicador</Badge>;
      case 'supporter': return <Badge variant="info" size="sm">Apoiador</Badge>;
      case 'contacted': return <Badge variant="warning" size="sm">Contatado</Badge>;
      case 'lead': return <Badge variant="neutral" size="sm">Lead / Prospecção</Badge>;
      case 'unresponsive': return <Badge variant="danger" size="sm">Sem Retorno</Badge>;
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-950 flex items-center gap-2">
            <Contact className="w-5 h-5 text-slate-500" />
            CRM & Base de Contatos
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastro qualificado, classificação de multiplicadores e histórico por liderança
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
          placeholder="Buscar por nome, telefone, bairro ou tag..."
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-2xs font-medium cursor-pointer"
          >
            <option value="all">Todos os Status ({contacts.length})</option>
            <option value="multiplier">Multiplicador</option>
            <option value="supporter">Apoiador</option>
            <option value="contacted">Contatado</option>
            <option value="lead">Lead</option>
            <option value="unresponsive">Sem Retorno</option>
          </select>

          <select
            value={leaderFilter}
            onChange={(e) => setLeaderFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-2xs font-medium cursor-pointer"
          >
            <option value="all">Todas as Lideranças</option>
            {leaders.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {filteredContacts.length === 0 ? (
        <EmptyState
          icon={<Contact className="w-6 h-6" />}
          title="Nenhum contato encontrado"
          description="Inicie o cadastro da base de apoiadores e multiplicadores."
          actionLabel="Adicionar Contato"
          onAction={() => handleOpenModal()}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome & Telefone</TableHead>
              <TableHead>Bairro / Território</TableHead>
              <TableHead>Liderança Vinculada</TableHead>
              <TableHead>Classificação</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell>
                  <div className="font-semibold text-slate-900">{contact.full_name}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span className="font-mono text-[11px] text-slate-700">{contact.phone}</span>
                    {contact.email && <span className="text-[11px] text-slate-400">• {contact.email}</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-medium text-slate-800">{contact.neighborhood || contact.territory}</div>
                  {contact.neighborhood && contact.territory && (
                    <div className="text-[11px] text-slate-400">{contact.territory}</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-xs font-medium text-slate-700">
                    {contact.leader_name || leaders.find(l => l.id === contact.leader_id)?.name || 'Direto'}
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(contact.status)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 flex-wrap max-w-xs">
                    {contact.tags && contact.tags.length > 0 ? (
                      contact.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          #{tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => {
                        setSelectedContact(contact);
                        setIsDrawerOpen(true);
                      }}
                      title="Ver detalhes"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenModal(contact)}
                      title="Editar"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(contact.id)}
                      title="Excluir"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
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
        description="Preencha os dados de contato e classificação política/operacional."
      >
        <form onSubmit={handleSave} className="space-y-3.5 text-left">
          <Input
            label="Nome Completo"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="Ex.: André Guimarães"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Telefone / WhatsApp"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(11) 99999-9999"
              required
            />
            <Input
              label="E-mail"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="andre@email.com"
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
              label="Território / Região"
              value={formData.territory}
              onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
              placeholder="Ex.: Orla"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Liderança Responsável"
              value={formData.leader_id}
              onChange={(e) => setFormData({ ...formData, leader_id: e.target.value })}
              options={[
                { value: '', label: 'Sem líder vinculado' },
                ...leaders.map(l => ({ value: l.id, label: `${l.name} (${l.neighborhood || l.territory})` }))
              ]}
            />

            <Select
              label="Status / Classificação"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              options={[
                { value: 'multiplier', label: 'Multiplicador (Ativo)' },
                { value: 'supporter', label: 'Apoiador' },
                { value: 'contacted', label: 'Contatado' },
                { value: 'lead', label: 'Lead / Potencial' },
                { value: 'unresponsive', label: 'Sem Retorno' },
              ]}
            />
          </div>

          <Input
            label="Tags (separadas por vírgula)"
            value={formData.tagsString}
            onChange={(e) => setFormData({ ...formData, tagsString: e.target.value })}
            placeholder="Ex.: comercio, adesivo-carro, saude"
            helperText="Útil para segmentações e envio de comunicados."
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Observações</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Preferência de horário, disponibilidade para reuniões ou ações de rua..."
              rows={2}
              className="w-full bg-white text-slate-900 text-xs rounded-lg border border-slate-200 p-2.5 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Salvar Contato
            </Button>
          </div>
        </form>
      </Modal>

      {/* Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedContact?.full_name || 'Detalhes do Contato'}
        description={`Telefone: ${selectedContact?.phone || ''}`}
      >
        {selectedContact && (
          <div className="space-y-6 text-left text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Classificação:</span>
                {getStatusBadge(selectedContact.status)}
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Liderança:</span>
                <span className="text-slate-900 font-semibold">{selectedContact.leader_name || 'Direto'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Bairro / Território:</span>
                <span className="text-slate-900 font-semibold">{selectedContact.neighborhood || selectedContact.territory}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Telefone / WhatsApp:</span>
                <span className="font-mono font-semibold text-slate-900">{selectedContact.phone}</span>
              </div>
              {selectedContact.email && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">E-mail:</span>
                  <span className="text-slate-900 font-semibold">{selectedContact.email}</span>
                </div>
              )}
            </div>

            {selectedContact.tags && selectedContact.tags.length > 0 && (
              <div>
                <div className="text-slate-700 font-semibold mb-2">Tags Associadas:</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedContact.tags.map(t => (
                    <Badge key={t} variant="neutral" size="sm">#{t}</Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedContact.notes && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-slate-700 font-semibold mb-1">Anotações:</div>
                <p className="text-slate-600 leading-relaxed">{selectedContact.notes}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};
