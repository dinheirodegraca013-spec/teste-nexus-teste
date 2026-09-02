import React, { useState } from 'react';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

interface ForgotPasswordPageProps {
  onNavigate: (path: string) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const { resetPassword } = useAuth();
  const { success } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    setIsLoading(true);
    await resetPassword(email.trim());
    setIsLoading(false);
    setIsSent(true);
    success('Instruções de redefinição enviadas para seu e-mail!');
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs text-left">
        <div className="text-center mb-6">
          <div 
            onClick={() => onNavigate('/')} 
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-white font-black text-base shadow-xs cursor-pointer mb-3"
          >
            N
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight">
            Recuperar Senha
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Enviaremos um link seguro para você redefinir sua credencial
          </p>
        </div>

        {isSent ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs leading-relaxed">
              Verifique a caixa de entrada de <strong>{email}</strong>. Enviamos o link para você cadastrar uma nova senha.
            </div>
            <Button
              variant="outline"
              size="md"
              onClick={() => onNavigate('/login')}
              className="w-full"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Voltar ao Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Seu E-mail Cadastrado"
              type="email"
              placeholder="seu.email@organizacao.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              className="w-full mt-2"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Enviar Link de Redefinição
            </Button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="text-xs text-slate-500 hover:text-slate-900 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Lembrou sua senha? Fazer login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
