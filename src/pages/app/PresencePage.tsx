import React, { useState } from 'react';
import { UserCheck, Plus, Clock, Trash2, CheckCircle2, FileDown, Image as ImageIcon, Eye, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { localStore } from '../../lib/supabase';
import { PresenceLog } from '../../types';
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
  const orgId = organization?.id || 'org-alpha';

  const [presenceLogs, setPresenceLogs] = useState<PresenceLog[]>(() => localStore.getPresenceLogs(orgId));
  const events = localStore.getEvents(orgId);
  const meetings = localStore.getMeetings(orgId);

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    reference_name: events[0]?.title || 'Ato Público',
    status: 'present' as PresenceLog['status'],
    photo_url: '',
    attachment_name: '',
  });

  const reloadData = () => {
    setPresenceLogs(localStore.getPresenceLogs(orgId));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toastError('Informe o nome do participante.');
      return;
    }

    try {
      localStore.savePresenceLog({
        id: 'pres_' + Math.random().toString(36).substring(2, 9),
        organization_id: orgId,
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        reference_name: formData.reference_name,
        photo_url: formData.photo_url || undefined,
        attachment_name: formData.attachment_name || undefined,
        status: formData.status,
        created_at: new Date().toISOString(),
      });

      reloadData();
      setIsModalOpen(false);
      success('Presença registrada!');
    } catch {
      toastError('Erro ao registrar presença. Tente novamente.');
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Excluir este registro?')) {
      localStore.deletePresenceLog(id);
      reloadData();
      success('Registro de presença removido.');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/60">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-zinc-400" />
            Controle de Presença & Check-ins
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Registro de confirmação de presença em eventos, plenárias e atividades de rua
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setFormData({
              name: '',
              phone: '',
              reference_name: events[0]?.title || 'Atividade Operacional',
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

      {filteredLogs.length === 0 ? (
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
              <TableHead>Contato</TableHead>
              <TableHead>Atividade / Evento</TableHead>
              <TableHead>Horário do Check-in</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    {log.photo_url ? (
                      <button
                        type="button"
                        onClick={() => setPreviewImage({ url: log.photo_url!, title: `${log.name} - ${log.reference_name || 'Presença'}` })}
                        className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-zinc-700 relative group cursor-pointer"
                        title="Clique para ver foto"
                      >
                        <img
                          src={log.photo_url}
                          alt="Foto"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                      </button>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold text-xs shrink-0 border border-zinc-700">
                        {log.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="font-medium text-zinc-100">{log.name}</div>
                  </div>
                </TableCell>
                <TableCell>
                  {log.photo_url ? (
                    <button
                      type="button"
                      onClick={() => setPreviewImage({ url: log.photo_url!, title: `${log.name} - ${log.reference_name || 'Presença'}` })}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Ver Foto</span>
                    </button>
                  ) : (
                    <span className="text-xs text-zinc-500">Sem anexo</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-xs font-mono text-zinc-300">{log.phone || '—'}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-zinc-200">{log.reference_name || 'Geral'}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    <span>{new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {new Date(log.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={log.status === 'present' ? 'success' : 'warning'} size="sm">
                    {log.status === 'present' ? 'Presente' : 'Justificado'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <button
                    onClick={() => handleDelete(log.id)}
                    title="Excluir"
                    className="p-1.5 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
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
        title="Check-in Manual de Presença"
        description="Confirme a participação de uma liderança ou apoiador."
      >
        <form onSubmit={handleSave} className="space-y-3.5 text-left">
          <Input
            label="Nome do Participante"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex.: Paulo Henrique"
            required
            autoFocus
          />

          <Input
            label="Telefone / WhatsApp"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="(11) 98888-7777"
          />

          <Input
            label="Evento ou Reunião"
            value={formData.reference_name}
            onChange={(e) => setFormData({ ...formData, reference_name: e.target.value })}
            placeholder="Ex.: Plenária Central"
            required
          />

          <FileUpload
            label="Foto / Comprovante de Presença (Opcional)"
            helperText="Foto do participante, selfie ou registro da reunião"
            value={formData.photo_url || null}
            fileName={formData.attachment_name || null}
            onChange={(dataUrl, meta) => {
              setFormData({
                ...formData,
                photo_url: dataUrl || '',
                attachment_name: meta?.name || '',
              });
            }}
          />

          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            options={[
              { value: 'present', label: 'Presente no Local' },
              { value: 'justified', label: 'Ausência Justificada' },
            ]}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Confirmar Check-in
            </Button>
          </div>
        </form>
      </Modal>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative max-w-xl w-full bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between text-white">
              <span className="text-xs font-semibold truncate pr-4">{previewImage.title}</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 flex items-center justify-center bg-black/60 max-h-[75vh] overflow-auto">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[70vh] w-auto object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
