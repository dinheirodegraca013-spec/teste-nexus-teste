import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, supabaseUrl } from '../lib/supabase';
import { Organization, Profile, UserRole, AppModule, UserModulePermission } from '../types';
import { organizationsService, profilesService, permissionsService } from '../services';

interface SignUpParams {
  name: string;
  email: string;
  password?: string;
  organizationName?: string;
  role?: UserRole;
  organizationId?: string;
  leaderId?: string;
  coordinatorId?: string;
}

interface SignUpResult {
  error: AuthError | Error | null;
  requiresConfirmation?: boolean;
  user?: User | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  organization: Organization | null;
  organizations: Organization[];
  permissions: UserModulePermission[];
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>;
  signUp: (params: SignUpParams) => Promise<SignUpResult>;
  signOut: () => Promise<{ error: AuthError | Error | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | Error | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | Error | null }>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: Error | null }>;
  switchOrganization: (orgId: string) => Promise<void>;
  hasPermission: (module: AppModule, action?: 'view' | 'create' | 'edit' | 'delete') => boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [permissions, setPermissions] = useState<UserModulePermission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch full user profile, organization, and RBAC permissions from real Supabase
  const loadUserData = useCallback(async (authUser: User) => {
    try {
      // 1. Fetch user profile
      const { data: userProfile, error: profileErr } = await profilesService.getById(authUser.id);

      if (profileErr) {
        console.warn('[Auth] Erro ao carregar perfil do usuário:', profileErr.message);
      }

      let activeProfile = userProfile;

      // If user is authenticated in Supabase Auth but profile record does not yet exist in PostgreSQL
      if (!activeProfile) {
        const metadata = authUser.user_metadata || {};
        const fallbackName = metadata.full_name || metadata.name || authUser.email?.split('@')[0] || 'Usuário';
        const fallbackRole = (metadata.role as UserRole) || 'admin';
        
        let orgId = metadata.organization_id;
        
        // If no organization provided, create or link default organization
        if (!orgId) {
          const orgName = metadata.organization_name || `Campanha ${fallbackName.split(' ')[0]}`;
          const { data: newOrg } = await organizationsService.create({
            name: orgName,
            slug: orgName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            plan: 'professional',
            status: 'active',
          });
          if (newOrg) {
            orgId = newOrg.id;
          }
        }

        const { data: createdProfile } = await profilesService.create({
          id: authUser.id,
          user_id: authUser.id,
          organization_id: orgId || 'org-alpha',
          full_name: fallbackName,
          email: authUser.email || '',
          role: fallbackRole,
          status: 'active',
          is_active: true,
        });

        activeProfile = createdProfile;
      }

      setProfile(activeProfile || null);

      // 2. Fetch active organization and all accessible organizations
      if (activeProfile?.organization_id) {
        const { data: orgData } = await organizationsService.getById(activeProfile.organization_id);
        setOrganization(orgData || null);
      }

      const { data: allOrgs } = await organizationsService.getAll();
      setOrganizations(allOrgs || []);

      // 3. Fetch module-level permissions for granular RBAC
      if (activeProfile?.id) {
        const { data: perms } = await permissionsService.getByUserId(activeProfile.id);
        setPermissions(perms || []);
      }
    } catch (err) {
      console.error('[Auth] Erro inesperado ao carregar dados do usuário:', err);
    }
  }, []);

  // Initialize session and subscribe to Supabase Auth state changes
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      if (!isSupabaseConfigured) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('[Auth] Erro ao recuperar sessão Supabase:', error.message);
        }

        if (isMounted) {
          const currentSession = data?.session || null;
          setSession(currentSession);
          setUser(currentSession?.user || null);

          if (currentSession?.user) {
            await loadUserData(currentSession.user);
          }
        }
      } catch (err) {
        console.error('[Auth] Falha na inicialização da autenticação:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    // Listen for auth state changes (SIGN_IN, SIGN_OUT, TOKEN_REFRESHED, USER_UPDATED)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      setSession(newSession);
      setUser(newSession?.user || null);

      if (newSession?.user) {
        await loadUserData(newSession.user);
      } else {
        setProfile(null);
        setOrganization(null);
        setPermissions([]);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  const refreshUserData = async () => {
    if (user) {
      await loadUserData(user);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) return { error };

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        await loadUserData(data.user);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  // Helper to log detailed network/Supabase errors without exposing private tokens
  const logAuthError = (operation: string, err: any) => {
    try {
      const parsedHost = supabaseUrl ? new URL(supabaseUrl).hostname : 'configuração-ausente';
      console.error(`[AuthNetworkError][${operation}]`, {
        targetHost: parsedHost,
        errorName: err?.name || 'UnknownError',
        message: err?.message || String(err),
        status: err?.status,
        code: err?.code,
        cause: err?.cause,
        stack: err?.stack,
      });
    } catch {
      console.error(`[AuthNetworkError][${operation}]`, err);
    }
  };

  const signUp = async ({
    name,
    email,
    password,
    organizationName,
    role = 'admin',
    organizationId,
    leaderId,
    coordinatorId,
  }: SignUpParams): Promise<SignUpResult> => {
    // 1. Validação estrita da configuração do Supabase antes de qualquer chamada
    if (!isSupabaseConfigured) {
      const configError = new Error(
        'O backend Supabase não está configurado neste ambiente (as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não foram fornecidas no build da Vercel).'
      );
      logAuthError('signUp:config', configError);
      return { error: configError };
    }

    try {
      // 2. Executar supabase.auth.signUp primeiro, passando metadados
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password || '123456',
        options: {
          data: {
            full_name: name.trim(),
            role,
            organization_id: organizationId || null,
            organization_name: organizationName || null,
            leader_id: leaderId || null,
            coordinator_id: coordinatorId || null,
          },
        },
      });

      if (error) {
        logAuthError('signUp:supabaseAuth', error);
        return { error };
      }

      // 3. Caso signUp retorne usuário mas session seja null (confirmação por e-mail obrigatória)
      if (data.user && !data.session) {
        console.info('[Auth] Conta criada com sucesso no Supabase Auth. Confirmação de e-mail requerida antes do login.');
        return { error: null, requiresConfirmation: true, user: data.user };
      }

      // 4. Se houver data.session (usuário autenticado imediatamente)
      if (data.user && data.session) {
        setUser(data.user);
        setSession(data.session);

        let finalOrgId = organizationId;

        // Criar organização no PostgreSQL caso seja uma nova campanha e tenhamos sessão ativa
        if (!finalOrgId && organizationName) {
          try {
            const { data: newOrg, error: orgErr } = await organizationsService.create({
              name: organizationName.trim(),
              slug: organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
              status: 'active',
            });
            if (newOrg?.id) {
              finalOrgId = newOrg.id;
            } else if (orgErr) {
              console.warn('[Auth] Aviso ao criar organização após autenticação:', orgErr.message);
            }
          } catch (orgErr) {
            console.warn('[Auth] Falha na criação da organização pós-autenticação:', orgErr);
          }
        }

        // Criar profile no PostgreSQL com a sessão do usuário autenticado
        try {
          await profilesService.create({
            id: data.user.id,
            user_id: data.user.id,
            organization_id: finalOrgId || 'org-alpha',
            full_name: name.trim(),
            email: email.trim(),
            role,
            status: 'active',
            is_active: true,
          });
        } catch (profErr) {
          console.warn('[Auth] Aviso ao registrar profile após autenticação:', profErr);
        }

        // Carregar os dados completos do usuário recém-criado
        await loadUserData(data.user);
      }

      return { error: null, requiresConfirmation: false, user: data.user };
    } catch (err: any) {
      logAuthError('signUp:exception', err);
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      setOrganization(null);
      setPermissions([]);
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!profile) return { error: new Error('Usuário não autenticado') };
    try {
      const { data: updated, error } = await profilesService.update(profile.id, data);
      if (error) return { error: new Error(error.message) };
      if (updated) {
        setProfile(updated);
      }
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const switchOrganization = async (orgId: string) => {
    if (!profile) return;
    try {
      const { data: updatedProfile } = await profilesService.update(profile.id, {
        organization_id: orgId,
      });
      if (updatedProfile) {
        setProfile(updatedProfile);
        const { data: orgData } = await organizationsService.getById(orgId);
        setOrganization(orgData || null);
      }
    } catch (err) {
      console.error('[Auth] Erro ao alternar organização:', err);
    }
  };

  const hasPermission = (
    module: AppModule,
    action: 'view' | 'create' | 'edit' | 'delete' = 'view'
  ): boolean => {
    if (!profile) return false;
    // Superadmin and Admin have global access across all modules
    if (profile.role === 'superadmin' || profile.role === 'admin') return true;

    // Leader has access to field, stickers, and crm
    if (profile.role === 'leader') {
      if (module === 'field' || module === 'stickers' || module === 'crm') return true;
      return false;
    }

    // Coordinator has access to coordinators, leaders, crm, goals, field, stickers, events, meetings, presence
    if (profile.role === 'coordinator') {
      if (
        module === 'coordinators' ||
        module === 'leaders' ||
        module === 'crm' ||
        module === 'goals' ||
        module === 'field' ||
        module === 'stickers' ||
        module === 'events' ||
        module === 'meetings' ||
        module === 'presence'
      ) {
        return true;
      }
    }

    // Check granular module permissions if explicitly assigned
    const userPerm = permissions.find((p) => p.module === module);
    if (!userPerm) return false;

    if (action === 'view') return Boolean(userPerm.can_view);
    if (action === 'create') return Boolean(userPerm.can_create);
    if (action === 'edit') return Boolean(userPerm.can_edit);
    if (action === 'delete') return Boolean(userPerm.can_delete);

    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        organization,
        organizations,
        permissions,
        isLoading,
        isConfigured: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        updateProfile,
        switchOrganization,
        hasPermission,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
