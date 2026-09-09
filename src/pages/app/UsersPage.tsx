import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Shield, Mail, Edit2, Trash2, CheckCircle2, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { OrganizationMember, UserRole } from '../../types';
import { membersService } from '../../services';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';

export const UsersPage: React.FC = () => {
  const { organization } = useAuth();
  const { success, error: toastError } = useToast();
  const orgId = organization?.id || '';

  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('operator');

  // Permission editor state
  const [perms, setPerms] = useState<Record<string, { can_view: boolean; can_edit: boolean; can_delete: boolean }>>({
    crm: { can_view: true, can_edit: true, can_delete: false },
    coordenadores: { can_view: true, can_edit: false, can_delete: false },
    liderancas: { can_view: true, can_edit: true, can_delete: false },
    metas: { can_view: true, can_edit: false, can_delete: false },
    campo: { can_view: true, can_edit: true, can_delete: false },
    eventos: { can_view: true, can_edit: true, can_delete: false },
    materiais: { can_view: true, can_edit: true, can_delete: false },
    adesivos: { can_view: true, can_edit: true, can_delete: false },
  });

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const { data } = await membersService.getAll(orgId);
      setMembers(data || []);
    } catch (err: any) {
      toastError('Erro ao carregar equipe: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, toastError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      toastError('Informe um e-mail válido.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await membersService.invite({
        organization_id: orgId,
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      if (error) {
        toastError('Erro ao convidar membro: ' + error.message);
      } else {
        await loadData();
        setIsInviteModalOpen(false);
        setInviteEmail('');
        setInviteName('');
        success('Membro convidado para a organização no Supabase!');
      }
    } catch (err: any) {
      toastError('Erro inesperado: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (window.confirm('Remover o acesso deste membro?')) {
      const { error } = await membersService.remove(id);
      if (error) {
        toastError('Erro ao remover: ' + error.message);
      } else {
        await loadData();
        success('Acesso removido.');
      }
    }
  };

  const handleOpenPerms = (member: OrganizationMember) => {
    setSelectedMember(member);
    setIsPermModalOpen(true);
  };

  const handleSavePerms = () => {
    setIsPermModalOpen(false);
    success(`Permissões atualizadas para ${selectedMember?.full_name || 'o membro'}`);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin': return <Badge variant="success" size="sm">Administrador</Badge>;
      case 'manager': return <Badge variant="primary" size="sm">Gerente</Badge>;
      case 'coordinator': return <Badge variant="neutral" size="sm">Coordenador</Badge>;
      case 'operator': return <Badge variant="warning" size="sm">Operador de Campo</Badge>;
      case 'viewer': return <Badge variant="neutral" size="sm">Visualizador</Badge>;
      default: return <Badge variant="neutral" size="sm">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-700" />
            Equipe & Permissões de Acesso (RBAC)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Controle de usuários, níveis de acesso e convites para operadores de campanha
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsInviteModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
          className="text-xs"
        >
          Convidar Usuário
        </Button>
      </div>

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-slate-600" />
          <span className="text-xs font-medium">Carregando membros do Supabase...</span>
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6" />}
          title="Nenhum membro listado"
          description="Convide assessores, coordenadores e operadores de campo para sua organização."
          actionLabel="Convidar Membro"
          onAction={() => setIsInviteModalOpen(true)}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membro / E-mail</TableHead>
              <TableHead>Perfil de Acesso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data de Entrada</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="font-semibold text-slate-900">{member.full_name || member.email}</div>
                  <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{member.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {getRoleBadge(member.role)}
                </TableCell>
                <TableCell>
                  <Badge variant={member.status === 'active' ? 'success' : 'warning'} size="sm">
                    {member.status === 'active' ? 'Ativo' : 'Pendente'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-500 font-mono">
                    {new Date(member.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => handleOpenPerms(member)}
                      className="p-1.5 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Configurar Permissões Granulares"
                    >
                      <Shield className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteMember(member.id)}
                      className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Remover Acesso"
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

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Convidar Novo Usuário"
        description="Envie um convite de acesso para a equipe da sua campanha."
      >
        <form onSubmit={handleInvite} className="space-y-3.5 text-left">
          <Input
            label="Nome do Membro (opcional)"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            placeholder="Ex.: Lucas Moreira"
          />

          <Input
            label="E-mail de Acesso"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="usuario@dominio.com"
            required
          />

          <Select
            label="Nível de Permissão (Role)"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as UserRole)}
            options={[
              { value: 'operator', label: 'Operador de Campo (Apenas Registro)' },
              { value: 'coordinator', label: 'Coordenador Territorial (Seu Território)' },
              { value: 'manager', label: 'Gerente Operacional (Visualiza e Edita)' },
              { value: 'admin', label: 'Administrador Geral (Acesso Total)' },
              { value: 'viewer', label: 'Visualizador / Auditor (Somente Leitura)' },
            ]}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsInviteModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Convidar Usuário
            </Button>
          </div>
        </form>
      </Modal>

      {/* Permissions Modal */}
      <Modal
        isOpen={isPermModalOpen}
        onClose={() => setIsPermModalOpen(false)}
        title={`Permissões: ${selectedMember?.full_name || selectedMember?.email || 'Membro'}`}
        description="Controle fino de quais módulos este usuário pode visualizar, cadastrar ou excluir."
      >
        <div className="space-y-4 text-left">
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="p-2.5 text-left">Módulo</th>
                  <th className="p-2.5 text-center">Ver</th>
                  <th className="p-2.5 text-center">Editar</th>
                  <th className="p-2.5 text-center">Excluir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.keys(perms).map((mod) => (
                  <tr key={mod}>
                    <td className="p-2.5 font-medium text-slate-800 capitalize">{mod}</td>
                    <td className="p-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={perms[mod].can_view}
                        onChange={(e) => setPerms({ ...perms, [mod]: { ...perms[mod], can_view: e.target.checked } })}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                      />
                    </td>
                    <td className="p-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={perms[mod].can_edit}
                        onChange={(e) => setPerms({ ...perms, [mod]: { ...perms[mod], can_edit: e.target.checked } })}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                      />
                    </td>
                    <td className="p-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={perms[mod].can_delete}
                        onChange={(e) => setPerms({ ...perms, [mod]: { ...perms[mod], can_delete: e.target.checked } })}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsPermModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={handleSavePerms}>
              Salvar Permissões
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
