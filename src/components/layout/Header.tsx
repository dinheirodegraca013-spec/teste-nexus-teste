import React, { useState } from 'react';
import { Menu, Database, CheckCircle2, AlertTriangle, Key, ExternalLink } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { isSupabaseConfigured, supabaseUrl } from '../../lib/supabase';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../../contexts/ToastContext';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  currentPath: string;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu, currentPath }) => {
  const { organization } = useAuth();
  const { success } = useToast();
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [inputUrl, setInputUrl] = useState(localStorage.getItem('nexus_supabase_url') || '');
  const [inputKey, setInputKey] = useState(localStorage.getItem('nexus_supabase_anon_key') || '');

  const getPageTitle = (path: string) => {
    const clean = path.replace('/app/', '');
    switch (clean) {
      case 'dashboard': return 'Dashboard Executivo';
      case 'crm': return 'CRM & Gestão de Contatos';
      case 'coordenadores': return 'Estrutura de Coordenadores';
      case 'liderancas': return 'Lideranças Territoriais';
      case 'metas': return 'Metas & Indicadores de Desempenho';
      case 'campo': return 'Registro Operacional de Campo';
      case 'eventos': return 'Eventos & Mobilizações';
      case 'reunioes': return 'Reuniões & Pautas';
      case 'presenca': return 'Controle de Presença';
      case 'materiais': return 'Estoque & Distribuição de Materiais';
      case 'adesivos': return 'Adesivagem (Veículos e Casas)';
      case 'inteligencia': return 'Inteligência Territorial & Demandas';
      case 'relatorios': return 'Relatórios Estratégicos';
      case 'usuarios': return 'Gestão de Usuários & Permissões';
      case 'organizacoes': return 'Organizações Multi-tenant';
      case 'planos': return 'Planos & Capacidade SaaS';
      case 'configuracoes': return 'Configurações da Organização';
      case 'perfil': return 'Meu Perfil';
      case 'onboarding': return 'Configuração Inicial da Organização';
      default: return 'NEXUS';
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl && inputKey) {
      localStorage.setItem('nexus_supabase_url', inputUrl.trim());
      localStorage.setItem('nexus_supabase_anon_key', inputKey.trim());
      success('Configurações do Supabase salvas com sucesso! Recarregando conexão...');
      setIsConfigModalOpen(false);
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } else {
      localStorage.removeItem('nexus_supabase_url');
      localStorage.removeItem('nexus_supabase_anon_key');
      success('Configuração restaurada para o padrão.');
      setIsConfigModalOpen(false);
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  return (
    <>
      <header className="h-14 border-b border-slate-200 bg-white/85 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-semibold text-slate-900 flex items-center gap-2 tracking-tight">
              <span>{getPageTitle(currentPath)}</span>
              {organization && (
                <span className="hidden sm:inline-block text-[11px] font-medium text-slate-600 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80">
                  {organization.name}
                </span>
              )}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Supabase Connection Status Pill */}
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all bg-white border border-slate-200 hover:border-slate-300 text-slate-700 shadow-2xs cursor-pointer"
            title="Clique para conferir ou ajustar conexão do Supabase"
          >
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden xs:inline">
              {isSupabaseConfigured ? 'Supabase Conectado' : 'Supabase (Sandbox)'}
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isSupabaseConfigured ? 'bg-emerald-500 ring-2 ring-emerald-100' : 'bg-amber-400'
              }`}
            />
          </button>
        </div>
      </header>

      {/* Supabase connection modal */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title="Conexão com o Supabase"
        description="O NEXUS conecta-se diretamente ao PostgreSQL, Auth e Storage do seu projeto Supabase existente."
      >
        <form onSubmit={handleSaveConfig} className="space-y-4 text-left">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Status atual:</span>
              <span className="font-semibold flex items-center gap-1 text-slate-900">
                {isSupabaseConfigured ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Supabase Ativo ({supabaseUrl.substring(0, 24)}...)
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Modo Sandbox (Estrutura isolada local)
                  </>
                )}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Em produção na Vercel, configure as variáveis <code className="text-slate-800 bg-slate-200/60 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_URL</code> e <code className="text-slate-800 bg-slate-200/60 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_ANON_KEY</code>.
            </p>
          </div>

          <Input
            label="SUPABASE URL"
            placeholder="https://xyzcompany.supabase.co"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            helperText="URL da sua instância Supabase existente."
          />

          <Input
            label="SUPABASE ANON KEY"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            type="password"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            helperText="Chave pública (anon/public). Jamais utilize service_role no frontend."
          />

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setInputUrl('');
                setInputKey('');
              }}
            >
              Resetar para Sandbox
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsConfigModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Salvar & Conectar
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
};
