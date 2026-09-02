import React, { useState } from 'react';
import { Calendar, Plus, MapPin, Clock, Users, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { localStore } from '../../lib/supabase';
import { OperationEvent } from '../../types';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';

export const EventsPage: React.FC = () => {
  const { organization } = useAuth();
  const { success, error: toastError } = useToast();
  const orgId = organization?.id || 'org-alpha';

  const [events, setEvents] = useState<OperationEvent[]>(() => localStore.getEvents(orgId));
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<OperationEvent | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'Plenária',
    date: new Date().toISOString().split('T')[0],
    time: '19:00',
    location: '',
    territory: '',
    expected_attendees: 100,
    confirmed_attendees: 0,
    status: 'scheduled' as OperationEvent['status'],
  });

  const reloadData = () => {
    setEvents(localStore.getEvents(orgId));
  };

  const handleOpenModal = (event?: OperationEvent) => {
    if (event) {
      setSelectedEvent(event);
      setFormData({
        title: event.title,
        description: event.description || '',
        event_type: event.event_type,
        date: event.date,
        time: event.time,
        location: event.location,
        territory: event.territory || '',
        expected_attendees: event.expected_attendees || 50,
        confirmed_attendees: event.confirmed_attendees || 0,
        status: event.status,
      });
    } else {
      setSelectedEvent(null);
      setFormData({
        title: '',
        description: '',
        event_type: 'Plenária',
        date: new Date().toISOString().split('T')[0],
        time: '19:00',
        location: '',
        territory: '',
        expected_attendees: 100,
        confirmed_attendees: 0,
        status: 'scheduled',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.location.trim()) {
      toastError('Preencha Título e Local do evento.');
      return;
    }

    const newEvent: OperationEvent = {
      id: selectedEvent ? selectedEvent.id : 'evt_' + Math.random().toString(36).substring(2, 9),
      organization_id: orgId,
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      event_type: formData.event_type,
      date: formData.date,
      time: formData.time,
      location: formData.location.trim(),
      territory: formData.territory.trim() || undefined,
      expected_attendees: Number(formData.expected_attendees) || 0,
      confirmed_attendees: Number(formData.confirmed_attendees) || 0,
      status: formData.status,
      created_at: selectedEvent ? selectedEvent.created_at : new Date().toISOString(),
    };

    localStore.saveEvent(newEvent);
    reloadData();
    setIsModalOpen(false);
    success(selectedEvent ? 'Evento atualizado!' : 'Evento cadastrado com sucesso!');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Excluir este evento?')) {
      localStore.deleteEvent(id);
      reloadData();
      success('Evento removido.');
    }
  };

  const filteredEvents = events.filter(e => {
    const matchesSearch = 
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.territory && e.territory.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'all' || e.event_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/60">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-zinc-400" />
            Eventos & Mobilizações
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Plenárias, caminhadas, comícios e controle de público esperado
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => handleOpenModal()}
          leftIcon={<Plus className="w-4 h-4" />}
          className="text-xs"
        >
          Novo Evento
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por título, local ou território..."
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 px-3 text-zinc-200 text-xs focus:outline-none"
          >
            <option value="all">Todos os Tipos ({events.length})</option>
            <option value="Plenária">Plenária</option>
            <option value="Caminhada">Caminhada</option>
            <option value="Comício">Comício</option>
            <option value="Visita Técnica">Visita Técnica</option>
            <option value="Adesivaço">Adesivaço</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filteredEvents.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-6 h-6" />}
          title="Nenhum evento agendado"
          description="Cadastre as próximas mobilizações para convocar lideranças e apoiadores."
          actionLabel="Agendar Evento"
          onAction={() => handleOpenModal()}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evento & Tipo</TableHead>
              <TableHead>Data & Horário</TableHead>
              <TableHead>Local & Território</TableHead>
              <TableHead>Estimativa de Público</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.map((evt) => (
              <TableRow key={evt.id}>
                <TableCell>
                  <div className="font-medium text-zinc-100">{evt.title}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">{evt.event_type}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-200 font-mono">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{new Date(evt.date + 'T12:00:00').toLocaleDateString('pt-BR')} às {evt.time}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-200">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{evt.location}</span>
                  </div>
                  {evt.territory && <div className="text-[11px] text-zinc-500 mt-0.5">{evt.territory}</div>}
                </TableCell>
                <TableCell>
                  <div className="font-mono text-xs">
                    <span className="font-semibold text-emerald-400">{evt.confirmed_attendees}</span>
                    <span className="text-zinc-500"> / {evt.expected_attendees} pessoas</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={evt.status === 'completed' ? 'success' : evt.status === 'scheduled' ? 'info' : 'danger'} size="sm">
                    {evt.status === 'completed' ? 'Realizado' : evt.status === 'scheduled' ? 'Confirmado' : 'Cancelado'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => handleOpenModal(evt)}
                      title="Editar"
                      className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(evt.id)}
                      title="Excluir"
                      className="p-1.5 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800"
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

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedEvent ? 'Editar Evento' : 'Novo Evento / Mobilização'}
        description="Registre data, local e expectativa de presentes."
      >
        <form onSubmit={handleSave} className="space-y-3.5 text-left">
          <Input
            label="Título do Evento"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex.: Grande Plenária da Zona Leste"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Tipo de Evento"
              value={formData.event_type}
              onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
              options={[
                { value: 'Plenária', label: 'Plenária / Reunião Geral' },
                { value: 'Caminhada', label: 'Caminhada / Corpo a Corpo' },
                { value: 'Comício', label: 'Comício / Grande Ato' },
                { value: 'Visita Técnica', label: 'Visita Técnica / Lideranças' },
                { value: 'Adesivaço', label: 'Adesivaço / Pit Stop' },
              ]}
            />
            <Input
              label="Território / Bairro"
              value={formData.territory}
              onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
              placeholder="Ex.: Gonzaga"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Data"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
            <Input
              label="Horário"
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              required
            />
          </div>

          <Input
            label="Endereço / Local"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Ex.: Salão Nobre do Clube Sirio - Av. Ana Costa, 200"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Expectativa de Público"
              type="number"
              value={formData.expected_attendees}
              onChange={(e) => setFormData({ ...formData, expected_attendees: Number(e.target.value) })}
            />
            <Input
              label="Confirmados / Presentes"
              type="number"
              value={formData.confirmed_attendees}
              onChange={(e) => setFormData({ ...formData, confirmed_attendees: Number(e.target.value) })}
            />
          </div>

          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            options={[
              { value: 'scheduled', label: 'Agendado / Confirmado' },
              { value: 'completed', label: 'Realizado' },
              { value: 'cancelled', label: 'Cancelado' },
            ]}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Salvar Evento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
