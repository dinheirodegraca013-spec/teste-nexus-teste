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

export const profilesService = {
  async getById(id: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return { data: data as Profile | null, error };
  },

  async getByOrganization(organizationId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('organization_id', organizationId)
      .order('full_name', { ascending: true });
    return { data: (data as Profile[]) || [], error };
  },

  async update(id: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as Profile | null, error };
  },

  async create(profile: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .insert([profile])
      .select()
      .maybeSingle();
    return { data: data as Profile | null, error };
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
      data: (data || []).map((p: any) => ({
        id: p.id,
        organization_id: p.organization_id,
        user_id: p.id,
        email: p.email,
        full_name: p.full_name,
        role: p.role || 'operator',
        status: p.status || 'active',
        created_at: p.created_at || new Date().toISOString(),
      })), 
      error 
    };
  },

  async invite(params: { organization_id: string; email: string; role: string }) {
    const { data, error } = await supabase
      .from('profiles')
      .insert([{
        organization_id: params.organization_id,
        email: params.email,
        full_name: params.email.split('@')[0],
        role: params.role,
        status: 'active',
      }])
      .select()
      .maybeSingle();
    return { data, error };
  },

  async remove(id: string) {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);
    return { error };
  }
};

