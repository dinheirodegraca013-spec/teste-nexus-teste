import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Clock, MapPin, FileText, CheckSquare, Edit2, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Meeting } from '../../types';
import { meetingsService } from '../../services';
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
  const orgId = organization?.id || '';

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const { data } = await meetingsService.getAll(orgId);
      setMeetings(data || []);
    } catch (err: any) {
      toastError('Erro ao carregar reuniões: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, toastError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.location.trim()) {
      toastError('Informe Pauta/Título e Local da reunião.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedMeeting) {
        const { error } = await meetingsService.update(selectedMeeting.id, {
          title: formData.title.trim(),
          date: formData.date,
          time: formData.time,
          location: formData.location.trim(),
          responsible: formData.responsible.trim() || undefined,
          status: formData.status,
          minutes: formData.minutes.trim() || undefined,
        });

        if (error) {
          toastError('Erro ao atualizar reunião: ' + error.message);
        } else {
          success('Reunião atualizada!');
          await loadData();
          setIsModalOpen(false);
        }
      } else {
        const { error } = await meetingsService.create({
          organization_id: orgId,
          title: formData.title.trim(),
          date: formData.date,
          time: formData.time,
          location: formData.location.trim(),
          responsible: formData.responsible.trim() || undefined,
          status: formData.status,
          minutes: formData.minutes.trim() || undefined,
        });

        if (error) {
          toastError('Erro ao registrar reunião: ' + error.message);
        } else {
          success('Reunião registrada no Supabase com sucesso!');
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
    if (window.confirm('Excluir esta reunião?')) {
      const { error } = await meetingsService.delete(id);
      if (error) {
        toastError('Erro ao excluir reunião: ' + error.message);
      } else {
        await loadData();
        success('Reunião removida.');
      }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-700" />
            Reuniões & Alinhamento Político
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pautas, atas, deliberações e agenda de reuniões internas e territoriais
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
        placeholder="Buscar reunião, local ou coordenador..."
        className="w-full sm:w-80"
      />

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-slate-600" />
          <span className="text-xs font-medium">Carregando reuniões do Supabase...</span>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6" />}
          title="Nenhuma reunião agendada"
          description="Cadastre as reuniões de coordenação, plenárias de bairro e encontros estratégicos."
          actionLabel="Agendar Reunião"
          onAction={() => handleOpenModal()}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pauta / Título</TableHead>
              <TableHead>Data & Horário</TableHead>
              <TableHead>Local / Endereço</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMeetings.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="font-semibold text-slate-900">{m.title}</div>
                  {m.minutes && <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{m.minutes}</div>}
                </TableCell>
                <TableCell>
                  <div className="text-xs font-mono text-slate-700">{m.date} às {m.time}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{m.location}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-700">{m.responsible || 'Coordenação'}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={m.status === 'completed' ? 'success' : m.status === 'scheduled' ? 'primary' : 'neutral'} size="sm">
                    {m.status === 'completed' ? 'Realizada' : m.status === 'scheduled' ? 'Agendada' : 'Cancelada'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => handleOpenModal(m)}
                      className="p-1.5 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
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
        title={selectedMeeting ? 'Editar Reunião' : 'Agendar Nova Reunião'}
        description="Registre as informações e deliberações no Supabase."
      >
        <form onSubmit={handleSave} className="space-y-3.5 text-left">
          <Input
            label="Título / Pauta Principal"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex.: Alinhamento com Lideranças da Zona Leste"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Local da Reunião"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Ex.: Comitê Central / Associação de Moradores"
              required
            />
            <Input
              label="Responsável / Coordenador"
              value={formData.responsible}
              onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
              placeholder="Ex.: Coord. Geral"
            />
          </div>

          <Select
            label="Status da Reunião"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            options={[
              { value: 'scheduled', label: 'Agendada' },
              { value: 'completed', label: 'Realizada' },
              { value: 'canceled', label: 'Cancelada' },
            ]}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">Ata / Deliberações & Encaminhamentos</label>
            <textarea
              value={formData.minutes}
              onChange={(e) => setFormData({ ...formData, minutes: e.target.value })}
              placeholder="Pontos acordados, metas combinadas, distribuição de materiais..."
              rows={4}
              className="w-full bg-white text-slate-900 text-xs rounded-lg border border-slate-200 p-3 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Salvar Reunião
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
