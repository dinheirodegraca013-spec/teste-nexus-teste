import React from 'react';
import { Menu, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { isSupabaseConfigured, supabaseUrl } from '../../lib/supabase';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  currentPath: string;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu, currentPath }) => {
  const { organization, profile } = useAuth();

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

  return (
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
        {/* Supabase Real Connection Status */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white border border-slate-200 text-slate-700 shadow-2xs select-none"
          title={isSupabaseConfigured ? `Conectado ao Supabase: ${supabaseUrl}` : 'Supabase: configure VITE_SUPABASE_URL'}
        >
          <Database className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden xs:inline">
            {isSupabaseConfigured ? 'Supabase Conectado' : 'Supabase Desconectado'}
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isSupabaseConfigured ? 'bg-emerald-500 ring-2 ring-emerald-100' : 'bg-rose-500'
            }`}
          />
        </div>
      </div>
    </header>
  );
};
