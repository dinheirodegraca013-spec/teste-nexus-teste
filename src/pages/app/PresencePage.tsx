import React, { useState, useEffect, useCallback } from 'react';
import { UserCheck, Plus, Clock, Trash2, CheckCircle2, FileDown, Image as ImageIcon, Eye, X, Loader2, Camera } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { PresenceLog, CampaignEvent, Meeting } from '../../types';
import { presenceService, eventsService, meetingsService } from '../../services';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { FileUpload } from '../../components/ui/FileUpload';
import { EmptyState } from '../../components/ui/EmptyState';

export const PresencePage: React.FC = () => {
  const { organization } = useAuth();
  const { success, error: toastError } = useToast();
  const orgId = organization?.id || '';

  const [presenceLogs, setPresenceLogs] = useState<PresenceLog[]>([]);
  const [events, setEvents] = useState<CampaignEvent[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    reference_name: 'Ato Público / Reunião',
    status: 'present' as PresenceLog['status'],
    photo_url: '',
    attachment_name: '',
  });

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const [logsRes, eventsRes, meetingsRes] = await Promise.all([
        presenceService.getLogs(orgId),
        eventsService.getAll(orgId),
        meetingsService.getAll(orgId),
      ]);
      setPresenceLogs(logsRes.data || []);
      setEvents(eventsRes.data || []);
      setMeetings(meetingsRes.data || []);
    } catch (err: any) {
      toastError('Erro ao carregar presença: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, toastError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toastError('Informe o nome do participante.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await presenceService.createLog({
        organization_id: orgId,
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        reference_name: formData.reference_name,
        photo_url: formData.photo_url || undefined,
        attachment_name: formData.attachment_name || undefined,
        status: formData.status,
      });

      if (error) {
        toastError('Erro ao registrar presença: ' + error.message);
      } else {
        await loadData();
        setIsModalOpen(false);
        success('Presença registrada no Supabase com sucesso!');
      }
    } catch (err: any) {
      toastError('Erro ao registrar presença: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir este registro?')) {
      const { error } = await presenceService.deleteLog(id);
      if (error) {
        toastError('Erro ao excluir: ' + error.message);
      } else {
        await loadData();
        success('Registro de presença removido.');
      }
    }
  };

  const filteredLogs = presenceLogs.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.phone && p.phone.includes(searchTerm)) ||
    (p.reference_name && p.reference_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-slate-700" />
            Controle de Presença & Check-ins
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro de confirmação de presença em eventos, plenárias e atividades com upload de fotos
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setFormData({
              name: '',
              phone: '',
              reference_name: events[0]?.title || meetings[0]?.title || 'Atividade Operacional',
              status: 'present',
              photo_url: '',
              attachment_name: '',
            });
            setIsModalOpen(true);
          }}
          leftIcon={<Plus className="w-4 h-4" />}
          className="text-xs"
        >
          Check-in de Presença
        </Button>
      </div>

      <SearchInput
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Buscar participante, telefone ou evento..."
        className="w-full sm:w-80"
      />

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-slate-600" />
          <span className="text-xs font-medium">Carregando presenças do Supabase...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          icon={<UserCheck className="w-6 h-6" />}
          title="Nenhum check-in registrado"
          description="Os check-ins feitos no celular ou no painel aparecerão listados aqui."
          actionLabel="Registrar Check-in"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Participante</TableHead>
              <TableHead>Comprovante / Foto</TableHead>
              <TableHead>Evento / Reunião</TableHead>
              <TableHead>Data & Hora</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <div className="font-medium text-slate-900">{log.name}</div>
                  {log.phone && <div className="text-xs font-mono text-slate-500 mt-0.5">{log.phone}</div>}
                </TableCell>
                <TableCell>
                  {log.photo_url ? (
                    <button
                      type="button"
                      onClick={() => setPreviewImage({ url: log.photo_url!, title: `Comprovante - ${log.name}` })}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition-colors cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Ver Foto</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-700">{log.reference_name || 'Geral'}</span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-500 font-mono">
                    {new Date(log.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={log.status === 'present' ? 'success' : 'neutral'} size="sm">
                    {log.status === 'present' ? 'Presente' : log.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modal with image upload button */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Check-in de Presença"
        description="Confirmação de presença em eventos, plenárias ou comícios."
      >
        <form onSubmit={handleSave} className="space-y-3.5 text-left">
          <Input
            label="Nome do Participante"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex.: Carlos Souza"
            required
          />

          <Input
            label="Telefone / WhatsApp (opcional)"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="(11) 99999-9999"
          />

          <Input
            label="Evento / Plenária / Reunião"
            value={formData.reference_name}
            onChange={(e) => setFormData({ ...formData, reference_name: e.target.value })}
            placeholder="Ex.: Plenária Central 2026"
            required
          />

          {/* Upload Button */}
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-indigo-600" />
              <span>Upload de Imagem: Foto da Presença / Lista Assinada</span>
            </label>
            <FileUpload
              accept="image/*"
              maxSizeMB={10}
              onFileSelected={(file, dataUrl) => {
                setFormData(prev => ({
                  ...prev,
                  photo_url: dataUrl,
                  attachment_name: file.name,
                }));
              }}
              onFileRemoved={() => {
                setFormData(prev => ({
                  ...prev,
                  photo_url: '',
                  attachment_name: '',
                }));
              }}
              currentFileName={formData.attachment_name || undefined}
              helperText="Carregue foto do participante ou da lista física de presença."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Salvar Check-in
            </Button>
          </div>
        </form>
      </Modal>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">{previewImage.title}</h4>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center max-h-[70vh]">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
