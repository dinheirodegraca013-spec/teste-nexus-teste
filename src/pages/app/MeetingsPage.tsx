import React, { useState } from 'react';
import { Users, Plus, Clock, MapPin, FileText, CheckSquare, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { localStore } from '../../lib/supabase';
import { Meeting } from '../../types';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';

export const MeetingsPage: React.FC = () => {
  const { organization } = useAuth();
  const { success, error: toastError } = useToast();
  const orgId = organization?.id || 'org-alpha';

  const [meetings, setMeetings] = useState<Meeting[]>(() => localStore.getMeetings(orgId));
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '18:30',
    location: '',
    responsible: '',
    status: 'scheduled' as Meeting['status'],
    minutes: '',
  });

  const reloadData = () => {
    setMeetings(localStore.getMeetings(orgId));
  };

  const handleOpenModal = (meeting?: Meeting) => {
    if (meeting) {
      setSelectedMeeting(meeting);
      setFormData({
        title: meeting.title,
        date: meeting.date,
        time: meeting.time,
        location: meeting.location,
        responsible: meeting.responsible || '',
        status: meeting.status,
        minutes: meeting.minutes || '',
      });
    } else {
      setSelectedMeeting(null);
      setFormData({
        title: '',
        date: new Date().toISOString().split('T')[0],
        time: '18:30',
        location: '',
        responsible: '',
        status: 'scheduled',
        minutes: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.location.trim()) {
      toastError('Informe Pauta/Título e Local da reunião.');
      return;
    }

    const newMeeting: Meeting = {
      id: selectedMeeting ? selectedMeeting.id : 'meet_' + Math.random().toString(36).substring(2, 9),
      organization_id: orgId,
      title: formData.title.trim(),
      date: formData.date,
      time: formData.time,
      location: formData.location.trim(),
      responsible: formData.responsible.trim() || undefined,
      status: formData.status,
      minutes: formData.minutes.trim() || undefined,
      created_at: selectedMeeting ? selectedMeeting.created_at : new Date().toISOString(),
    };

    localStore.saveMeeting(newMeeting);
    reloadData();
    setIsModalOpen(false);
    success(selectedMeeting ? 'Reunião atualizada!' : 'Reunião registrada com sucesso!');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Excluir esta reunião?')) {
      localStore.deleteMeeting(id);
      reloadData();
      success('Reunião removida.');
    }
  };

  const filteredMeetings = meetings.filter(m => 
    m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.responsible && m.responsible.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/60">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-zinc-400" />
            Reuniões & Pautas
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Alinhamento de coordenadores, comitês setoriais e atas de decisões
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => handleOpenModal()}
          leftIcon={<Plus className="w-4 h-4" />}
          className="text-xs"
        >
          Nova Reunião
        </Button>
      </div>

      <SearchInput
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Buscar por pauta, local ou responsável..."
        className="w-full sm:w-80"
      />

      {filteredMeetings.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6" />}
          title="Nenhuma reunião registrada"
          description="Agende reuniões de coordenação e registre decisões estratégicas."
          actionLabel="Agendar Reunião"
          onAction={() => handleOpenModal()}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pauta / Título</TableHead>
              <TableHead>Data & Horário</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMeetings.map((meet) => (
              <TableRow key={meet.id}>
                <TableCell>
                  <div className="font-medium text-zinc-100">{meet.title}</div>
                  {meet.minutes && <div className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">{meet.minutes}</div>}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-200 font-mono">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{new Date(meet.date + 'T12:00:00').toLocaleDateString('pt-BR')} às {meet.time}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{meet.location}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-zinc-300">{meet.responsible || 'Coordenação'}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={meet.status === 'completed' ? 'success' : meet.status === 'scheduled' ? 'info' : 'danger'} size="sm">
                    {meet.status === 'completed' ? 'Realizada' : meet.status === 'scheduled' ? 'Agendada' : 'Cancelada'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => handleOpenModal(meet)}
                      title="Editar"
                      className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(meet.id)}
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
        title={selectedMeeting ? 'Editar Reunião' : 'Nova Reunião / Pauta'}
        description="Defina pauta, local e responsável pelo alinhamento."
      >
        <form onSubmit={handleSave} className="space-y-3.5 text-left">
          <Input
            label="Pauta Principal"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex.: Alinhamento com Lideranças do Bairro Macuco"
            required
          />

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
            label="Local"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Ex.: Comitê Central / Sala de Reunião 2"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Responsável pela Pauta"
              value={formData.responsible}
              onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
              placeholder="Ex.: Roberto Lima"
            />
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              options={[
                { value: 'scheduled', label: 'Agendada' },
                { value: 'completed', label: 'Realizada' },
                { value: 'cancelled', label: 'Cancelada' },
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-300">Ata / Decisões e Encaminhamentos</label>
            <textarea
              value={formData.minutes}
              onChange={(e) => setFormData({ ...formData, minutes: e.target.value })}
              placeholder="Principais deliberações e tarefas atribuídas..."
              rows={3}
              className="w-full bg-zinc-900 text-zinc-100 text-xs rounded-lg border border-zinc-800 p-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Salvar Reunião
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
