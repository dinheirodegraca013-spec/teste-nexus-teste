import { supabase } from '../lib/supabase';
import { Organization, Profile, UserModulePermission } from '../types';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUUID(id: unknown): id is string {
  return typeof id === 'string' && UUID_REGEX.test(id.trim());
}

export const organizationsService = {
  async getById(id: string) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return { data: data as Organization | null, error };
  },

  async getAll() {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('name', { ascending: true });
    return { data: (data as Organization[]) || [], error };
  },

  async update(id: string, updates: Partial<Organization>) {
    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as Organization | null, error };
  }
};

export function normalizeProfile(dbRecord: any): Profile | null {
  if (!dbRecord) return null;
  const nameValue = dbRecord.name || dbRecord.full_name || '';
  return {
    ...dbRecord,
    name: nameValue,
    full_name: nameValue,
    status: dbRecord.is_blocked ? 'inactive' : 'active',
    is_active: !dbRecord.is_blocked,
    user_id: dbRecord.user_id || dbRecord.id,
  } as Profile;
}

export const profilesService = {
  async getById(id: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return { data: normalizeProfile(data), error };
  },

  async getByOrganization(organizationId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });
    return { data: ((data || []) as any[]).map(normalizeProfile).filter(Boolean) as Profile[], error };
  },

  async update(id: string, updates: Partial<Profile> & { name?: string }) {
    // Browser edits only name/phone. The DB independently enforces column
    // UPDATE grants and an RLS self/tenant policy (defense in depth).
    const rejectedFields = Object.keys(updates).filter(
      (field) => !['name', 'full_name', 'phone'].includes(field)
    );
    if (rejectedFields.length > 0) {
      return {
        data: null,
        error: { name: 'PermissionError', code: 'PROTECTED_PROFILE_FIELDS',
          message: 'Alterações de cargo, e-mail, organização ou bloqueio exigem autorização administrativa.' },
      };
    }
    if (!isValidUUID(id)) {
      return {
        data: null,
        error: { name: 'ValidationError', code: 'INVALID_USER_UUID',
          message: 'Identificador do usuário inválido.' },
      };
    }
    const dbUpdates: { name?: string; phone?: string | null } = {};
    const requestedName = updates.name ?? updates.full_name;
    if (requestedName !== undefined) {
      if (typeof requestedName !== 'string' || !requestedName.trim() || requestedName.trim().length > 120) {
        return {
          data: null,
          error: { name: 'ValidationError', code: 'INVALID_PROFILE_NAME',
            message: 'Informe um nome entre 1 e 120 caracteres.' },
        };
      }
      dbUpdates.name = requestedName.trim();
    }
    if (updates.phone !== undefined) {
      if (typeof updates.phone !== 'string' || updates.phone.trim().length > 32) {
        return {
          data: null,
          error: { name: 'ValidationError', code: 'INVALID_PROFILE_PHONE',
            message: 'O telefone deve ter no máximo 32 caracteres.' },
        };
      }
      dbUpdates.phone = updates.phone.trim() || null;
    }
    if (Object.keys(dbUpdates).length === 0) {
      return {
        data: null,
        error: { name: 'ValidationError', code: 'NO_PROFILE_CHANGES',
          message: 'Nenhum campo editável foi informado.' },
      };
    }
    const { data, error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .maybeSingle();
    // maybeSingle can return no row and no error when RLS denies UPDATE.
    if (!error && !data) {
      return {
        data: null,
        error: { name: 'PermissionError', code: 'PROFILE_UPDATE_NOT_APPLIED',
          message: 'Atualização não realizada: perfil não autorizado ou indisponível.' },
      };
    }
    return { data: normalizeProfile(data), error };
  },

  async create(profile: Partial<Profile> & { name?: string }) {
    // Regra Obrigatória: Bloquear qualquer INSERT se organization_id não for UUID válido
    if (!isValidUUID(profile.organization_id)) {
      const uuidErr = {
        name: 'ValidationError',
        message: `organization_id inválido ou ausente: "${String(profile.organization_id)}". Um UUID válido é estritamente obrigatório para criar o perfil.`,
        code: 'INVALID_ORGANIZATION_UUID',
      };
      console.error('[NEXUS PROFILE] INSERT_BLOCKED_INVALID_ORG_UUID', uuidErr);
      return { data: null, error: uuidErr as any };
    }

    // Regra Obrigatória: Bloquear se id do usuário não for UUID válido
    if (!profile.id || !isValidUUID(profile.id)) {
      const uuidErr = {
        name: 'ValidationError',
        message: `id de usuário inválido: "${profile.id || ''}". Um UUID válido é estritamente obrigatório para criar o perfil.`,
        code: 'INVALID_USER_UUID',
      };
      console.error('[NEXUS PROFILE] INSERT_BLOCKED_INVALID_USER_UUID', uuidErr);
      return { data: null, error: uuidErr as any };
    }

    const name = profile.name || profile.full_name || '';
    const dbPayload = {
      id: profile.id,
      organization_id: profile.organization_id,
      name,
      email: profile.email,
      role: profile.role || 'operator',
    };

    console.log('[NEXUS PROFILE] INSERT_START', {
      operation: 'INSERT',
      table: 'profiles',
    });

    const { data, error } = await supabase
      .from('profiles')
      .insert([dbPayload])
      .select()
      .maybeSingle();

    if (error) {
      console.error('[NEXUS PROFILE] INSERT_ERROR', {
        operation: 'INSERT',
        table: 'profiles',
        status: (error as any)?.status || (error as any)?.statusCode,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      console.error('[NEXUS PROFILE] SELECT_ERROR', {
        operation: 'SELECT_RETURNING',
        table: 'profiles',
        status: (error as any)?.status || (error as any)?.statusCode,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
    } else {
      console.log('[NEXUS PROFILE] INSERT_RESPONSE', {
        operation: 'INSERT',
        table: 'profiles',
        hasData: Boolean(data),
      });
      console.log('[NEXUS PROFILE] SELECT_AFTER_INSERT', {
        operation: 'SELECT',
        table: 'profiles',
        hasData: Boolean(data),
      });
    }

    return { data: normalizeProfile(data), error };
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);
    return { error };
  }
};

export const permissionsService = {
  async getByUserId(userId: string) {
    const { data, error } = await supabase
      .from('user_module_permissions')
      .select('*')
      .eq('user_id', userId);

    const mapped = ((data || []) as any[]).map((row) => ({
      ...row,
      module: row.module_key,
      can_view: Boolean(row.can_read),
      can_create: Boolean(row.can_write),
      can_edit: Boolean(row.can_write),
      can_delete: Boolean(row.can_delete),
    })) as UserModulePermission[];

    return { data: mapped, error };
  },

  async upsertPermissions(permissions: Partial<UserModulePermission>[]) {
    const dbRows = permissions
      .filter((permission) => Boolean(permission.user_id && permission.module))
      .map((permission) => ({
        user_id: permission.user_id,
        module_key: permission.module,
        can_read: Boolean(permission.can_view),
        can_write: Boolean(permission.can_create ?? permission.can_edit),
        can_delete: Boolean(permission.can_delete),
      }));

    const { data, error } = await supabase
      .from('user_module_permissions')
      .upsert(dbRows, { onConflict: 'user_id,module_key' })
      .select();

    const mapped = ((data || []) as any[]).map((row) => ({
      ...row,
      module: row.module_key,
      can_view: Boolean(row.can_read),
      can_create: Boolean(row.can_write),
      can_edit: Boolean(row.can_write),
      can_delete: Boolean(row.can_delete),
    })) as UserModulePermission[];

    return { data: mapped, error };
  }
};

export const membersService = {
  async getAll(organizationId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    
    return { 
      data: (data || []).map((p: any) => {
        const nameVal = p.name || p.full_name || '';
        return {
          id: p.id,
          organization_id: p.organization_id,
          user_id: p.id,
          email: p.email,
          name: nameVal,
          full_name: nameVal,
          role: p.role || 'operator',
          status: (p.is_blocked ? 'inactive' : 'active') as 'inactive' | 'active',
          is_active: !p.is_blocked,
          is_blocked: Boolean(p.is_blocked),
          created_at: p.created_at || new Date().toISOString(),
        };
      }), 
      error 
    };
  },

  async invite(params: { organization_id: string; email: string; role: string; name?: string; full_name?: string }) {
    if (!isValidUUID(params.organization_id)) {
      const validationError = {
        name: 'ValidationError',
        message: `organization_id inválido para convite: "${String(params.organization_id)}". Um UUID válido é obrigatório.`,
        code: 'INVALID_ORGANIZATION_UUID',
      };
      console.error('[NEXUS MEMBERS] INVITE_BLOCKED_INVALID_ORG_UUID', validationError);
      return { data: null, error: validationError as any };
    }

    const nameVal = params.name || params.full_name || params.email.split('@')[0];
    const { data, error } = await supabase.functions.invoke('invite-organization-member', {
      body: {
        organization_id: params.organization_id,
        email: params.email,
        name: nameVal,
        role: params.role,
      },
    });

    return { data: data?.member ? normalizeProfile(data.member) : null, error };
  },

  async remove(id: string) {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);
    return { error };
  }
};

