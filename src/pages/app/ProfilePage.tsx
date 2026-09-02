import React, { useState } from 'react';
import { User, Mail, Phone, Lock, Save, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export const ProfilePage: React.FC = () => {
  const { user, profile, updateProfile, updatePassword } = useAuth();
  const { success, error: toastError } = useToast();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toastError('Informe seu nome completo.');
      return;
    }

    setIsLoadingProfile(true);
    const { error } = await updateProfile({
      full_name: fullName.trim(),
      phone: phone.trim() || undefined,
    });
    setIsLoadingProfile(false);

    if (error) {
      toastError('Erro ao atualizar perfil.');
    } else {
      success('Dados do perfil atualizados com sucesso!');
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toastError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toastError('As senhas não conferem.');
      return;
    }

    setIsLoadingPassword(true);
    const { error } = await updatePassword(newPassword);
    setIsLoadingPassword(false);

    if (error) {
      toastError('Erro ao alterar senha.');
    } else {
      setNewPassword('');
      setConfirmPassword('');
      success('Senha atualizada com sucesso!');
    }
  };

  return (
    <div className="max-w-2xl space-y-6 text-left">
      {/* Header */}
      <div className="pb-2 border-b border-zinc-800/60">
        <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <User className="w-5 h-5 text-zinc-400" />
          Meu Perfil de Acesso
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Informações cadastrais e credenciais de segurança
        </p>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSaveProfile} className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2">
          Dados Pessoais
        </h3>

        <Input
          label="Nome Completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Seu nome"
          leftIcon={<User className="w-4 h-4" />}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="E-mail de Login"
            value={user?.email || ''}
            disabled
            leftIcon={<Mail className="w-4 h-4" />}
            helperText="O e-mail é vinculado à sua conta Supabase Auth."
          />
          <Input
            label="Telefone / WhatsApp"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(11) 99999-9999"
            leftIcon={<Phone className="w-4 h-4" />}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isLoadingProfile}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            Salvar Dados
          </Button>
        </div>
      </form>

      {/* Password Change Form */}
      <form onSubmit={handleSavePassword} className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2">
          Alterar Senha
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Nova Senha"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
          />
          <Input
            label="Confirmar Nova Senha"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="outline"
            size="sm"
            isLoading={isLoadingPassword}
            leftIcon={<Lock className="w-3.5 h-3.5" />}
          >
            Atualizar Senha
          </Button>
        </div>
      </form>
    </div>
  );
};
