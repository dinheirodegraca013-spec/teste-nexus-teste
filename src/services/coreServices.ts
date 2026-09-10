import { supabase } from '../lib/supabase';
import { Organization, Profile, UserModulePermission } from '../types';

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
  },

  async create(organization: Partial<Organization>) {
    const { data, error } = await supabase
      .from('organizations')
      .insert([organization])
      .select()
      .maybeSingle();
    return { data: data as Organization | null, error };
  }
};

function normalizeProfile(dbRecord: any): Profile | null {
  if (!dbRecord) return null;
  const nameValue = dbRecord.name || dbRecord.full_name || '';
  return {
    ...dbRecord,
    name: nameValue,
    full_name: nameValue,
    user_id: dbRecord.user_id || dbRecord.id,
    is_active: dbRecord.status === 'active' || dbRecord.is_active === true,
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
    const dbUpdates: Record<string, any> = {};
    if (updates.name !== undefined) {
      dbUpdates.name = updates.name;
    } else if (updates.full_name !== undefined) {
      dbUpdates.name = updates.full_name;
    }

    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.avatar_url !== undefined) dbUpdates.avatar_url = updates.avatar_url;
    if (updates.organization_id !== undefined) dbUpdates.organization_id = updates.organization_id;

    const { data, error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: normalizeProfile(data), error };
  },

  async create(profile: Partial<Profile> & { name?: string }) {
    const name = profile.name || profile.full_name || '';
    const dbPayload: Record<string, any> = {
      id: profile.id,
      organization_id: profile.organization_id,
      name,
      email: profile.email,
      role: profile.role || 'operator',
      status: profile.status || 'active',
    };
    if (profile.phone) dbPayload.phone = profile.phone;
    if (profile.avatar_url) dbPayload.avatar_url = profile.avatar_url;

    const { data, error } = await supabase
      .from('profiles')
      .insert([dbPayload])
      .select()
      .maybeSingle();
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
    return { data: (data as UserModulePermission[]) || [], error };
  },

  async upsertPermissions(permissions: Partial<UserModulePermission>[]) {
    const { data, error } = await supabase
      .from('user_module_permissions')
      .upsert(permissions)
      .select();
    return { data: (data as UserModulePermission[]) || [], error };
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
          status: p.status || 'active',
          created_at: p.created_at || new Date().toISOString(),
        };
      }), 
      error 
    };
  },

  async invite(params: { organization_id: string; email: string; role: string; name?: string; full_name?: string }) {
    const nameVal = params.name || params.full_name || params.email.split('@')[0];
    const { data, error } = await supabase
      .from('profiles')
      .insert([{
        organization_id: params.organization_id,
        email: params.email,
        name: nameVal,
        role: params.role,
        status: 'active',
      }])
      .select()
      .maybeSingle();
    return { data: normalizeProfile(data), error };
  },

  async remove(id: string) {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);
    return { error };
  }
};

