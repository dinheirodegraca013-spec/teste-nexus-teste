import React, { useState } from 'react';
import { Settings, Building2, Database, Shield, CheckCircle2, AlertTriangle, Save, Key } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { localStore, isSupabaseConfigured, supabaseUrl } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

export const SettingsPage: React.FC = () => {
  const { organization } = useAuth();
  const { success, error: toastError } = useToast();

  const [orgName, setOrgName] = useState(organization?.name || '');
  const [territoryType, setTerritoryType] = useState(organization?.settings?.territory_type || 'bairro');
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(localStorage.getItem('nexus_supabase_url') || '');
  const [supabaseKeyInput, setSupabaseKeyInput] = useState(localStorage.getItem('nexus_supabase_anon_key') || '');

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      toastError('Informe o nome da organização.');
      return;
    }

    if (organization) {
      const updated = {
        ...organization,
        name: orgName.trim(),
        settings: {
          ...organization.settings,
          territory_type: territoryType,
        }
      };
      localStore.saveOrganization(updated);
      success('Configurações da organização salvas!');
      setTimeout(() => {
        window.location.reload();
      }, 400);
    }
  };

  const handleSaveSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    if (supabaseUrlInput && supabaseKeyInput) {
      localStorage.setItem('nexus_supabase_url', supabaseUrlInput.trim());
      localStorage.setItem('nexus_supabase_anon_key', supabaseKeyInput.trim());
      success('Conexão com o Supabase atualizada!');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } else {
      localStorage.removeItem('nexus_supabase_url');
      localStorage.removeItem('nexus_supabase_anon_key');
      success('Restaurado para o modo Sandbox padrão.');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  return (
    <div className="max-w-3xl space-y-6 text-left">
      {/* Header */}
      <div className="pb-2 border-b border-zinc-800/60">
        <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-zinc-400" />
          Configurações da Organização
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Parâmetros territoriais, infraestrutura de backend e conformidade
        </p>
      </div>

      {/* General Settings */}
      <form onSubmit={handleSaveGeneral} className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-zinc-400" />
          Dados da Organização
        </h3>

        <Input
          label="Nome da Organização"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          placeholder="Ex.: Campanha Municipal 2026"
          required
        />

        <Select
          label="Estrutura de Território Padrão"
          value={territoryType}
          onChange={(e) => setTerritoryType(e.target.value as any)}
          options={[
            { value: 'bairro', label: 'Bairros (Municipal / Urbano)' },
            { value: 'municipio', label: 'Municípios (Estadual)' },
            { value: 'zona', label: 'Zonas Eleitorais / Seções' },
            { value: 'regiao', label: 'Macro-Regiões' },
          ]}
          helperText="Define como os relatórios e inteligência agrupam os contatos."
        />

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" size="sm" leftIcon={<Save className="w-3.5 h-3.5" />}>
            Salvar Parâmetros
          </Button>
        </div>
      </form>

      {/* Backend & Supabase Architecture Status */}
      <form onSubmit={handleSaveSupabase} className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Database className="w-4 h-4 text-zinc-400" />
            Infraestrutura Supabase & Vercel
          </h3>
          <span className="text-xs font-mono flex items-center gap-1 text-zinc-400">
            {isSupabaseConfigured ? (
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Conectado ao Supabase
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Modo Sandbox
              </span>
            )}
          </span>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          O NEXUS reutiliza a infraestrutura de backend existente no Supabase (PostgreSQL, Supabase Auth, Row Level Security). Para produção na Vercel, defina as variáveis no painel da Vercel ou configure abaixo para este navegador.
        </p>

        <Input
          label="SUPABASE URL"
          value={supabaseUrlInput}
          onChange={(e) => setSupabaseUrlInput(e.target.value)}
          placeholder="https://xyzproject.supabase.co"
          helperText="URL da API REST e Auth da sua instância Supabase."
        />

        <Input
          label="SUPABASE ANON KEY"
          type="password"
          value={supabaseKeyInput}
          onChange={(e) => setSupabaseKeyInput(e.target.value)}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          helperText="Chave pública anônima. O acesso a dados é isolado por RLS no PostgreSQL."
        />

        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSupabaseUrlInput('');
              setSupabaseKeyInput('');
            }}
          >
            Limpar Configuração
          </Button>

          <Button type="submit" variant="outline" size="sm">
            Salvar Conexão
          </Button>
        </div>
      </form>
    </div>
  );
};
