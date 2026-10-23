import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Plus, Shield, Mail, Edit2, Trash2, CheckCircle2, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { OrganizationMember, UserRole, Coordinator, Leader } from '../../types';
import { membersService, permissionsService, teamScopeService, coordinatorsService, leadersService } from '../../services';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';

const permissionModuleKeys: Record<string, string> = {
  painel: 'dashboard',
  organizacoes: 'organizations',
  usuarios: 'users',
  crm: 'crm',
  coordenadores: 'coordinators',
  liderancas: 'leaders',
  metas: 'goals',
  campo: 'field',
  presencas: 'presence',
  eventos: 'events',
  reunioes: 'meetings',
  materiais: 'materials',
  adesivos: 'stickers',
  inteligencia: 'intelligence',
  relatorios: 'reports',
  configuracoes: 'settings',
};

const createDefaultPermissions = () =>
  Object.fromEntries(
    Object.keys(permissionModuleKeys).map((moduleKey) => [
      moduleKey,
      { can_view: false, can_edit: false, can_delete: false },
    ])
  ) as Record<string, { can_view: boolean; can_edit: boolean; can_delete: boolean }>;

export const UsersPage: React.FC = () => {
  const { organization, profile } = useAuth();
  const isOrganizationAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
  const { success, error: toastError } = useToast();
  const orgId = organization?.id || '';

  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const loadGenerationRef = useRef(0);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [isScopeModalOpen, setIsScopeModalOpen] = useState(false);
  const [scopeId, setScopeId] = useState('');
  const [teamCoordinators, setTeamCoordinators] = useState<Coordinator[]>([]);
  const [teamLeaders, setTeamLeaders] = useState<Leader[]>([]);
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('operator');
  const [invitePerms, setInvitePerms] = useState<Record<string, { can_view: boolean; can_edit: boolean; can_delete: boolean }>>(createDefaultPermissions);

  // Permission editor state
  const [perms, setPerms] = useState(createDefaultPermissions);

  const loadData = useCallback(async () => {
    const loadGeneration = ++loadGenerationRef.current;
    const isCurrentLoad = () => loadGeneration === loadGenerationRef.current;
    if (!orgId) {
      if (!isCurrentLoad()) return;
      setMembers([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await membersService.getAll(orgId);
      if (error) throw error;
      if (!isCurrentLoad()) return;
      setMembers(data || []);
    } catch (err: any) {
      if (isCurrentLoad()) toastError('Erro ao carregar equipe: ' + err.message);
    } finally {
      if (isCurrentLoad()) setIsLoading(false);
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

    if (!Object.keys(invitePerms).some((key) => invitePerms[key]?.can_view === true)) {
      toastError('Selecione pelo menos um módulo de leitura antes de enviar o convite.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await membersService.invite({
        organization_id: orgId,
        email: inviteEmail.trim(),
        role: inviteRole,
        name: inviteName.trim(),
        permissions: Object.keys(invitePerms).filter((key) => invitePerms[key]?.can_view === true).map((key) => permissionModuleKeys[key]),
      });

      if (error) {
        toastError('Erro ao convidar membro: ' + error.message);
      } else {
        await loadData();
        setIsInviteModalOpen(false);
        setInviteEmail('');
        setInviteName('');
        setInvitePerms(createDefaultPermissions());
        success('Membro convidado para a organização no Supabase!');
      }
    } catch (err: any) {
      toastError('Erro inesperado: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPerms = async (member: OrganizationMember) => {
    setSelectedMember(member);
    setIsSubmitting(true);
    try {
      const { data, error } = await permissionsService.getByUserId(member.id);
      if (error) {
        toastError('Erro ao carregar permissões: ' + error.message);
        return;
      }

      const loadedPerms = createDefaultPermissions();
      for (const permission of (data || []) as Array<{ module?: string; can_view?: boolean; can_edit?: boolean; can_delete?: boolean }>) {
        const displayKey = Object.keys(permissionModuleKeys).find(
          (key) => permissionModuleKeys[key] === permission.module
        );
        if (!displayKey) continue;
        loadedPerms[displayKey] = {
          can_view: Boolean(permission.can_view),
          can_edit: Boolean(permission.can_edit),
          can_delete: Boolean(permission.can_delete),
        };
      }
      setPerms(loadedPerms);
      setIsPermModalOpen(true);
    } catch (err: any) {
      toastError('Erro inesperado ao carregar permissões: ' + (err?.message || 'falha desconhecida'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePerms = async () => {
    if (!selectedMember) {
      toastError('Selecione um membro antes de salvar as permissões.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = Object.entries(perms as Record<string, { can_view: boolean; can_edit: boolean; can_delete: boolean }>).map(([displayKey, permission]) => ({
        user_id: selectedMember.id,
        module: permissionModuleKeys[displayKey],
        can_view: permission.can_view,
        can_create: permission.can_edit,
        can_edit: permission.can_edit,
        can_delete: permission.can_delete,
      }));

      const { error } = await permissionsService.upsertPermissions(payload);
      if (error) {
        toastError('Erro ao salvar permissões: ' + error.message);
        return;
      }

      setIsPermModalOpen(false);
      success(`Permissões salvas para ${selectedMember.full_name || selectedMember.email}`);
    } catch (err: any) {
      toastError('Erro inesperado ao salvar permissões: ' + (err?.message || 'falha desconhecida'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenScope = async (member: OrganizationMember) => {
    if (!['leader', 'coordinator', 'controller'].includes(member.role)) {
      toastError('Este perfil não permite vínculo hierárquico.');
      return;
    }
    setSelectedMember(member);
    setScopeId('');
    setIsSubmitting(true);
    try {
      const [coords, leaders] = await Promise.all([
        coordinatorsService.getAll(orgId),
        leadersService.getAll(orgId),
      ]);
      if (coords.error) throw coords.error;
      if (leaders.error) throw leaders.error;
      setTeamCoordinators(coords.data || []);
      setTeamLeaders(leaders.data || []);
      setIsScopeModalOpen(true);
    } catch (err: any) {
      toastError('Falha ao carregar equipes: ' + (err?.message || 'Erro inesperado.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveScope = async () => {
    if (!selectedMember || !scopeId) {
      toastError('Selecione uma liderança ou coordenação para vincular.');
      return;
    }
    const role = selectedMember.role;
    if (role !== 'leader' && role !== 'coordinator' && role !== 'controller') {
      toastError('Cargo não autorizado para vínculo hierárquico.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await teamScopeService.assign(selectedMember.id, role, scopeId);
      if (error) {
        toastError('Não foi possível vincular equipe: ' + error.message);
        return;
      }
      setIsScopeModalOpen(false);
      success('Vínculo de equipe salvo e registrado na auditoria.');
    } catch (err: any) {
      toastError('Falha ao vincular equipe: ' + (err?.message || 'Erro inesperado.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeControllerScope = async () => {
    if (!selectedMember || selectedMember.role !== 'controller' || !scopeId) return;
    if (!window.confirm('Revogar esta coordenação do controlador?')) return;
    setIsSubmitting(true);
    try {
      const { error } = await teamScopeService.revokeController(selectedMember.id, scopeId);
      if (error) {
        toastError('Falha ao revogar coordenação: ' + error.message);
        return;
      }
      setIsScopeModalOpen(false);
      success('Solicitação de revogação processada e registrada na auditoria.');
    } catch (err: any) {
      toastError('Falha ao revogar coordenação: ' + (err?.message || 'Erro inesperado.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin': return <Badge variant="success" size="sm">Administrador</Badge>;
      case 'manager': return <Badge variant="primary" size="sm">Gerente</Badge>;
      case 'coordinator': return <Badge variant="neutral" size="sm">Coordenador</Badge>;
      case 'controller': return <Badge variant="neutral" size="sm">Controlador</Badge>;
      case 'operator': return <Badge variant="warning" size="sm">Operador de Campo</Badge>;
      case 'viewer': return <Badge variant="neutral" size="sm">Visualizador</Badge>;
      default: return <Badge variant="neutral" size="sm">{role}</Badge>;
    }
  };

  // Defense in depth: only organization admins may operate this screen.
  // Supabase RLS independently denies permission changes by other roles.
  if (!isOrganizationAdmin) {
    return (
      <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Somente o administrador da organização pode gerenciar convites e permissões.
      </div>
    );
  }

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
                    {['leader', 'coordinator', 'controller'].includes(member.role) && (
                      <button
                        type="button"
                        onClick={() => handleOpenScope(member)}
                        aria-label="Vincular liderança ou coordenação"
                        className="p-1.5 rounded text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer"
                        title="Vincular liderança ou coordenação"
                      >
                        <Users className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenPerms(member)}
                      aria-label="Configurar permissões granulares"
                      className="p-1.5 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Configurar Permissões Granulares"
                    >
                      <Shield className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled
                      aria-label="Revogação de acesso indisponível"
                      className="p-1.5 rounded text-slate-300 cursor-not-allowed"
                      title="Revogação de acesso temporariamente indisponível: exige fluxo administrativo seguro"
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
            onChange={(e) => { setInviteRole(e.target.value as UserRole); setInvitePerms(createDefaultPermissions()); }}
            options={[
              { value: 'operator', label: 'Operador de Campo (Apenas Registro)' },
              { value: 'coordinator', label: 'Coordenador Territorial (Seu Território)' },
              { value: 'controller', label: 'Controlador (Coordenações atribuídas)' },
              { value: 'leader', label: 'Liderança (Sua Equipe)' },
              { value: 'manager', label: 'Gerente Operacional (Visualiza e Edita)' },
              { value: 'viewer', label: 'Visualizador / Auditor (Somente Leitura)' },
            ]}
          />

          <fieldset className="rounded-xl border border-slate-200 p-3 space-y-2">
            <legend className="px-1 text-sm font-semibold">Permissões antes do convite (somente leitura)</legend>
            <p className="text-xs text-slate-500">Escolha os módulos que o convidado poderá consultar. O servidor validará os limites do cargo e gravará as permissões antes de confirmar o convite.</p>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {Object.keys(permissionModuleKeys).filter((key) => {
                const allowed: Record<string, string[]> = {
                  coordinator: ['coordenadores', 'liderancas', 'crm', 'presencas'],
                  controller: ['coordenadores', 'liderancas', 'crm', 'presencas'],
                  leader: ['crm', 'presencas'],
                };
                return !allowed[inviteRole] || allowed[inviteRole].includes(key);
              }).map((key) => (
                <label key={key} className="flex items-center gap-2 text-xs text-slate-700 capitalize">
                  <input type="checkbox" checked={invitePerms[key].can_view}
                    onChange={(e) => setInvitePerms((previous) => ({ ...previous, [key]: { ...previous[key], can_view: e.target.checked } }))} />
                  {key}
                </label>
              ))}
            </div>
          </fieldset>

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

      {/* Admin-only backend validates actor, role and tenant again. */}
      <Modal
        isOpen={isScopeModalOpen}
        onClose={() => setIsScopeModalOpen(false)}
        title={`Vincular equipe: ${selectedMember?.full_name || selectedMember?.email || 'Membro'}`}
        description="Vincule um membro a seu território autorizado. Ação auditada no Supabase."
      >
        <div className="space-y-4 text-left">
          <Select
            label={selectedMember?.role === 'leader' ? 'Liderança de destino' : 'Coordenação de destino'}
            value={scopeId}
            onChange={(e) => setScopeId(e.target.value)}
            options={[
              { value: '', label: 'Selecione...' },
              ...(selectedMember?.role === 'leader' ? teamLeaders : teamCoordinators)
                .map((item) => ({ value: item.id, label: item.name })),
            ]}
          />
          <p className="text-xs text-slate-600">
            {selectedMember?.role === 'controller'
              ? 'O controlador pode acumular coordenações. Cada atribuição é validada no servidor.'
              : 'A nova atribuição substitui o vínculo anterior do membro.'}
          </p>
          <div className="flex justify-end gap-2">
            {selectedMember?.role === 'controller' && (
              <Button type="button" variant="outline" size="sm"
                onClick={handleRevokeControllerScope} isLoading={isSubmitting} disabled={!scopeId}>
                Revogar coordenação
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => setIsScopeModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="primary" size="sm"
              onClick={handleSaveScope} isLoading={isSubmitting} disabled={!scopeId}>
              Salvar vínculo
            </Button>
          </div>
        </div>
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
            <Button type="button" variant="primary" size="sm" onClick={handleSavePerms} isLoading={isSubmitting}>
              Salvar Permissões
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
