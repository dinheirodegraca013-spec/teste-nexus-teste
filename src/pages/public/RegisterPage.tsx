import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Building2, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { localStore } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

interface RegisterPageProps {
  onNavigate: (path: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
  const { signUp } = useAuth();
  const { error: toastError, success } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Referral / Invitation query parameters
  const [isInvite, setIsInvite] = useState(false);
  const [inviteOrgId, setInviteOrgId] = useState('');
  const [inviteOrgName, setInviteOrgName] = useState('');
  const [inviteLeaderId, setInviteLeaderId] = useState('');
  const [inviteCoordId, setInviteCoordId] = useState('');
  const [inviteCoordName, setInviteCoordName] = useState('');

  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const conviteType = urlParams.get('convite');
      const paramLeaderId = urlParams.get('lider_id');
      const paramCoordId = urlParams.get('coord_id') || urlParams.get('coord');
      const paramOrgId = urlParams.get('org') || urlParams.get('org_id');
      const paramNome = urlParams.get('nome');

      if (conviteType === 'lider' || paramLeaderId || paramCoordId) {
        setIsInvite(true);
        if (paramNome) setName(decodeURIComponent(paramNome));
        if (paramOrgId) setInviteOrgId(paramOrgId);
        if (paramLeaderId) setInviteLeaderId(paramLeaderId);
        if (paramCoordId) setInviteCoordId(paramCoordId);

        // Fetch org / coordinator friendly names
        const orgs = localStore.getOrganizations();
        const foundOrg = orgs.find(o => o.id === (paramOrgId || 'org-alpha')) || orgs[0];
        if (foundOrg) {
          setInviteOrgName(foundOrg.name);
          setInviteOrgId(foundOrg.id);
        }

        if (paramCoordId && foundOrg) {
          const coords = localStore.getCoordinators(foundOrg.id);
          const foundCoord = coords.find(c => c.id === paramCoordId);
          if (foundCoord) setInviteCoordName(foundCoord.name);
        }
      }
    } catch (e) {
      console.error('Error parsing invite params', e);
    }
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
    const { error } = await signUp({
      name: name.trim(),
      email: email.trim(),
      password,
      organizationName: isInvite ? (inviteOrgName || 'Campanha') : (organizationName.trim() || `Organização de ${name.split(' ')[0]}`),
      role: isInvite ? 'leader' : 'admin',
      organizationId: isInvite ? inviteOrgId : undefined,
      leaderId: isInvite && inviteLeaderId ? inviteLeaderId : undefined,
      coordinatorId: isInvite && inviteCoordId ? inviteCoordId : undefined,
    });
    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message || 'Falha ao realizar cadastro.');
      toastError('Erro: ' + (error.message || 'Não foi possível cadastrar'));
    } else {
      if (isInvite) {
        success('Bem-vindo(a) à equipe de campo! Acesso liberado.');
        onNavigate('/app/campo');
      } else {
        success('Conta e organização criadas com sucesso!');
        onNavigate('/app/onboarding');
      }
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs text-left">
        {isInvite ? (
          <div className="mb-6">
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
            {isInvite ? 'Concluir Cadastro e Entrar no Modo de Campo' : 'Cadastrar e Continuar'}
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
