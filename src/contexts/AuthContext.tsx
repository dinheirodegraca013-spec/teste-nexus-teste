import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, supabaseUrl } from '../lib/supabase';
import { Organization, Profile, UserRole, AppModule, UserModulePermission } from '../types';
import { organizationsService, profilesService, permissionsService, isValidUUID } from '../services';

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

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(errorMessage);
      err.name = 'TimeoutError';
      (err as any).status = 408;
      reject(err);
    }, timeoutMs);
  });
  return Promise.race([Promise.resolve(promise), timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export function normalizeRole(role: unknown): string {
  if (!role) return '';
  const clean = String(role).toLowerCase().replace(/[\s_-]/g, '');
  if (clean === 'superadmin' || clean === 'superadministrador') return 'superadmin';
  if (clean === 'admin' || clean === 'administrador' || clean === 'adm') return 'admin';
  if (clean === 'coordinator' || clean === 'coordenador') return 'coordinator';
  if (clean === 'controller' || clean === 'controlador') return 'controller';
  if (clean === 'leader' || clean === 'lider' || clean === 'lideranca') return 'leader';
  if (clean === 'manager' || clean === 'gerente') return 'manager';
  if (clean === 'operator' || clean === 'operador') return 'operator';
  if (clean === 'viewer' || clean === 'visualizador') return 'viewer';
  return clean;
}

export function checkUserPermission(
  userProfile: Profile | null,
  perms: UserModulePermission[],
  module: AppModule,
  action: 'view' | 'create' | 'edit' | 'delete' = 'view'
): boolean {
  if (!userProfile || userProfile.is_blocked) return false;

  const normRole = normalizeRole(userProfile.role);
  if (normRole === 'superadmin' || normRole === 'admin') return true;
  if (normRole === 'leader') {
    if (module === 'field' || module === 'stickers' || module === 'crm') return true;
    return false;
  }
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
    ) return true;
  }

  const userPerm = perms.find((p) => p.module === module);
  if (!userPerm) return false;
  if (action === 'view') return Boolean(userPerm.can_view);
  if (action === 'create') return Boolean(userPerm.can_create);
  if (action === 'edit') return Boolean(userPerm.can_edit);
  if (action === 'delete') return Boolean(userPerm.can_delete);
  return false;
}

export function getDefaultRouteForUser(userProfile: Profile | null, perms: UserModulePermission[]): string {
  if (userProfile?.is_blocked) return '/403';
  if (!userProfile) return '/app/dashboard';
  const hasPerm = (mod: AppModule, act: 'view' | 'create' | 'edit' | 'delete' = 'view') =>
    checkUserPermission(userProfile, perms, mod, act);
  const normRole = normalizeRole(userProfile.role);
  if (normRole === 'superadmin' || normRole === 'admin') return '/app/dashboard';
  if (normRole === 'leader') {
    return hasPerm('field', 'view') ? '/app/campo' : hasPerm('crm', 'view') ? '/app/crm' : hasPerm('stickers', 'view') ? '/app/adesivos' : '/403';
  }
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
    if (hasPerm(candidate.module, 'view')) return candidate.route;
  }
  return '/403';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isSigningInRef = useRef<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [permissions, setPermissions] = useState<UserModulePermission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  const loadUserData = useCallback(async (authUser: User): Promise<{
    profile: Profile | null;
    organization: Organization | null;
    permissions: UserModulePermission[];
  }> => {
    setProfileError(null);
    let activeProfile: Profile | null = null;
    try {
      try {
        const { data: userProfile, error: profileErr } = await withTimeout(
          profilesService.getById(authUser.id),
          7000,
          'Tempo limite excedido ao consultar public.profiles'
        );
        if (profileErr) throw profileErr;
        activeProfile = userProfile;
      } catch (profEx: any) {
        console.error('[NEXUS AUTH] profile:error', profEx?.message || profEx);
        throw profEx;
      }

      if (activeProfile) {
        console.log('[NEXUS AUTH] profile:success', { role: activeProfile.role });
      } else {
        const metadata = authUser.user_metadata || {};
        const metadataRole = normalizeRole(metadata.role);
        const hasInvitedOrganization = isValidUUID(metadata.organization_id);
        const isInvitedRole = ['coordinator', 'controller', 'leader', 'manager', 'operator', 'viewer'].includes(metadataRole);

        // A missing profile for an invited account must never trigger creation of a new tenant.
        // The existing provision_new_user RPC always creates a new organization and an admin profile.
        if (hasInvitedOrganization || isInvitedRole) {
          const errMsg = 'Esta conta foi cadastrada por convite, mas o perfil ainda não foi provisionado na organização correta. O acesso foi bloqueado para evitar criar uma organização indevida. Solicite ao administrador que conclua o provisionamento.';
          setProfile(null);
          setOrganization(null);
          setPermissions([]);
          setProfileError(errMsg);
          setInitializationError(errMsg);
          return { profile: null, organization: null, permissions: [] };
        }

        const profileName = metadata.full_name || metadata.name || authUser.email?.split('@')[0] || 'Usuário';
        const orgName = metadata.organization_name || `Campanha de ${profileName.split(' ')[0]}`;
        const orgSlug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        try {
          const { data: rpcOrgId, error: rpcErr } = await withTimeout<any>(
            Promise.resolve(supabase.rpc('provision_new_user', {
              p_org_name: orgName,
              p_org_slug: orgSlug,
              p_campaign_type: 'DEPUTADO_FEDERAL',
              p_profile_name: profileName,
            })),
            8000,
            'Tempo limite ao provisionar usuário via RPC'
          );
          if (rpcErr) {
            const errMsg = `Falha no provisionamento do usuário (RPC): ${rpcErr.message}`;
            setProfileError(errMsg);
            setInitializationError(errMsg);
            return { profile: null, organization: null, permissions: [] };
          }
          console.log('[NEXUS PROVISION] RPC provision_new_user concluída com sucesso:', { rpcOrgId });
          const { data: createdProfile, error: reloadErr } = await withTimeout(
            profilesService.getById(authUser.id),
            6000,
            'Tempo limite ao carregar perfil recém-provisionado'
          );
          if (reloadErr || !createdProfile) {
            const errMsg = reloadErr?.message || 'Perfil de usuário não encontrado após provisionamento.';
            setProfileError(errMsg);
            setInitializationError(errMsg);
            return { profile: null, organization: null, permissions: [] };
          }
          activeProfile = createdProfile;
        } catch (rpcEx: any) {
          const errMsg = rpcEx?.message || 'Erro inesperado durante provisionamento via RPC.';
          setProfileError(errMsg);
          setInitializationError(errMsg);
          return { profile: null, organization: null, permissions: [] };
        }
      }

      setProfile(activeProfile || null);

      let loadedOrg: Organization | null = null;
      if (activeProfile?.organization_id) {
        try {
          const { data: orgData, error: orgErr } = await withTimeout(
            organizationsService.getById(activeProfile.organization_id),
            6000,
            'Tempo limite ao carregar organização ativa'
          );
          if (!orgErr && orgData) loadedOrg = orgData;
        } catch (orgEx: any) {
          console.warn('[NEXUS AUTH] organization:warn', orgEx?.message || orgEx);
        }
      }
      setOrganization(loadedOrg);

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

      let loadedPerms: UserModulePermission[] = [];
      if (activeProfile?.id) {
        try {
          const { data: perms, error: permsErr } = await withTimeout(
            permissionsService.getByUserId(activeProfile.id),
            7000,
            'Tempo limite excedido ao consultar user_module_permissions'
          );
          if (!permsErr) loadedPerms = perms || [];
        } catch (permsEx: any) {
          console.error('[NEXUS AUTH] permissions:error', permsEx?.message || permsEx);
        }
      }
      setPermissions(loadedPerms);

      return { profile: activeProfile || null, organization: loadedOrg, permissions: loadedPerms };
    } catch (err: any) {
      // A failed lookup does not establish that the profile is absent.
      // Clear cached access and never provision a tenant on this path.
      setProfile(null);
      setOrganization(null);
      setOrganizations([]);
      setPermissions([]);
      setProfileError(err?.message || 'Erro inesperado ao carregar perfil.');
      setInitializationError(err?.message || 'Erro inesperado ao carregar sessão.');
      return { profile: null, organization: null, permissions: [] };
    }
  }, []);

  const inFlightPromiseRef = React.useRef<Promise<{
    profile: Profile | null;
    organization: Organization | null;
    permissions: UserModulePermission[];
  }> | null>(null);

  const loadUserDataSafe = useCallback(async (authUser: User) => {
    if (inFlightPromiseRef.current) return inFlightPromiseRef.current;
    const promise = loadUserData(authUser).finally(() => {
      inFlightPromiseRef.current = null;
    });
    inFlightPromiseRef.current = promise;
    return promise;
  }, [loadUserData]);

  useEffect(() => {
    let isMounted = true;
    const watchdog = setTimeout(() => {
      if (isMounted) {
        setIsLoading((currentLoading) => currentLoading ? false : false);
        setInitializationError('Tempo limite excedido ao sincronizar com o banco de dados. Verifique sua conexão e tente novamente.');
      }
    }, 10000);

    async function initAuth() {
      if (!isSupabaseConfigured) {
        clearTimeout(watchdog);
        if (isMounted) setIsLoading(false);
        return;
      }
      try {
        const { data, error } = await withTimeout(supabase.auth.getSession(), 7000, 'Tempo limite excedido ao recuperar sessão do Supabase');
        if (error && isMounted) setInitializationError(error.message);
        if (isMounted) {
          const currentSession = data?.session || null;
          setSession(currentSession);
          setUser(currentSession?.user || null);
          if (currentSession?.user) await loadUserDataSafe(currentSession.user);
        }
      } catch (err: any) {
        if (isMounted) setInitializationError(err?.message || 'Falha ao inicializar a autenticação.');
      } finally {
        clearTimeout(watchdog);
        if (isMounted) setIsLoading(false);
      }
    }

    initAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;
      if (isSigningInRef.current) {
        if (newSession?.user) {
          setUser(newSession.user);
          setSession(newSession);
        }
        return;
      }
      if (event === 'INITIAL_SESSION') {
        if (newSession?.user) {
          setUser(newSession.user);
          setSession(newSession);
        }
        return;
      }
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
        if (isMounted) setInitializationError(authChangeErr?.message || 'Erro ao sincronizar sessão.');
      } finally {
        if (isMounted) setIsLoading(false);
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
        const { data } = await withTimeout(supabase.auth.getSession(), 7000, 'Tempo limite ao recuperar sessão');
        if (data?.session?.user) {
          setUser(data.session.user);
          setSession(data.session);
          await loadUserDataSafe(data.session.user);
        }
      }
    } catch (err: any) {
      setInitializationError(err?.message || 'Falha ao recarregar dados do usuário.');
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: AuthError | Error | null; defaultRoute?: string }> => {
    isSigningInRef.current = true;
    setIsLoading(true);
    setInitializationError(null);
    setProfileError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        logAuthError('signIn', error);
        return { error };
      }
      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        const { profile: loadedProfile, organization: loadedOrg, permissions: loadedPerms } = await loadUserDataSafe(data.user);
        if (!loadedProfile || loadedProfile.is_blocked || !loadedOrg || loadedOrg.id !== loadedProfile.organization_id) {
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          setProfile(null);
          setOrganization(null);
          setPermissions([]);
          return { error: new Error('Acesso bloqueado: perfil ou organização inválidos. Solicite ao administrador a regularização da conta.') };
        }
        return { error: null, defaultRoute: getDefaultRouteForUser(loadedProfile, loadedPerms) };
      }
      return { error: new Error('Falha na autenticação: o servidor não retornou um usuário válido.') };
    } catch (err: any) {
      logAuthError('signIn:catch', err);
      return { error: err };
    } finally {
      isSigningInRef.current = false;
      setIsLoading(false);
    }
  };

  const logAuthError = (operation: string, err: any) => {
    try {
      const parsedHost = supabaseUrl ? new URL(supabaseUrl).hostname : 'configuração-ausente';
      console.error(`[AuthNetworkError][${operation}]`, {
        targetHost: parsedHost,
        errorName: err?.name || 'UnknownError',
        message: err?.message || String(err),
        status: err?.status,
        code: err?.code,
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
    if (!isSupabaseConfigured) {
      const configError = new Error('O backend Supabase não está configurado neste ambiente (as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não foram fornecidas no build da Vercel).');
      logAuthError('signUp:config', configError);
      return { error: configError };
    }

    if (!password || password.length < 8) {
      return { error: new Error('Informe uma senha com pelo menos 8 caracteres para criar sua conta.') };
    }

    try {
      const sanitizedOrgId = (organizationId && isValidUUID(organizationId)) ? organizationId : null;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
            full_name: name.trim(),
            role,
            organization_id: sanitizedOrgId,
            organization_name: organizationName || null,
            leader_id: (leaderId && isValidUUID(leaderId)) ? leaderId : null,
            coordinator_id: (coordinatorId && isValidUUID(coordinatorId)) ? coordinatorId : null,
          },
        },
      });

      if (error) {
        logAuthError('signUp:supabaseAuth', error);
        return { error };
      }
      if (data.user && !data.session) {
        return { error: null, requiresConfirmation: true, user: data.user };
      }
      if (data.user && data.session) {
        setUser(data.user);
        setSession(data.session);
        const orgName = organizationName?.trim() || `Campanha de ${name.trim().split(' ')[0]}`;
        const orgSlug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        try {
          const { data: rpcOrgId, error: rpcErr } = await supabase.rpc('provision_new_user', {
            p_org_name: orgName,
            p_org_slug: orgSlug,
            p_campaign_type: 'DEPUTADO_FEDERAL',
            p_profile_name: name.trim(),
          });
          if (rpcErr) {
            console.error('[NEXUS PROVISION] Erro na RPC provision_new_user no signUp:', rpcErr);
            return { error: new Error('Conta criada, mas não foi possível configurar a organização. Tente entrar novamente ou contate o suporte.'), user: data.user };
          }
          console.log('[NEXUS PROVISION] RPC provision_new_user bem-sucedida no signUp:', { rpcOrgId });
        } catch (rpcEx) {
          console.error('[NEXUS PROVISION] Exceção na RPC provision_new_user no signUp:', rpcEx);
          return { error: new Error('Conta criada, mas houve uma falha ao configurar a organização. Tente entrar novamente ou contate o suporte.'), user: data.user };
        }
        const loaded = await loadUserData(data.user);
        if (!loaded.profile || !loaded.organization) {
          return { error: new Error('Conta criada, mas o perfil ou a organização não está disponível. Tente entrar novamente ou contate o suporte.'), user: data.user };
        }
      }
      return { error: null, requiresConfirmation: false, user: data.user };
    } catch (err: any) {
      logAuthError('signUp:exception', err);
      return { error: err };
    }
  };

  const signOut = async () => {
    isSigningInRef.current = false;
    try {
      const { error } = await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      setOrganization(null);
      setPermissions([]);
      return { error: error || null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) logAuthError('resetPassword', error);
      return { error: error || null };
    } catch (err: any) {
      logAuthError('resetPassword:catch', err);
      return { error: err };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) logAuthError('updatePassword', error);
      return { error: error || null };
    } catch (err: any) {
      logAuthError('updatePassword:catch', err);
      return { error: err };
    }
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) return { error: new Error('Usuário não autenticado.') };
    try {
      const { error } = await profilesService.update(user.id, data);
      if (error) return { error: new Error(error.message) };
      await refreshUserData();
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const switchOrganization = async (orgId: string) => {
    if (!user || !isValidUUID(orgId)) return;
    try {
      const { error } = await profilesService.update(user.id, { organization_id: orgId });
      if (error) throw error;
      await refreshUserData();
    } catch (err: any) {
      setProfileError(err?.message || 'Falha ao alterar organização.');
    }
  };

  const hasPermission = (module: AppModule, action: 'view' | 'create' | 'edit' | 'delete' = 'view') =>
    checkUserPermission(profile, permissions, module, action);

  const getDefaultRoute = () => getDefaultRouteForUser(profile, permissions);

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
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
};

