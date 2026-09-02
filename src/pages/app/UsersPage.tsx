import React, { useState } from 'react';
import { Users, Plus, Shield, Mail, Edit2, Trash2, CheckCircle2, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { localStore } from '../../lib/supabase';
import { OrganizationMember, UserRole, UserModulePermission } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

export const UsersPage: React.FC = () => {
  const { organization } = useAuth();
  const { success, error: toastError } = useToast();
  const orgId = organization?.id || 'org-alpha';

  const [members, setMembers] = useState<OrganizationMember[]>(() => localStore.getMembers(orgId));
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

  const reloadData = () => {
    setMembers(localStore.getMembers(orgId));
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      toastError('Informe um e-mail válido.');
      return;
    }

    localStore.saveMember({
      id: 'mem_' + Math.random().toString(36).substring(2, 9),
      organization_id: orgId,
      user_id: 'usr_' + Math.random().toString(36).substring(2, 9),
      role: inviteRole,
      status: 'active',
      email: inviteEmail.trim(),
      full_name: inviteName.trim() || inviteEmail.split('@')[0],
      created_at: new Date().toISOString(),
    });

    reloadData();
    setIsInviteModalOpen(false);
    setInviteEmail('');
    setInviteName('');
    success('Membro convidado para a organização!');
  };

  const handleDeleteMember = (id: string) => {
    if (window.confirm('Remover o acesso deste membro?')) {
      localStore.deleteMember(id);
      reloadData();
      success('Acesso removido.');
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
      case 'manager': return <Badge variant="info" size="sm">Gerente</Badge>;
      case 'coordinator': return <Badge variant="neutral" size="sm">Coordenador</Badge>;
      case 'operator': return <Badge variant="warning" size="sm">Operador de Campo</Badge>;
      case 'viewer': return <Badge variant="neutral" size="sm">Visualizador</Badge>;
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/60">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-zinc-400" />
            Usuários & Controle de Acesso
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Gerenciamento de membros da equipe, papéis e permissões granulares por módulo
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsInviteModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
          className="text-xs"
        >
          Convidar Membro
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Membro & E-mail</TableHead>
            <TableHead>Papel na Organização</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Membro desde</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((mem) => (
            <TableRow key={mem.id}>
              <TableCell>
                <div className="font-medium text-zinc-100">{mem.full_name || 'Usuário'}</div>
                <div className="text-xs text-zinc-400 font-mono mt-0.5">{mem.email}</div>
              </TableCell>
              <TableCell>
                {getRoleBadge(mem.role)}
              </TableCell>
              <TableCell>
                <Badge variant={mem.status === 'active' ? 'success' : 'neutral'} size="sm">
                  {mem.status === 'active' ? 'Ativo' : 'Pendente'}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-xs font-mono text-zinc-400">
                  {new Date(mem.created_at).toLocaleDateString('pt-BR')}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => handleOpenPerms(mem)}
                    title="Permissões por Módulo"
                    className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteMember(mem.id)}
                    title="Remover"
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

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Convidar Novo Membro"
        description="Envie convite de acesso para a equipe da sua organização."
      >
        <form onSubmit={handleInvite} className="space-y-3.5 text-left">
          <Input
            label="Nome Completo"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            placeholder="Ex.: Juliana Moreira"
          />

          <Input
            label="E-mail de Acesso *"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="juliana@nexus.com.br"
            required
            autoFocus
          />

          <Select
            label="Papel / Nível de Acesso"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as any)}
            options={[
              { value: 'admin', label: 'Administrador (Acesso Total)' },
              { value: 'manager', label: 'Gerente Operacional' },
              { value: 'coordinator', label: 'Coordenador Regional' },
              { value: 'operator', label: 'Operador de Campo (Registro Rápido)' },
              { value: 'viewer', label: 'Visualizador (Somente Leitura)' },
            ]}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsInviteModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Enviar Convite
            </Button>
          </div>
        </form>
      </Modal>

      {/* Module Permissions Modal */}
      <Modal
        isOpen={isPermModalOpen}
        onClose={() => setIsPermModalOpen(false)}
        title="Permissões por Módulo"
        description={`Configurar acessos granulares para ${selectedMember?.full_name || 'o membro'}.`}
      >
        <div className="space-y-3 text-left">
          <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-xl overflow-hidden">
            {(Object.entries(perms) as [string, { can_view: boolean; can_edit: boolean; can_delete: boolean }][]).map(([moduleKey, perm]) => (
              <div key={moduleKey} className="p-3 bg-zinc-950/60 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-zinc-200 capitalize">{moduleKey}</div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
                    <input
                      type="checkbox"
                      checked={perm.can_view}
                      onChange={(e) => {
                        setPerms({
                          ...perms,
                          [moduleKey]: { ...perm, can_view: e.target.checked }
                        });
                      }}
                      className="rounded border-zinc-700 bg-zinc-900 text-zinc-100"
                    />
                    <span>Visualizar</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
                    <input
                      type="checkbox"
                      checked={perm.can_edit}
                      onChange={(e) => {
                        setPerms({
                          ...perms,
                          [moduleKey]: { ...perm, can_edit: e.target.checked }
                        });
                      }}
                      className="rounded border-zinc-700 bg-zinc-900 text-zinc-100"
                    />
                    <span>Editar</span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button variant="outline" size="sm" onClick={() => setIsPermModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={handleSavePerms}>
              Salvar Permissões
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
