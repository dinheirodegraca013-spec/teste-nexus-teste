import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

interface LoginPageProps {
  onNavigate: (path: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { signIn } = useAuth();
  const { error: toastError, success } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email || !password) {
      setErrorMessage('Por favor, informe e-mail e senha.');
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(email.trim(), password);
    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message || 'Credenciais inválidas. Verifique seu e-mail e senha.');
      toastError(error.message || 'Erro ao autenticar: Credenciais inválidas.');
    } else {
      success('Sessão iniciada com sucesso!');
      onNavigate('/app/dashboard');
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs text-left">
        {/* Brand */}
        <div className="text-center mb-6">
          <div 
            onClick={() => onNavigate('/')} 
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-white font-black text-base shadow-xs cursor-pointer mb-3"
          >
            N
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight">
            Entrar no NEXUS
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Acesse o ambiente seguro da sua organização
          </p>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">
                {errorMessage}
              </div>
            </div>
            <div className="pt-2 border-t border-rose-200/60 flex items-center justify-between gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => onNavigate('/cadastro')}
                className="font-semibold text-rose-800 underline hover:text-rose-950 cursor-pointer"
              >
                Criar nova conta
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/recuperar-senha')}
                className="text-slate-600 hover:text-slate-900 cursor-pointer underline"
              >
                Esqueci a senha
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="E-mail"
            type="email"
            placeholder="seu.email@organizacao.com.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            required
            autoComplete="email"
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Senha</label>
              <button
                type="button"
                onClick={() => onNavigate('/recuperar-senha')}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Esqueci minha senha
              </button>
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              required
              autoComplete="current-password"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            className="w-full mt-2"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Entrar na Plataforma
          </Button>
        </form>

        {/* Create account link */}
        <div className="mt-6 text-center text-xs text-slate-500">
          Não possui conta?{' '}
          <button
            type="button"
            onClick={() => onNavigate('/cadastro')}
            className="font-semibold text-slate-900 hover:underline cursor-pointer"
          >
            Criar conta
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Autenticação direta com Supabase Auth (RLS ativo)</span>
        </div>
      </div>
    </div>
  );
};
