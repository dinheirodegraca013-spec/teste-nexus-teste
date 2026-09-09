import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Plus, MapPin, Clock, Users, Edit2, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { CampaignEvent } from '../../types';
import { eventsService } from '../../services';
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
  const orgId = organization?.id || '';

  const [events, setEvents] = useState<CampaignEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CampaignEvent | null>(null);

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
    status: 'scheduled' as CampaignEvent['status'],
  });

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const { data } = await eventsService.getAll(orgId);
      setEvents(data || []);
    } catch (err: any) {
      toastError('Erro ao carregar eventos: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, toastError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenModal = (event?: CampaignEvent) => {
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.location.trim()) {
      toastError('Preencha Título e Local do evento.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedEvent) {
        const { error } = await eventsService.update(selectedEvent.id, {
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
        });

        if (error) {
          toastError('Erro ao atualizar evento: ' + error.message);
        } else {
          success('Evento atualizado!');
          await loadData();
          setIsModalOpen(false);
        }
      } else {
        const { error } = await eventsService.create({
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
        });

        if (error) {
          toastError('Erro ao registrar evento: ' + error.message);
        } else {
          success('Evento cadastrado no Supabase com sucesso!');
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
    if (window.confirm('Excluir este evento?')) {
      const { error } = await eventsService.delete(id);
      if (error) {
        toastError('Erro ao remover evento: ' + error.message);
      } else {
        await loadData();
        success('Evento removido.');
      }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-700" />
            Agenda de Eventos & Comícios
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organização dos comícios, carreatas, caminhadas e plenárias de mobilização
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

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar evento, local ou território..."
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
          <span className="text-slate-500">Tipo:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-slate-800 text-xs focus:outline-none"
          >
            <option value="all">Todos os tipos ({events.length})</option>
            <option value="Comício">Comício</option>
            <option value="Carreata">Carreata</option>
            <option value="Caminhada">Caminhada</option>
            <option value="Plenária">Plenária</option>
            <option value="Bandeiraço">Bandeiraço</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-slate-600" />
          <span className="text-xs font-medium">Carregando eventos do Supabase...</span>
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-6 h-6" />}
          title="Nenhum evento encontrado"
          description="Cadastre comícios, caminhadas ou carreatas da campanha."
          actionLabel="Criar Evento"
          onAction={() => handleOpenModal()}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evento & Tipo</TableHead>
              <TableHead>Data & Horário</TableHead>
              <TableHead>Local & Território</TableHead>
              <TableHead>Público Estimado</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.map((evt) => (
              <TableRow key={evt.id}>
                <TableCell>
                  <div className="font-semibold text-slate-900">{evt.title}</div>
                  <span className="inline-block mt-0.5 text-[10px] uppercase font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    {evt.event_type}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-mono text-slate-700">{evt.date}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{evt.time}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{evt.location}</span>
                  </div>
                  {evt.territory && <div className="text-[11px] text-slate-500 mt-0.5">{evt.territory}</div>}
                </TableCell>
                <TableCell>
                  <div className="text-xs font-semibold text-slate-900">
                    {evt.confirmed_attendees || 0} <span className="font-normal text-slate-500">/ {evt.expected_attendees || 0}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={evt.status === 'completed' ? 'success' : evt.status === 'scheduled' ? 'primary' : 'neutral'} size="sm">
                    {evt.status === 'completed' ? 'Realizado' : evt.status === 'scheduled' ? 'Confirmado' : 'Cancelado'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => handleOpenModal(evt)}
                      className="p-1.5 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(evt.id)}
                      className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Excluir"
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
        title={selectedEvent ? 'Editar Evento' : 'Novo Evento de Campanha'}
        description="Salve no Supabase os dados e a estimativa de público."
      >
        <form onSubmit={handleSave} className="space-y-3.5 text-left">
          <Input
            label="Nome do Evento"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex.: Grande Caminhada no Bairro Gonzaga"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Tipo de Evento"
              value={formData.event_type}
              onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
              options={[
                { value: 'Comício', label: 'Comício' },
                { value: 'Caminhada', label: 'Caminhada' },
                { value: 'Carreata', label: 'Carreata' },
                { value: 'Plenária', label: 'Plenária' },
                { value: 'Bandeiraço', label: 'Bandeiraço' },
                { value: 'Encontro Temático', label: 'Encontro Temático' },
              ]}
            />

            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              options={[
                { value: 'scheduled', label: 'Agendado / Confirmado' },
                { value: 'completed', label: 'Realizado' },
                { value: 'canceled', label: 'Cancelado' },
              ]}
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
              label="Horário de Início"
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Local / Ponto de Concentração"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Ex.: Praça da Independência"
              required
            />
            <Input
              label="Território / Região"
              value={formData.territory}
              onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
              placeholder="Ex.: Gonzaga / Zona Leste"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Público Estimado (Meta)"
              type="number"
              value={formData.expected_attendees}
              onChange={(e) => setFormData({ ...formData, expected_attendees: Number(e.target.value) })}
            />
            <Input
              label="Público Confirmado / Presente"
              type="number"
              value={formData.confirmed_attendees}
              onChange={(e) => setFormData({ ...formData, confirmed_attendees: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">Orientações & Detalhes da Ação</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Pontos de parada, distribuição de materiais, carro de som..."
              rows={3}
              className="w-full bg-white text-slate-900 text-xs rounded-lg border border-slate-200 p-3 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Salvar Evento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
