import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Building2, ArrowRight, ShieldCheck, UserCheck, UsersRound, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { organizationsService, coordinatorsService } from '../../services';
import { isSupabaseConfigured } from '../../lib/supabase';

interface RegisterPageProps {
  onNavigate: (path: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
  const { user, signOut, signUp } = useAuth();
  const { error: toastError, success } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Referral / Invitation query parameters
  const [isInvite, setIsInvite] = useState(false);
  const [inviteType, setInviteType] = useState<'coordenador' | 'lider' | null>(null);
  const [inviteOrgId, setInviteOrgId] = useState('');
  const [inviteOrgName, setInviteOrgName] = useState('');
  const [inviteLeaderId, setInviteLeaderId] = useState('');
  const [inviteCoordId, setInviteCoordId] = useState('');
  const [inviteCoordName, setInviteCoordName] = useState('');
  const [inviteTerritory, setInviteTerritory] = useState('');

  useEffect(() => {
    async function loadInviteDetails() {
      try {
        let searchStr = window.location.search || '';
        if (!searchStr && window.location.hash && window.location.hash.includes('?')) {
          searchStr = window.location.hash.slice(window.location.hash.indexOf('?'));
        }
        
        const urlParams = new URLSearchParams(searchStr);
        const conviteType = urlParams.get('convite');
        const paramLeaderId = urlParams.get('lider_id');
        const paramCoordId = urlParams.get('coord_id') || urlParams.get('coord');
        const paramOrgId = urlParams.get('org') || urlParams.get('org_id');
        const paramNome = urlParams.get('nome');
        const paramEmail = urlParams.get('email');
        const paramTerritorio = urlParams.get('territorio');

        if (conviteType === 'coordenador') {
          setIsInvite(true);
          setInviteType('coordenador');
          if (paramNome) setName(decodeURIComponent(paramNome));
          if (paramEmail) setEmail(decodeURIComponent(paramEmail));
          if (paramTerritorio) setInviteTerritory(decodeURIComponent(paramTerritorio));
          if (paramOrgId) setInviteOrgId(paramOrgId);
          if (paramCoordId) setInviteCoordId(paramCoordId);

          if (paramOrgId) {
            const { data: foundOrg } = await organizationsService.getById(paramOrgId);
            if (foundOrg) {
              setInviteOrgName(foundOrg.name);
              setInviteOrgId(foundOrg.id);
            }
          }
        } else if (conviteType === 'lider' || paramLeaderId || paramCoordId) {
          setIsInvite(true);
          setInviteType('lider');
          if (paramNome) setName(decodeURIComponent(paramNome));
          if (paramEmail) setEmail(decodeURIComponent(paramEmail));
          if (paramOrgId) setInviteOrgId(paramOrgId);
          if (paramLeaderId) setInviteLeaderId(paramLeaderId);
          if (paramCoordId) setInviteCoordId(paramCoordId);

          if (paramOrgId) {
            const { data: foundOrg } = await organizationsService.getById(paramOrgId);
            if (foundOrg) {
              setInviteOrgName(foundOrg.name);
              setInviteOrgId(foundOrg.id);
            }
          }
        }
      } catch (e) {
        console.error('Error parsing invite params', e);
      }
    }

    loadInviteDetails();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Por favor, informe seu nome completo.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Por favor, informe um e-mail válido.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('A senha deve possuir pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem.');
      return;
    }
    if (!acceptTerms) {
      setErrorMessage('Você deve aceitar os termos de uso e política de privacidade.');
      return;
    }

    setIsLoading(true);
    const assignedRole = inviteType === 'coordenador' ? 'coordinator' : (isInvite ? 'leader' : 'admin');
    
    const { error, requiresConfirmation } = await signUp({
      name: name.trim(),
      email: email.trim(),
      password,
      organizationName: isInvite ? (inviteOrgName || 'Campanha') : (organizationName.trim() || `Organização de ${name.split(' ')[0]}`),
      role: assignedRole,
      organizationId: isInvite && inviteOrgId ? inviteOrgId : undefined,
      leaderId: isInvite && inviteLeaderId ? inviteLeaderId : undefined,
      coordinatorId: isInvite && inviteCoordId ? inviteCoordId : undefined,
    });
    setIsLoading(false);

    if (error) {
      let friendlyMessage = error.message || 'Falha ao realizar cadastro.';
      if (error.message?.includes('Failed to fetch') || (error as any)?.status === 0) {
        if (!isSupabaseConfigured) {
          friendlyMessage = 'O backend Supabase não está configurado. As variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam ser configuradas na Vercel e o projeto reconstruído.';
        } else {
          friendlyMessage = 'Não foi possível conectar aos servidores do sistema. Verifique sua conexão com a internet ou se extensões do navegador (como bloqueadores de anúncios) estão impedindo a comunicação com o Supabase.';
        }
      } else if (error.message?.includes('User already registered') || (error as any)?.code === 'user_already_exists') {
        friendlyMessage = 'Este e-mail já está cadastrado no sistema. Tente fazer login ou recuperar sua senha.';
      } else if (error.message?.includes('Password should be at least')) {
        friendlyMessage = 'A senha deve ter pelo menos 6 caracteres.';
      }

      setErrorMessage(friendlyMessage);
      toastError(friendlyMessage);
    } else if (requiresConfirmation) {
      setRegisteredEmail(email.trim());
      setConfirmationSent(true);
      success('Conta criada! Enviamos um link de confirmação para seu e-mail.');
    } else {
      if (inviteType === 'coordenador') {
        success('Bem-vindo(a) à coordenação! Acesso liberado.');
        onNavigate('/app');
      } else if (isInvite) {
        success('Bem-vindo(a) à equipe de campo! Acesso liberado.');
        onNavigate('/app/campo');
      } else {
        success('Conta e organização criadas com sucesso!');
        onNavigate('/app/onboarding');
      }
    }
  };

  if (confirmationSent) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-950 tracking-tight">
            Conta Criada com Sucesso!
          </h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Enviamos uma mensagem de confirmação para{' '}
            <strong className="text-slate-900 font-semibold">{registeredEmail}</strong>.
          </p>
          <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 text-left leading-relaxed">
            <p className="font-semibold text-slate-800 mb-1">Próximos passos:</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-500">
              <li>Abra sua caixa de entrada (verifique também a pasta de Spam).</li>
              <li>Clique no link de confirmação enviado pelo Supabase.</li>
              <li>Retorne e faça login no sistema com sua senha cadastrada.</li>
            </ol>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => onNavigate('/login')}
            >
              Ir para o Login
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-slate-500"
              onClick={() => onNavigate('/')}
            >
              Voltar à Página Inicial
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs text-left">
        {isInvite ? (
          <div className="mb-6 space-y-3">
            {user && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
                <span>Você está conectado como <strong>{user.email}</strong>.</span>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="text-[11px] underline font-bold text-amber-950 hover:text-amber-800 shrink-0 cursor-pointer"
                >
                  Sair desta conta
                </button>
              </div>
            )}

            {inviteType === 'coordenador' ? (
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-700 text-white flex items-center justify-center shrink-0">
                    <UsersRound className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-wider uppercase bg-indigo-200/80 text-indigo-900 px-2 py-0.5 rounded-md">
                      Convite de Coordenador
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                      Acesso à Coordenação de Polo
                    </h3>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pt-1 border-t border-indigo-200/60">
                  Você foi cadastrado(a) como Coordenador(a){inviteTerritory ? ` do território ` : ' na '}
                  {inviteTerritory && <strong className="text-slate-900 font-semibold">{inviteTerritory} </strong>}
                  na campanha <strong className="text-slate-900 font-semibold">{inviteOrgName || 'Central'}</strong>.
                  Crie sua senha de acesso para gerenciar suas lideranças, metas e articulação.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-wider uppercase bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-md">
                      Convite de Liderança
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                      Entrar na Equipe de Campo
                    </h3>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pt-1 border-t border-emerald-200/60">
                  Você foi indicado{inviteCoordName ? ` pelo coordenador ` : ` para a `}
                  {inviteCoordName && <strong className="text-slate-900 font-semibold">{inviteCoordName} </strong>}
                  na campanha <strong className="text-slate-900 font-semibold">{inviteOrgName || 'Central'}</strong>.
                  Cadastre sua senha para acessar o aplicativo móvel de campo.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center mb-6">
            <div 
              onClick={() => onNavigate('/')} 
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-white font-black text-base shadow-xs cursor-pointer mb-3"
            >
              N
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight">
              Criar Conta no NEXUS
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Inicie uma nova organização e assuma o controle operacional
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Input
            label="Nome Completo"
            placeholder="Ex.: Lucas Mendonça"
            value={name}
            onChange={(e) => setName(e.target.value)}
            leftIcon={<User className="w-4 h-4" />}
            required
            autoComplete="name"
          />

          {!isInvite && (
            <Input
              label="Nome da Sua Organização"
              placeholder="Ex.: Campanha Regional 2026 / Diretório Central"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              leftIcon={<Building2 className="w-4 h-4" />}
              helperText="Cada organização possui banco isolado via RLS."
            />
          )}

          <Input
            label="E-mail de Acesso"
            type="email"
            placeholder="lucas@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            required
            autoComplete="email"
          />

          <Input
            label="Criar Senha (mínimo 6 caracteres)"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            required
            autoComplete="new-password"
          />

          <Input
            label="Confirmar Senha"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            required
            autoComplete="new-password"
          />

          <div className="flex items-start gap-2 pt-1 text-xs text-slate-500">
            <input
              type="checkbox"
              id="terms"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            />
            <label htmlFor="terms" className="leading-tight cursor-pointer">
              Concordo com os{' '}
              <button
                type="button"
                onClick={() => onNavigate('/termos')}
                className="text-slate-900 font-medium underline cursor-pointer"
              >
                Termos de Uso
              </button>{' '}
              e{' '}
              <button
                type="button"
                onClick={() => onNavigate('/privacidade')}
                className="text-slate-900 font-medium underline cursor-pointer"
              >
                Política de Privacidade
              </button>
              .
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            className="w-full mt-4"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            {inviteType === 'coordenador'
              ? 'Concluir Cadastro e Acessar Coordenação'
              : (isInvite ? 'Concluir Cadastro e Entrar no Modo de Campo' : 'Cadastrar e Continuar')}
          </Button>
        </form>

        <div className="mt-5 text-center text-xs text-slate-500">
          Já possui conta cadastrada?{' '}
          <button
            type="button"
            onClick={() => onNavigate('/login')}
            className="font-semibold text-slate-900 hover:underline cursor-pointer"
          >
            Fazer login
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Isolamento e controle de acesso com segurança</span>
        </div>
      </div>
    </div>
  );
};
