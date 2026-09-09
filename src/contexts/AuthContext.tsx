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
  profileError: string | null;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null; defaultRoute?: string }>;
  signUp: (params: SignUpParams) => Promise<SignUpResult>;
  signOut: () => Promise<{ error: AuthError | Error | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | Error | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | Error | null }>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: Error | null }>;
  switchOrganization: (orgId: string) => Promise<void>;
  hasPermission: (module: AppModule, action?: 'view' | 'create' | 'edit' | 'delete') => boolean;
  getDefaultRoute: () => string;
  refreshUserData: () => Promise<void>;
}

/**
 * Normaliza a role apenas para comparação no frontend.
 * Não altera o valor original armazenado no banco de dados.
 * superadmin, Super Admin, SUPERADMIN e super_admin -> 'superadmin'
 * admin, ADMIN etc. -> 'admin'
 */
export function normalizeRole(role: unknown): string {
  if (!role) return '';
  const clean = String(role).toLowerCase().replace(/[\s_-]/g, '');
  if (clean === 'superadmin' || clean === 'superadministrador') return 'superadmin';
  if (clean === 'admin' || clean === 'administrador' || clean === 'adm') return 'admin';
  if (clean === 'coordinator' || clean === 'coordenador') return 'coordinator';
  if (clean === 'leader' || clean === 'lider' || clean === 'lideranca') return 'leader';
  if (clean === 'manager' || clean === 'gerente') return 'manager';
  if (clean === 'operator' || clean === 'operador') return 'operator';
  if (clean === 'viewer' || clean === 'visualizador') return 'viewer';
  return clean;
}

/**
 * Avalia se o usuário tem permissão para uma ação sobre um módulo.
 * Superadmin e admin possuem acesso global irrestrito aos módulos administrativos.
 * Demais roles respeitam a matriz estrita do sistema e user_module_permissions.
 */
export function checkUserPermission(
  userProfile: Profile | null,
  perms: UserModulePermission[],
  module: AppModule,
  action: 'view' | 'create' | 'edit' | 'delete' = 'view'
): boolean {
  if (!userProfile) return false;

  const normRole = normalizeRole(userProfile.role);

  // 1. Superadmin e Admin têm acesso global aos módulos administrativos
  if (normRole === 'superadmin' || normRole === 'admin') {
    return true;
  }

  // 2. Leader tem acesso restrito a field, stickers e crm
  if (normRole === 'leader') {
    if (module === 'field' || module === 'stickers' || module === 'crm') return true;
    return false;
  }

  // 3. Coordinator tem acesso aos seus módulos operacionais específicos (não inclui dashboard)
  if (normRole === 'coordinator') {
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

  // 4. Demais roles (manager, operator, viewer) e módulos complementares: consultar user_module_permissions
  const userPerm = perms.find((p) => p.module === module);
  if (!userPerm) return false;

  if (action === 'view') return Boolean(userPerm.can_view);
  if (action === 'create') return Boolean(userPerm.can_create);
  if (action === 'edit') return Boolean(userPerm.can_edit);
  if (action === 'delete') return Boolean(userPerm.can_delete);

  return false;
}

/**
 * Retorna a rota padrão para onde o usuário deve ser redirecionado após login,
 * garantindo que ele seja enviado para uma rota que realmente possa visualizar.
 */
export function getDefaultRouteForUser(
  userProfile: Profile | null,
  perms: UserModulePermission[]
): string {
  if (!userProfile) return '/login';

  const hasPerm = (mod: AppModule, act: 'view' | 'create' | 'edit' | 'delete' = 'view') =>
    checkUserPermission(userProfile, perms, mod, act);

  const normRole = normalizeRole(userProfile.role);

  // superadmin → /app/dashboard
  // admin → /app/dashboard
  if (normRole === 'superadmin' || normRole === 'admin') {
    return '/app/dashboard';
  }

  // leader → /app/campo, se tiver field.view
  if (normRole === 'leader') {
    if (hasPerm('field', 'view')) return '/app/campo';
    if (hasPerm('crm', 'view')) return '/app/crm';
    if (hasPerm('stickers', 'view')) return '/app/adesivos';
    return '/403';
  }

  // coordinator, manager, operator, viewer → primeiro módulo permitido
  const candidateModules: Array<{ module: AppModule; route: string }> = [
    { module: 'dashboard', route: '/app/dashboard' },
    { module: 'coordinators', route: '/app/coordenadores' },
    { module: 'leaders', route: '/app/liderancas' },
    { module: 'crm', route: '/app/crm' },
    { module: 'goals', route: '/app/metas' },
    { module: 'field', route: '/app/campo' },
    { module: 'events', route: '/app/eventos' },
    { module: 'meetings', route: '/app/reunioes' },
    { module: 'presence', route: '/app/presenca' },
    { module: 'materials', route: '/app/materiais' },
    { module: 'stickers', route: '/app/adesivos' },
    { module: 'reports', route: '/app/relatorios' },
    { module: 'intelligence', route: '/app/inteligencia' },
    { module: 'users', route: '/app/usuarios' },
    { module: 'organizations', route: '/app/organizacoes' },
    { module: 'settings', route: '/app/configuracoes' },
  ];

  for (const candidate of candidateModules) {
    if (hasPerm(candidate.module, 'view')) {
      return candidate.route;
    }
  }

  return '/403';
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
  const [profileError, setProfileError] = useState<string | null>(null);

  // Fetch full user profile, organization, and RBAC permissions from real Supabase
  const loadUserData = useCallback(async (authUser: User): Promise<{
    profile: Profile | null;
    organization: Organization | null;
    permissions: UserModulePermission[];
  }> => {
    setProfileError(null);
    try {
      // 1. Fetch user profile from public.profiles
      const { data: userProfile, error: profileErr } = await profilesService.getById(authUser.id);

      if (profileErr) {
        console.error('[Auth] Erro ao carregar perfil de public.profiles:', {
          userId: authUser.id,
          message: profileErr.message,
          code: profileErr.code,
          details: profileErr.details,
        });
      }

      let activeProfile = userProfile;

      // Se o usuário está autenticado no Supabase Auth, mas ainda não possui registro em public.profiles
      // (caso de primeiro login após confirmação de e-mail)
      if (!activeProfile) {
        const metadata = authUser.user_metadata || {};
        const fallbackName = metadata.full_name || metadata.name || authUser.email?.split('@')[0] || 'Usuário';
        const fallbackRole = (metadata.role as UserRole) || 'admin';
        
        let orgId = metadata.organization_id;
        
        // Se organization_id não constar nos metadados, consultar organizações existentes antes de criar
        if (!orgId) {
          const { data: existingOrgs, error: orgsErr } = await organizationsService.getAll();
          if (orgsErr) {
            console.warn('[Auth] Erro ao listar organizações existentes:', orgsErr.message);
          }

          const orgName = metadata.organization_name || `Campanha ${fallbackName.split(' ')[0]}`;
          const orgSlug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-');

          // Prevenção de duplicação: checar se já existe organização com mesmo slug ou nome
          const matchedOrg = existingOrgs?.find(
            (o) => o.slug === orgSlug || o.name.toLowerCase() === orgName.toLowerCase()
          );

          if (matchedOrg) {
            orgId = matchedOrg.id;
          } else {
            // Provisionar organização para o primeiro login
            const { data: newOrg, error: newOrgErr } = await organizationsService.create({
              name: orgName,
              slug: orgSlug,
              plan: 'professional',
              status: 'active',
            });

            if (newOrg) {
              orgId = newOrg.id;
            } else if (newOrgErr) {
              console.error('[Auth] Falha ao provisionar organização (RLS ou restrição de banco):', {
                message: newOrgErr.message,
                code: newOrgErr.code,
                details: newOrgErr.details,
              });
              // Vincular à primeira organização existente disponível, sem criar org-alpha silencioso
              if (existingOrgs && existingOrgs.length > 0) {
                orgId = existingOrgs[0].id;
              }
            }
          }
        }

        if (!orgId) {
          console.error('[Auth] Impossível determinar organization_id válida para o usuário', authUser.id);
        }

        // Provisionar perfil em public.profiles
        const { data: createdProfile, error: createProfileErr } = await profilesService.create({
          id: authUser.id,
          user_id: authUser.id,
          organization_id: orgId || '',
          full_name: fallbackName,
          email: authUser.email || '',
          role: fallbackRole,
          status: 'active',
          is_active: true,
        });

        if (createProfileErr) {
          const errMsg = `Falha ao provisionar perfil em public.profiles para o usuário ${authUser.id} (possível restrição de RLS no PostgreSQL): ${createProfileErr.message}`;
          console.error('[Auth]', errMsg, {
            code: createProfileErr.code,
            details: createProfileErr.details,
            hint: createProfileErr.hint,
          });
          setProfileError(errMsg);
        } else if (createdProfile) {
          activeProfile = createdProfile;
        }
      }

      setProfile(activeProfile || null);

      // 2. Fetch active organization
      let loadedOrg: Organization | null = null;
      if (activeProfile?.organization_id) {
        const { data: orgData, error: orgErr } = await organizationsService.getById(activeProfile.organization_id);
        if (orgErr) {
          console.warn('[Auth] Erro ao carregar organização ativa:', orgErr.message);
        }
        loadedOrg = orgData || null;
        setOrganization(loadedOrg);
      } else {
        setOrganization(null);
      }

      const { data: allOrgs } = await organizationsService.getAll();
      setOrganizations(allOrgs || []);

      // 3. Fetch module-level permissions
      let loadedPerms: UserModulePermission[] = [];
      if (activeProfile?.id) {
        const { data: perms, error: permsErr } = await permissionsService.getByUserId(activeProfile.id);
        if (permsErr) {
          console.warn('[Auth] Erro ao carregar permissões de módulos:', permsErr.message);
        }
        loadedPerms = perms || [];
        setPermissions(loadedPerms);
      } else {
        setPermissions([]);
      }

      return {
        profile: activeProfile || null,
        organization: loadedOrg,
        permissions: loadedPerms,
      };
    } catch (err: any) {
      console.error('[Auth] Erro inesperado ao carregar dados do usuário:', err);
      setProfileError(err?.message || 'Erro inesperado ao carregar perfil.');
      return {
        profile: null,
        organization: null,
        permissions: [],
      };
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
        setIsLoading(true);
        await loadUserData(newSession.user);
      } else {
        setProfile(null);
        setOrganization(null);
        setPermissions([]);
        setProfileError(null);
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
      setIsLoading(true);
      await loadUserData(user);
      setIsLoading(false);
    }
  };

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: AuthError | Error | null; defaultRoute?: string }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        logAuthError('signIn', error);
        setIsLoading(false);
        return { error };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        const { profile: loadedProfile, permissions: loadedPerms } = await loadUserData(data.user);
        const route = getDefaultRouteForUser(loadedProfile, loadedPerms);
        setIsLoading(false);
        return { error: null, defaultRoute: route };
      }

      setIsLoading(false);
      return { error: null, defaultRoute: '/app/dashboard' };
    } catch (err: any) {
      logAuthError('signIn:catch', err);
      setIsLoading(false);
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

  const hasPermission = useCallback(
    (module: AppModule, action: 'view' | 'create' | 'edit' | 'delete' = 'view'): boolean => {
      return checkUserPermission(profile, permissions, module, action);
    },
    [profile, permissions]
  );

  const getDefaultRoute = useCallback((): string => {
    return getDefaultRouteForUser(profile, permissions);
  }, [profile, permissions]);

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
        profileError,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        updateProfile,
        switchOrganization,
        hasPermission,
        getDefaultRoute,
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
