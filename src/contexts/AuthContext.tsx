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
  initializationError: string | null;
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
 * Utilitário para envolver chamadas assíncronas com timeout estrito.
 * Impede que queries travadas na rede ou no Supabase deixem o estado em loading infinito.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(errorMessage);
      err.name = 'TimeoutError';
      (err as any).status = 408;
      reject(err);
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
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
  const [initializationError, setInitializationError] = useState<string | null>(null);

  // Fetch full user profile, organization, and RBAC permissions from real Supabase
  const loadUserData = useCallback(async (authUser: User): Promise<{
    profile: Profile | null;
    organization: Organization | null;
    permissions: UserModulePermission[];
  }> => {
    console.log('[NEXUS AUTH] loadUserData:start', { userId: authUser.id });
    setProfileError(null);

    let activeProfile: Profile | null = null;
    try {
      // 1. Fetch user profile from public.profiles with timeout
      console.log('[NEXUS AUTH] profile:start', { userId: authUser.id });
      try {
        const { data: userProfile, error: profileErr } = await withTimeout(
          profilesService.getById(authUser.id),
          7000,
          'Tempo limite excedido ao consultar public.profiles'
        );

        if (profileErr) {
          console.error('[NEXUS AUTH] profile:error', {
            stage: 'profile',
            name: profileErr.name || 'PostgrestError',
            message: profileErr.message,
            status: profileErr.code || (profileErr as any).status || 500,
          });
        } else {
          activeProfile = userProfile;
        }
      } catch (profEx: any) {
        console.error('[NEXUS AUTH] profile:error', {
          stage: 'profile',
          name: profEx?.name || 'Error',
          message: profEx?.message || 'Erro ao consultar perfil',
          status: profEx?.status || 504,
        });
      }

      // Se perfil localizado com sucesso
      if (activeProfile) {
        console.log('[NEXUS AUTH] profile:success', { role: activeProfile.role });
      } else {
        // Se o usuário está autenticado no Supabase Auth, mas ainda não possui registro em public.profiles
        // (caso de primeiro login após confirmação de e-mail)
        const metadata = authUser.user_metadata || {};
        const fallbackName = metadata.full_name || metadata.name || authUser.email?.split('@')[0] || 'Usuário';
        const fallbackRole = (metadata.role as UserRole) || 'admin';
        
        let orgId = metadata.organization_id;
        
        // Se organization_id não constar nos metadados, consultar organizações existentes antes de criar
        if (!orgId) {
          try {
            const { data: existingOrgs, error: orgsErr } = await withTimeout(
              organizationsService.getAll(),
              5000,
              'Tempo limite ao buscar organizações existentes'
            );

            if (orgsErr) {
              console.warn('[NEXUS AUTH] organization:warn', {
                stage: 'organization_query',
                name: orgsErr.name,
                message: orgsErr.message,
                status: orgsErr.code,
              });
            }

            const orgName = metadata.organization_name || `Campanha ${fallbackName.split(' ')[0]}`;
            const orgSlug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-');

            const matchedOrg = existingOrgs?.find(
              (o) => o.slug === orgSlug || o.name.toLowerCase() === orgName.toLowerCase()
            );

            if (matchedOrg) {
              orgId = matchedOrg.id;
            } else {
              const { data: newOrg, error: newOrgErr } = await withTimeout(
                organizationsService.create({
                  name: orgName,
                  slug: orgSlug,
                  plan: 'professional',
                  status: 'active',
                }),
                6000,
                'Tempo limite ao provisionar organização'
              );

              if (newOrg) {
                orgId = newOrg.id;
              } else if (newOrgErr) {
                console.error('[NEXUS AUTH] organization_provision:error', {
                  stage: 'organization_provision',
                  name: newOrgErr.name,
                  message: newOrgErr.message,
                  status: newOrgErr.code,
                });
                if (existingOrgs && existingOrgs.length > 0) {
                  orgId = existingOrgs[0].id;
                }
              }
            }
          } catch (orgEx: any) {
            console.error('[NEXUS AUTH] organization_provision:error', {
              stage: 'organization_provision',
              name: orgEx?.name,
              message: orgEx?.message,
              status: orgEx?.status || 500,
            });
          }
        }

        // Provisionar perfil em public.profiles
        try {
          const { data: createdProfile, error: createProfileErr } = await withTimeout(
            profilesService.create({
              id: authUser.id,
              user_id: authUser.id,
              organization_id: orgId || '',
              full_name: fallbackName,
              email: authUser.email || '',
              role: fallbackRole,
              status: 'active',
              is_active: true,
            }),
            6000,
            'Tempo limite ao provisionar perfil'
          );

          if (createProfileErr) {
            const errMsg = `Falha ao provisionar perfil em public.profiles: ${createProfileErr.message}`;
            console.error('[NEXUS AUTH] profile:error', {
              stage: 'profile_provision',
              name: createProfileErr.name,
              message: createProfileErr.message,
              status: createProfileErr.code,
            });
            setProfileError(errMsg);
            setInitializationError(errMsg);
          } else if (createdProfile) {
            activeProfile = createdProfile;
            console.log('[NEXUS AUTH] profile:success', { role: createdProfile.role, provisioned: true });
          }
        } catch (createEx: any) {
          const errMsg = createEx?.message || 'Falha ao provisionar perfil';
          console.error('[NEXUS AUTH] profile:error', {
            stage: 'profile_provision',
            name: createEx?.name,
            message: createEx?.message,
            status: createEx?.status || 500,
          });
          setProfileError(errMsg);
          setInitializationError(errMsg);
        }
      }

      if (!activeProfile) {
        const notFoundMsg = 'Perfil de usuário não encontrado em public.profiles.';
        setProfileError((prev) => prev || notFoundMsg);
        setInitializationError((prev) => prev || notFoundMsg);
      }

      setProfile(activeProfile || null);

      // 2. Fetch active organization
      let loadedOrg: Organization | null = null;
      if (activeProfile?.organization_id) {
        try {
          const { data: orgData, error: orgErr } = await withTimeout(
            organizationsService.getById(activeProfile.organization_id),
            6000,
            'Tempo limite ao carregar organização ativa'
          );
          if (orgErr) {
            console.warn('[NEXUS AUTH] organization:warn', {
              stage: 'organization',
              name: orgErr.name,
              message: orgErr.message,
              status: (orgErr as any).code,
            });
          } else if (orgData) {
            loadedOrg = orgData;
          }
        } catch (orgEx: any) {
          console.warn('[NEXUS AUTH] organization:warn', {
            stage: 'organization',
            name: orgEx?.name,
            message: orgEx?.message,
            status: orgEx?.status || 408,
          });
        }
      }
      setOrganization(loadedOrg);

      // Carregar lista de organizações (não-bloqueante com fallback)
      try {
        const { data: allOrgs } = await withTimeout(
          organizationsService.getAll(),
          5000,
          'Tempo limite ao listar organizações'
        );
        setOrganizations(allOrgs || (loadedOrg ? [loadedOrg] : []));
      } catch {
        setOrganizations(loadedOrg ? [loadedOrg] : []);
      }

      // 3. Fetch module-level permissions
      console.log('[NEXUS AUTH] permissions:start', { profileId: activeProfile?.id });
      let loadedPerms: UserModulePermission[] = [];
      if (activeProfile?.id) {
        try {
          const { data: perms, error: permsErr } = await withTimeout(
            permissionsService.getByUserId(activeProfile.id),
            7000,
            'Tempo limite excedido ao consultar user_module_permissions'
          );
          if (permsErr) {
            console.error('[NEXUS AUTH] permissions:error', {
              stage: 'permissions',
              name: permsErr.name || 'PostgrestError',
              message: permsErr.message,
              status: (permsErr as any).code || (permsErr as any).status || 500,
            });
          } else {
            loadedPerms = perms || [];
            console.log('[NEXUS AUTH] permissions:success', { count: loadedPerms.length });
          }
        } catch (permsEx: any) {
          console.error('[NEXUS AUTH] permissions:error', {
            stage: 'permissions',
            name: permsEx?.name || 'Error',
            message: permsEx?.message,
            status: permsEx?.status || 504,
          });
        }
      } else {
        console.log('[NEXUS AUTH] permissions:success', { count: 0, reason: 'no_profile' });
      }
      setPermissions(loadedPerms);

      console.log('[NEXUS AUTH] loadUserData:complete', {
        hasProfile: Boolean(activeProfile),
        permissionsCount: loadedPerms.length,
      });

      return {
        profile: activeProfile || null,
        organization: loadedOrg,
        permissions: loadedPerms,
      };
    } catch (err: any) {
      console.error('[NEXUS AUTH] loadUserData:error', {
        stage: 'loadUserData',
        name: err?.name || 'Error',
        message: err?.message || 'Erro inesperado ao carregar dados do usuário',
        status: err?.status || err?.code || 500,
      });
      setProfileError(err?.message || 'Erro inesperado ao carregar perfil.');
      setInitializationError(err?.message || 'Erro inesperado ao carregar sessão.');
      return {
        profile: null,
        organization: null,
        permissions: [],
      };
    }
  }, []);

  // Mutex para evitar execuções concorrentes duplicadas de loadUserData
  const inFlightPromiseRef = React.useRef<Promise<{
    profile: Profile | null;
    organization: Organization | null;
    permissions: UserModulePermission[];
  }> | null>(null);

  const loadUserDataSafe = useCallback(
    async (authUser: User) => {
      if (inFlightPromiseRef.current) {
        return inFlightPromiseRef.current;
      }
      const promise = loadUserData(authUser).finally(() => {
        inFlightPromiseRef.current = null;
      });
      inFlightPromiseRef.current = promise;
      return promise;
    },
    [loadUserData]
  );

  // Initialize session and subscribe to Supabase Auth state changes
  useEffect(() => {
    let isMounted = true;

    // Safety watchdog timer: maximum 10 seconds in loading state
    const watchdog = setTimeout(() => {
      if (isMounted) {
        setIsLoading((currentLoading) => {
          if (currentLoading) {
            console.warn('[NEXUS AUTH] loading:watchdog_timeout', {
              stage: 'watchdog',
              name: 'WatchdogTimeout',
              message: 'Tempo limite global de inicialização (10s) excedido.',
              status: 408,
            });
            console.log('[NEXUS AUTH] loading:false');
            setInitializationError(
              'Tempo limite excedido ao sincronizar com o banco de dados. Verifique sua conexão e tente novamente.'
            );
            return false;
          }
          return false;
        });
      }
    }, 10000);

    async function initAuth() {
      if (!isSupabaseConfigured) {
        console.log('[NEXUS AUTH] supabase:not_configured');
        if (isMounted) {
          console.log('[NEXUS AUTH] loading:false');
          setIsLoading(false);
        }
        return;
      }

      console.log('[NEXUS AUTH] getSession:start');
      try {
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          7000,
          'Tempo limite excedido ao recuperar sessão do Supabase'
        );

        if (error) {
          console.error('[NEXUS AUTH] getSession:error', {
            stage: 'getSession',
            name: error.name,
            message: error.message,
            status: error.status || 500,
          });
          if (isMounted) {
            setInitializationError(error.message);
          }
        } else {
          console.log('[NEXUS AUTH] getSession:success', { hasSession: Boolean(data?.session) });
        }

        if (isMounted) {
          const currentSession = data?.session || null;
          setSession(currentSession);
          setUser(currentSession?.user || null);

          if (currentSession?.user) {
            await loadUserDataSafe(currentSession.user);
          }
        }
      } catch (err: any) {
        console.error('[NEXUS AUTH] initAuth:error', {
          stage: 'initAuth',
          name: err?.name,
          message: err?.message,
          status: err?.status || err?.code || 500,
        });
        if (isMounted) {
          setInitializationError(err?.message || 'Falha ao inicializar a autenticação.');
        }
      } finally {
        if (isMounted) {
          console.log('[NEXUS AUTH] loading:false');
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

      console.log(`[NEXUS AUTH] onAuthStateChange:${event}`, { hasUser: Boolean(newSession?.user) });

      try {
        setSession(newSession);
        setUser(newSession?.user || null);

        if (newSession?.user) {
          setIsLoading(true);
          await loadUserDataSafe(newSession.user);
        } else {
          setProfile(null);
          setOrganization(null);
          setPermissions([]);
          setProfileError(null);
          setInitializationError(null);
        }
      } catch (authChangeErr: any) {
        console.error('[NEXUS AUTH] onAuthStateChange:error', {
          stage: 'onAuthStateChange',
          name: authChangeErr?.name,
          message: authChangeErr?.message,
          status: authChangeErr?.status || authChangeErr?.code || 500,
        });
        if (isMounted) {
          setInitializationError(authChangeErr?.message || 'Erro ao sincronizar sessão.');
        }
      } finally {
        if (isMounted) {
          console.log('[NEXUS AUTH] loading:false');
          setIsLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(watchdog);
      subscription.unsubscribe();
    };
  }, [loadUserDataSafe]);

  const refreshUserData = async () => {
    setIsLoading(true);
    setInitializationError(null);
    setProfileError(null);
    try {
      if (user) {
        await loadUserDataSafe(user);
      } else {
        const { data } = await withTimeout(
          supabase.auth.getSession(),
          7000,
          'Tempo limite ao recuperar sessão'
        );
        if (data?.session?.user) {
          setUser(data.session.user);
          setSession(data.session);
          await loadUserDataSafe(data.session.user);
        }
      }
    } catch (err: any) {
      console.error('[NEXUS AUTH] refreshUserData:error', {
        stage: 'refreshUserData',
        name: err?.name,
        message: err?.message,
        status: err?.status || 500,
      });
      setInitializationError(err?.message || 'Falha ao recarregar dados do usuário.');
    } finally {
      console.log('[NEXUS AUTH] loading:false');
      setIsLoading(false);
    }
  };

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: AuthError | Error | null; defaultRoute?: string }> => {
    setIsLoading(true);
    setInitializationError(null);
    setProfileError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        logAuthError('signIn', error);
        console.log('[NEXUS AUTH] loading:false');
        setIsLoading(false);
        return { error };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        const { profile: loadedProfile, permissions: loadedPerms } = await loadUserDataSafe(data.user);
        const route = getDefaultRouteForUser(loadedProfile, loadedPerms);
        console.log('[NEXUS AUTH] loading:false');
        setIsLoading(false);
        return { error: null, defaultRoute: route };
      }

      console.log('[NEXUS AUTH] loading:false');
      setIsLoading(false);
      return { error: null, defaultRoute: '/app/dashboard' };
    } catch (err: any) {
      logAuthError('signIn:catch', err);
      console.log('[NEXUS AUTH] loading:false');
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
        initializationError,
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
