import React, { useState } from 'react';
import { Settings, Building2, Database, Shield, CheckCircle2, AlertTriangle, Save, Key, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { isSupabaseConfigured, supabaseUrl } from '../../lib/supabase';
import { organizationsService } from '../../services';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

export const SettingsPage: React.FC = () => {
  const { organization } = useAuth();
  const { success, error: toastError } = useToast();

  const [orgName, setOrgName] = useState(organization?.name || '');
  const [territoryType, setTerritoryType] = useState(organization?.settings?.territory_type || 'bairro');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      toastError('Informe o nome da organização.');
      return;
    }

    if (!organization?.id) {
      toastError('Organização não identificada.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await organizationsService.update(organization.id, {
        name: orgName.trim(),
        settings: {
          ...organization.settings,
          territory_type: territoryType,
        },
      });

      if (error) {
        toastError('Erro ao salvar no Supabase: ' + error.message);
      } else {
        success('Configurações da organização salvas no Supabase!');
      }
    } catch (err: any) {
      toastError('Erro inesperado: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6 text-left">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-700" />
          Configurações da Organização
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Parâmetros operacionais e infraestrutura integrada ao Supabase
        </p>
      </div>

      {/* General Settings */}
      <form onSubmit={handleSaveGeneral} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-500" />
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

        <div className="pt-2">
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting} leftIcon={<Save className="w-4 h-4" />}>
            Salvar Alterações
          </Button>
        </div>
      </form>

      {/* Backend Infrastructure Status */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
          <Database className="w-4 h-4 text-slate-500" />
          Conexão com o Banco de Dados (Supabase)
        </h3>

        <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-xs text-slate-900">
              Supabase RLS Ativo & Conectado
            </div>
            <p className="text-xs text-slate-600">
              Todas as entidades (Apoiadores, Coordenadores, Lideranças, Metas, Presença e Adesivagens) estão vinculadas à organização: <strong className="text-slate-900 font-mono">{organization?.id}</strong>.
            </p>
            <div className="text-[11px] font-mono text-slate-400 pt-1">
              Endpoint: {supabaseUrl || 'https://supabase.co'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
