import React, { useState, useEffect } from 'react';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider, useAuth, getDefaultRouteForUser } from './contexts/AuthContext';
import { PublicLayout } from './components/layout/PublicLayout';
import { AppLayout } from './components/layout/AppLayout';
import { LoadingState } from './components/ui/LoadingState';
import { Button } from './components/ui/Button';
import { ErrorState } from './components/ui/ErrorState';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';
import { ForgotPasswordPage } from './pages/public/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/public/ResetPasswordPage';
import { ConfirmationPage } from './pages/public/ConfirmationPage';
import { TermsPage } from './pages/public/TermsPage';
import { PrivacyPage } from './pages/public/PrivacyPage';
import { ForbiddenPage } from './pages/public/ForbiddenPage';
import { NotFoundPage } from './pages/public/NotFoundPage';

// App Pages
import { DashboardPage } from './pages/app/DashboardPage';
import { OnboardingPage } from './pages/app/OnboardingPage';
import { CoordinatorsPage } from './pages/app/CoordinatorsPage';
import { LeadersPage } from './pages/app/LeadersPage';
import { CrmPage } from './pages/app/CrmPage';
import { GoalsPage } from './pages/app/GoalsPage';
import { FieldPage } from './pages/app/FieldPage';
import { EventsPage } from './pages/app/EventsPage';
import { MeetingsPage } from './pages/app/MeetingsPage';
import { PresencePage } from './pages/app/PresencePage';
import { MaterialsPage } from './pages/app/MaterialsPage';
import { StickersPage } from './pages/app/StickersPage';
import { IntelligencePage } from './pages/app/IntelligencePage';
import { ReportsPage } from './pages/app/ReportsPage';
import { UsersPage } from './pages/app/UsersPage';
import { OrganizationsPage } from './pages/app/OrganizationsPage';
import { PlansPage } from './pages/app/PlansPage';
import { ProfilePage } from './pages/app/ProfilePage';
import { SettingsPage } from './pages/app/SettingsPage';
import { AppModule } from './types';

const routeModuleMap: Record<string, AppModule> = {
  '/app': 'dashboard',
  '/app/dashboard': 'dashboard',
  '/app/coordenadores': 'coordinators',
  '/app/liderancas': 'leaders',
  '/app/crm': 'crm',
  '/app/metas': 'goals',
  '/app/campo': 'field',
  '/app/eventos': 'events',
  '/app/reunioes': 'meetings',
  '/app/presenca': 'presence',
  '/app/materiais': 'materials',
  '/app/adesivos': 'stickers',
  '/app/inteligencia': 'intelligence',
  '/app/relatorios': 'reports',
  '/app/usuarios': 'users',
  '/app/organizacoes': 'organizations',
  '/app/configuracoes': 'settings',
};

function getPathFromLocation(): string {
  let path = window.location.pathname || '/';
  if (window.location.hash && window.location.hash.startsWith('#/')) {
    path = window.location.hash.slice(1).split('?')[0];
  }
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  return path || '/';
}

function MainRouter() {
  const {
    user,
    profile,
    permissions,
    isLoading,
    profileError,
    initializationError,
    hasPermission,
    getDefaultRoute,
    refreshUserData,
    signOut,
  } = useAuth();
  const [currentPath, setCurrentPath] = useState(() => getPathFromLocation());

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(getPathFromLocation());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string, options?: { replace?: boolean }) => {
    console.log('[NEXUS FLOW] NAVIGATE', { from: currentPath, to: path, replace: options?.replace, source: 'App.navigate' });
    if (options?.replace) {
      window.history.replaceState({}, '', path);
    } else {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(getPathFromLocation());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isAppRoute = currentPath.startsWith('/app');
  const isAuthRoute = currentPath === '/login' || currentPath === '/cadastro' || currentPath === '/recuperar-senha';
  const hasInviteParam = typeof window !== 'undefined' && window.location.search.includes('convite=');

  console.log('[NEXUS FLOW] APP_RENDER', {
    currentPath,
    hasUser: Boolean(user),
    hasProfile: Boolean(profile),
    isLoading,
    isAuthRoute,
    isAppRoute,
  });

  // Watchdog de 10s para o estado de redirecionamento pós-login
  const [redirectTimeout, setRedirectTimeout] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (user && isAuthRoute && !profile && !hasInviteParam) {
      timer = setTimeout(() => {
        setRedirectTimeout(true);
      }, 10000);
    } else {
      setRedirectTimeout(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [user, isAuthRoute, profile, hasInviteParam]);

  // Redirecionamento automático quando o usuário já está logado e visita /login ou /cadastro
  useEffect(() => {
    if (user && profile && !isLoading && isAuthRoute && !hasInviteParam) {
      const target = getDefaultRouteForUser(profile, permissions);
      console.log('[NEXUS FLOW] DEFAULT_ROUTE_RESULT', {
        target,
        currentPath,
        role: profile.role,
      });

      // Proteção contra loop de /login para /login ou navegação redundante para mesma rota
      if (target && target !== currentPath && target !== '/login') {
        console.log('[NEXUS FLOW] NAVIGATE', {
          from: currentPath,
          to: target,
          replace: true,
          source: 'useEffect:authRedirect',
        });
        navigate(target, { replace: true });
      }
    }
  }, [user, profile, isLoading, isAuthRoute, hasInviteParam, permissions, currentPath]);

  // Redirecionamento de /app para a primeira rota autorizada
  useEffect(() => {
    if (currentPath === '/app' && user && !isLoading && profile) {
      const target = getDefaultRouteForUser(profile, permissions);
      if (target && target !== '/app' && target !== '/login') {
        navigate(target, { replace: true });
      }
    }
  }, [currentPath, user, isLoading, profile, permissions]);

  // Se a inicialização do Supabase Auth falhou (timeout, rede ou restrição)
  if (initializationError) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-rose-200 shadow-sm text-center">
          <ErrorState
            title="Erro de Inicialização da Sessão"
            message={initializationError}
            onRetry={() => refreshUserData()}
          />
          <div className="mt-4 flex justify-center gap-2">
            <Button size="sm" variant="outline" onClick={() => signOut()}>
              Voltar ao Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-6">
        <LoadingState message="Carregando sessão do NEXUS..." />
      </div>
    );
  }

  // Se tentar acessar /app/* sem estar logado -> redirecionar para /login
  if (isAppRoute && !user) {
    return (
      <PublicLayout currentPath="/login" onNavigate={navigate}>
        <LoginPage onNavigate={navigate} />
      </PublicLayout>
    );
  }

  // Se o usuário está autenticado e em rota privada, mas o perfil não está disponível
  if (isAppRoute && user && !profile) {
    const errorMsg =
      profileError ||
      'Perfil do usuário não encontrado em public.profiles. Verifique suas credenciais ou contate o administrador.';
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-rose-200 shadow-sm text-center">
          <ErrorState
            title="Erro de Perfil no Banco de Dados"
            message={errorMsg}
            onRetry={() => refreshUserData()}
          />
          <div className="mt-4 flex justify-center gap-2">
            <Button size="sm" variant="outline" onClick={() => signOut()}>
              Encerrar Sessão
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // D) Usuário autenticado em rota de autenticação cujo perfil não carregou dentro do timeout (ou erro de perfil)
  if (isAuthRoute && user && !hasInviteParam && (redirectTimeout || profileError)) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-rose-200 shadow-sm text-center">
          <ErrorState
            title="Não foi possível carregar seu perfil"
            message={profileError || 'Não foi possível carregar as informações do seu perfil após a autenticação. Verifique sua conexão e tente novamente.'}
            onRetry={() => {
              setRedirectTimeout(false);
              refreshUserData();
            }}
          />
          <div className="mt-4 flex justify-center gap-2">
            <Button size="sm" variant="outline" onClick={() => signOut()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // B) Se logado e em tela de auth, aguardar brevemente o perfil e o redirecionamento
  if (isAuthRoute && user && !hasInviteParam) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-6">
        <LoadingState message="Redirecionando para seu módulo..." />
      </div>
    );
  }

  // Public Layout Pages
  if (!isAppRoute) {
    let publicContent = <NotFoundPage onNavigate={navigate} />;

    switch (currentPath) {
      case '/':
        publicContent = <LandingPage onNavigate={navigate} />;
        break;
      case '/login':
        publicContent = <LoginPage onNavigate={navigate} />;
        break;
      case '/cadastro':
        publicContent = <RegisterPage onNavigate={navigate} />;
        break;
      case '/recuperar-senha':
        publicContent = <ForgotPasswordPage onNavigate={navigate} />;
        break;
      case '/redefinir-senha':
        publicContent = <ResetPasswordPage onNavigate={navigate} />;
        break;
      case '/confirmacao':
        publicContent = <ConfirmationPage onNavigate={navigate} />;
        break;
      case '/termos':
        publicContent = <TermsPage onNavigate={navigate} />;
        break;
      case '/privacidade':
        publicContent = <PrivacyPage onNavigate={navigate} />;
        break;
      case '/403':
        publicContent = <ForbiddenPage onNavigate={navigate} />;
        break;
      case '/404':
        publicContent = <NotFoundPage onNavigate={navigate} />;
        break;
    }

    return (
      <PublicLayout currentPath={currentPath} onNavigate={navigate}>
        {publicContent}
      </PublicLayout>
    );
  }

  // Route permission gate for private modules
  const requiredModule = routeModuleMap[currentPath];
  console.log('[NEXUS FLOW] ROUTE_GATE', {
    currentPath,
    requiredModule,
    hasViewPermission: requiredModule ? hasPermission(requiredModule, 'view') : true,
  });
  if (requiredModule && !hasPermission(requiredModule, 'view')) {
    return (
      <AppLayout currentPath={currentPath} onNavigate={navigate}>
        <ForbiddenPage
          onNavigate={(path) => {
            if (path === '/app/dashboard') {
              navigate(getDefaultRoute());
            } else {
              navigate(path);
            }
          }}
        />
      </AppLayout>
    );
  }

  // Private App Pages
  let appContent = <NotFoundPage onNavigate={navigate} />;

  switch (currentPath) {
    case '/app':
    case '/app/dashboard':
      appContent = <DashboardPage onNavigate={navigate} />;
      break;
    case '/app/onboarding':
      appContent = <OnboardingPage onNavigate={navigate} />;
      break;
    case '/app/coordenadores':
      appContent = <CoordinatorsPage />;
      break;
    case '/app/liderancas':
      appContent = <LeadersPage />;
      break;
    case '/app/crm':
      appContent = <CrmPage />;
      break;
    case '/app/metas':
      appContent = <GoalsPage />;
      break;
    case '/app/campo':
      appContent = <FieldPage />;
      break;
    case '/app/eventos':
      appContent = <EventsPage />;
      break;
    case '/app/reunioes':
      appContent = <MeetingsPage />;
      break;
    case '/app/presenca':
      appContent = <PresencePage />;
      break;
    case '/app/materiais':
      appContent = <MaterialsPage />;
      break;
    case '/app/adesivos':
      appContent = <StickersPage />;
      break;
    case '/app/inteligencia':
      appContent = <IntelligencePage />;
      break;
    case '/app/relatorios':
      appContent = <ReportsPage />;
      break;
    case '/app/usuarios':
      appContent = <UsersPage />;
      break;
    case '/app/organizacoes':
      appContent = <OrganizationsPage />;
      break;
    case '/app/planos':
      appContent = <PlansPage />;
      break;
    case '/app/perfil':
      appContent = <ProfilePage />;
      break;
    case '/app/configuracoes':
      appContent = <SettingsPage />;
      break;
  }

  return (
    <AppLayout currentPath={currentPath} onNavigate={navigate}>
      {appContent}
    </AppLayout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainRouter />
      </AuthProvider>
    </ToastProvider>
  );
}
