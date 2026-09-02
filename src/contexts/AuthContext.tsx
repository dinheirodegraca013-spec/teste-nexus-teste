import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured, localStore } from '../lib/supabase';
import { Profile, Organization, UserModulePermission, AppModule, UserRole } from '../types';

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  organization: Organization | null;
  organizations: Organization[];
  permissions: UserModulePermission[];
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInAsDemo: () => Promise<{ error: Error | null }>;
  signUp: (data: {
    name: string;
    email: string;
    password: string;
    organizationName?: string;
    role?: UserRole;
    organizationId?: string;
    leaderId?: string;
    coordinatorId?: string;
  }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  switchOrganization: (orgId: string) => void;
  createOrganization: (name: string, plan?: Organization['plan']) => Promise<Organization>;
  hasPermission: (module: AppModule, action?: 'view' | 'create' | 'edit' | 'delete') => boolean;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const defaultPermissions: UserModulePermission[] = [
  { id: '1', user_id: 'u1', organization_id: 'org-alpha', module: 'dashboard', can_view: true, can_create: true, can_edit: true, can_delete: true },
  { id: '2', user_id: 'u1', organization_id: 'org-alpha', module: 'coordinators', can_view: true, can_create: true, can_edit: true, can_delete: true },
  { id: '3', user_id: 'u1', organization_id: 'org-alpha', module: 'leaders', can_view: true, can_create: true, can_edit: true, can_delete: true },
  { id: '4', user_id: 'u1', organization_id: 'org-alpha', module: 'crm', can_view: true, can_create: true, can_edit: true, can_delete: true },
  { id: '5', user_id: 'u1', organization_id: 'org-alpha', module: 'goals', can_view: true, can_create: true, can_edit: true, can_delete: true },
  { id: '6', user_id: 'u1', organization_id: 'org-alpha', module: 'events', can_view: true, can_create: true, can_edit: true, can_delete: true },
  { id: '7', user_id: 'u1', organization_id: 'org-alpha', module: 'meetings', can_view: true, can_create: true, can_edit: true, can_delete: true },
  { id: '8', user_id: 'u1', organization_id: 'org-alpha', module: 'field', can_view: true, can_create: true, can_edit: true, can_delete: true },
  { id: '9', user_id: 'u1', organization_id: 'org-alpha', module: 'presence', can_view: true, can_create: true, can_edit: true, can_delete: true },
  { id: '10', user_id: 'u1', organization_id: 'org-alpha', module: 'materials', can_view: true, can_create: true, can_edit: true, can_delete: true },
  { id: '11', user_id: 'u1', organization_id: 'org-alpha', module: 'stickers', can_view: true, can_create: true, can_edit: true, can_delete: true },
  { id: '12', user_id: 'u1', organization_id: 'org-alpha', module: 'intelligence', can_view: true, can_create: true, can_edit: true, can_delete: true },
  { id: '13', user_id: 'u1', organization_id: 'org-alpha', module: 'reports', can_view: true, can_create: true, can_edit: true, can_delete: true },
  { id: '14', user_id: 'u1', organization_id: 'org-alpha', module: 'users', can_view: true, can_create: true, can_edit: true, can_delete: true },
  { id: '15', user_id: 'u1', organization_id: 'org-alpha', module: 'organizations', can_view: true, can_create: true, can_edit: true, can_delete: true },
  { id: '16', user_id: 'u1', organization_id: 'org-alpha', module: 'settings', can_view: true, can_create: true, can_edit: true, can_delete: true },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [permissions, setPermissions] = useState<UserModulePermission[]>(defaultPermissions);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize auth session
  useEffect(() => {
    async function initSession() {
      setIsLoading(true);
      const allOrgs = localStore.getOrganizations();
      setOrganizations(allOrgs);

      if (isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            // Fetch profile and organization from Supabase
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            if (profileData) {
              setProfile(profileData);
              const orgId = profileData.organization_id;
              const { data: orgData } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', orgId)
                .maybeSingle();

              if (orgData) {
                setOrganization(orgData);
              }
            } else {
              // Fallback to local profile with user credentials
              const activeOrg = allOrgs[0] || null;
              setProfile({
                id: session.user.id,
                organization_id: activeOrg ? activeOrg.id : 'org-alpha',
                full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Administrador',
                email: session.user.email || '',
                role: 'admin',
                is_active: true,
                created_at: new Date().toISOString()
              });
              setOrganization(activeOrg);
            }
          }
        } catch (err) {
          console.warn('Supabase Auth init notice:', err);
        }
      } else {
        // Local Session fallback for instant test / evaluation
        const savedUserJson = localStorage.getItem('nexus_auth_user');
        if (savedUserJson) {
          try {
            const parsed = JSON.parse(savedUserJson);
            setUser(parsed.user);
            setProfile(parsed.profile);
            const currentOrg = allOrgs.find(o => o.id === parsed.profile?.organization_id) || allOrgs[0];
            setOrganization(currentOrg || null);
          } catch {
            // clear invalid
            localStorage.removeItem('nexus_auth_user');
          }
        }
      }
      setIsLoading(false);
    }

    initSession();

    // Supabase Auth listener
    if (isSupabaseConfigured) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setOrganization(null);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  const signInAsDemo = async (): Promise<{ error: Error | null }> => {
    try {
      const orgs = localStore.getOrganizations();
      const activeOrg = orgs[0] || {
        id: 'org-alpha',
        name: 'Campanha Central — Litoral',
        slug: 'campanha-central',
        plan: 'professional',
        status: 'active',
        created_at: new Date().toISOString()
      };
      const demoUser = {
        id: 'usr_admin_demo',
        email: 'admin@nexus.com.br',
        user_metadata: { full_name: 'Dr. Roberto Lins (Administrador)' }
      };
      const demoProfile: Profile = {
        id: 'usr_admin_demo',
        organization_id: activeOrg.id,
        full_name: 'Dr. Roberto Lins (Administrador)',
        email: 'admin@nexus.com.br',
        role: 'admin',
        is_active: true,
        created_at: new Date().toISOString()
      };

      setUser(demoUser);
      setProfile(demoProfile);
      setOrganization(activeOrg);
      localStorage.setItem('nexus_auth_user', JSON.stringify({ user: demoUser, profile: demoProfile }));
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      const cleanEmail = email.trim();

      // If user is attempting login with default demo email, allow instant demo fallback if Supabase fails
      if (cleanEmail.toLowerCase() === 'admin@nexus.com.br') {
        if (isSupabaseConfigured) {
          const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
          if (!error && data.user) {
            setUser(data.user);
            return { error: null };
          }
        }
        // Fallback to demo profile smoothly
        return await signInAsDemo();
      }

      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) {
          let friendlyMessage = error.message;
          if (error.message?.toLowerCase().includes('invalid login credentials')) {
            friendlyMessage = 'E-mail ou senha incorretos. Verifique suas credenciais ou crie uma conta.';
          } else if (error.message?.toLowerCase().includes('email not confirmed')) {
            friendlyMessage = 'E-mail ainda não confirmado no Supabase. Verifique sua caixa de entrada para confirmar o e-mail.';
          }
          return { error: new Error(friendlyMessage) };
        }
        setUser(data.user);
        return { error: null };
      } else {
        // Local sign in fallback
        const orgs = localStore.getOrganizations();
        const activeOrg = orgs[0];
        const mockUser = {
          id: 'usr_' + Math.random().toString(36).substring(2, 9),
          email: cleanEmail,
          user_metadata: { full_name: cleanEmail.split('@')[0] }
        };
        const mockProfile: Profile = {
          id: mockUser.id,
          organization_id: activeOrg ? activeOrg.id : 'org-alpha',
          full_name: cleanEmail.split('@')[0].toUpperCase(),
          email: cleanEmail,
          role: 'admin',
          is_active: true,
          created_at: new Date().toISOString()
        };

        setUser(mockUser);
        setProfile(mockProfile);
        setOrganization(activeOrg || null);
        localStorage.setItem('nexus_auth_user', JSON.stringify({ user: mockUser, profile: mockProfile }));
        return { error: null };
      }
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUp = async (data: {
    name: string;
    email: string;
    password: string;
    organizationName?: string;
    role?: UserRole;
    organizationId?: string;
    leaderId?: string;
    coordinatorId?: string;
  }): Promise<{ error: Error | null }> => {
    try {
      let targetOrg: Organization | undefined;
      const existingOrgs = localStore.getOrganizations();

      if (data.organizationId) {
        targetOrg = existingOrgs.find(o => o.id === data.organizationId);
      }

      if (!targetOrg) {
        const orgName = data.organizationName || `Organização ${data.name.split(' ')[0]}`;
        targetOrg = {
          id: data.organizationId || 'org_' + Math.random().toString(36).substring(2, 9),
          name: orgName,
          slug: orgName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          plan: 'starter',
          status: 'active',
          settings: {
            primary_color: '#09090b',
            timezone: 'America/Sao_Paulo',
            territory_type: 'bairro'
          },
          created_at: new Date().toISOString()
        };
        localStore.saveOrganization(targetOrg);
      }

      const assignedRole = data.role || 'admin';

      if (isSupabaseConfigured) {
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: data.name,
              organization_name: targetOrg.name,
              organization_id: targetOrg.id,
              role: assignedRole,
              leader_id: data.leaderId,
              coordinator_id: data.coordinatorId,
            }
          }
        });
        if (error) return { error };

        setOrganizations(localStore.getOrganizations());
        setOrganization(targetOrg);

        if (authData.user) {
          const newProfile: Profile = {
            id: authData.user.id,
            organization_id: targetOrg.id,
            full_name: data.name,
            email: data.email,
            role: assignedRole,
            is_active: true,
            created_at: new Date().toISOString()
          };
          setUser(authData.user);
          setProfile(newProfile);
          localStorage.setItem('nexus_auth_user', JSON.stringify({ user: authData.user, profile: newProfile }));
        }

        // If leaderId was passed, update leader record status and email
        if (data.leaderId) {
          const leaders = localStore.getLeaders(targetOrg.id);
          const found = leaders.find(l => l.id === data.leaderId);
          if (found) {
            localStore.saveLeader({
              ...found,
              email: data.email,
              status: 'active'
            });
          }
        }

        return { error: null };
      } else {
        setOrganizations(localStore.getOrganizations());

        const mockUser = {
          id: 'usr_' + Math.random().toString(36).substring(2, 9),
          email: data.email,
          user_metadata: { full_name: data.name, role: assignedRole }
        };
        const newProfile: Profile = {
          id: mockUser.id,
          organization_id: targetOrg.id,
          full_name: data.name,
          email: data.email,
          role: assignedRole,
          is_active: true,
          created_at: new Date().toISOString()
        };

        // If leaderId was passed, update leader record status and email
        if (data.leaderId) {
          const leaders = localStore.getLeaders(targetOrg.id);
          const found = leaders.find(l => l.id === data.leaderId);
          if (found) {
            localStore.saveLeader({
              ...found,
              email: data.email,
              status: 'active'
            });
          }
        }

        setUser(mockUser);
        setProfile(newProfile);
        setOrganization(targetOrg);
        localStorage.setItem('nexus_auth_user', JSON.stringify({ user: mockUser, profile: newProfile }));
        return { error: null };
      }
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setOrganization(null);
    localStorage.removeItem('nexus_auth_user');
  };

  const resetPassword = async (email: string): Promise<{ error: Error | null }> => {
    if (isSupabaseConfigured) {
      return await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`
      });
    }
    return { error: null };
  };

  const updatePassword = async (password: string): Promise<{ error: Error | null }> => {
    if (isSupabaseConfigured) {
      return await supabase.auth.updateUser({ password });
    }
    return { error: null };
  };

  const switchOrganization = (orgId: string) => {
    const orgs = localStore.getOrganizations();
    const found = orgs.find(o => o.id === orgId);
    if (found) {
      setOrganization(found);
      if (profile) {
        const updatedProfile = { ...profile, organization_id: found.id };
        setProfile(updatedProfile);
        if (!isSupabaseConfigured) {
          localStorage.setItem('nexus_auth_user', JSON.stringify({ user, profile: updatedProfile }));
        }
      }
    }
  };

  const createOrganization = async (name: string, plan: Organization['plan'] = 'starter'): Promise<Organization> => {
    const newOrg: Organization = {
      id: 'org_' + Math.random().toString(36).substring(2, 9),
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      plan,
      status: 'active',
      settings: {
        primary_color: '#09090b',
        timezone: 'America/Sao_Paulo',
        territory_type: 'bairro'
      },
      created_at: new Date().toISOString()
    };
    localStore.saveOrganization(newOrg);
    const updated = localStore.getOrganizations();
    setOrganizations(updated);
    setOrganization(newOrg);
    return newOrg;
  };

  const hasPermission = (module: AppModule, action: 'view' | 'create' | 'edit' | 'delete' = 'view'): boolean => {
    if (!profile) return false;
    if (profile.role === 'superadmin' || profile.role === 'admin') return true;
    const perm = permissions.find(p => p.module === module);
    if (!perm) return false;
    if (action === 'view') return perm.can_view;
    if (action === 'create') return perm.can_create;
    if (action === 'edit') return perm.can_edit;
    if (action === 'delete') return perm.can_delete;
    return false;
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (profile) {
      const updated = { ...profile, ...updates };
      setProfile(updated);
      if (!isSupabaseConfigured) {
        localStorage.setItem('nexus_auth_user', JSON.stringify({ user, profile: updated }));
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        organization,
        organizations,
        permissions,
        isLoading,
        isConfigured: isSupabaseConfigured,
        signIn,
        signInAsDemo,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        switchOrganization,
        createOrganization,
        hasPermission,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
