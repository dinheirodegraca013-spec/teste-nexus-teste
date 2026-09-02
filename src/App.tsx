import React, { useState, useEffect } from 'react';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PublicLayout } from './components/layout/PublicLayout';
import { AppLayout } from './components/layout/AppLayout';
import { LoadingState } from './components/ui/LoadingState';

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

function MainRouter() {
  const { user, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState(() => {
    return window.location.pathname || '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-6">
        <LoadingState message="Carregando sessão do NEXUS..." />
      </div>
    );
  }

  // Route protection
  const isAppRoute = currentPath.startsWith('/app');
  const isAuthRoute = currentPath === '/login' || currentPath === '/cadastro' || currentPath === '/recuperar-senha';

  // If trying to access /app/* but not logged in -> redirect to /login
  if (isAppRoute && !user) {
    return (
      <PublicLayout currentPath="/login" onNavigate={navigate}>
        <LoginPage onNavigate={navigate} />
      </PublicLayout>
    );
  }

  // If user is already logged in and visits /login or /cadastro, redirect to dashboard
  if (isAuthRoute && user) {
    return (
      <AppLayout currentPath="/app/dashboard" onNavigate={navigate}>
        <DashboardPage onNavigate={navigate} />
      </AppLayout>
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
