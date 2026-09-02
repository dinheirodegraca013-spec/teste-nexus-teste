import React from 'react';
import { ArrowRight, ShieldCheck, Database, Users, CheckCircle2, ChevronRight, Zap, Target, Smartphone } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="flex-1 flex flex-col justify-center">
      {/* Hero Section */}
      <section className="py-20 md:py-28 px-4 sm:px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700 mb-8 select-none shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100"></span>
          <span className="font-semibold text-slate-900">NEXUS v2.4</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">SaaS Multi-Tenant de Gestão & Operação</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-slate-950 max-w-4xl mx-auto leading-[1.08]">
          Gestão estratégica, articulação e inteligência operacional.
        </h1>

        <p className="mt-6 text-base sm:text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-normal">
          Plataforma multi-tenant profissional para coordenação de equipes, lideranças territoriais, CRM de contatos, metas e controle de campo.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            size="lg"
            variant="primary"
            onClick={() => onNavigate('/cadastro')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full sm:w-auto text-sm"
          >
            Começar Gratuitamente
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => onNavigate('/login')}
            className="w-full sm:w-auto text-sm"
          >
            Acessar Minha Conta
          </Button>
        </div>

        {/* Highlight Architecture Badges */}
        <div className="mt-14 pt-8 border-t border-slate-200 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-600" />
            <span>Supabase PostgreSQL & RLS</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Isolamento Total por Organização</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-slate-600" />
            <span>Pronto para Produção Vercel</span>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="py-16 px-4 sm:px-6 max-w-6xl mx-auto w-full">
        <div className="mb-12 text-left sm:text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
            Arquitetura desenhada para alta performance
          </h2>
          <p className="mt-2 text-sm text-slate-500 max-w-xl sm:mx-auto">
            Uma suíte completa e sem ruídos visuais para quem precisa de clareza, velocidade e segurança.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between shadow-2xs">
            <div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-800 mb-4 border border-slate-200/80">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-950">Lideranças & Coordenadores</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
                Mapeamento hierárquico por território, bairro e região com metas individuais e volume de mobilização.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-slate-700">
              <span>Mapeamento territorial</span>
              <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-400" />
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between shadow-2xs">
            <div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-800 mb-4 border border-slate-200/80">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-950">Metas & CRM Rápido</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
                Acompanhamento objetivo de metas com percentuais e cadastro instantâneo de contatos qualificados.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-slate-700">
              <span>Indicadores diretos</span>
              <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-400" />
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between shadow-2xs">
            <div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-800 mb-4 border border-slate-200/80">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-950">Operação de Campo & Presença</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
                Interface ultrarrápida para celulares em eventos de rua, reuniões, check-ins e adesivagem de veículos.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-slate-700">
              <span>Mobile-first real</span>
              <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-400" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Box */}
      <section className="py-16 px-4 sm:px-6 max-w-4xl mx-auto w-full text-center">
        <div className="p-8 sm:p-12 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
            Pronto para organizar sua operação no NEXUS?
          </h2>
          <p className="mt-3 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Crie sua organização em poucos segundos e comece a gerenciar dados com segurança e privacidade.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              variant="primary"
              onClick={() => onNavigate('/cadastro')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Criar Conta Pública
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => onNavigate('/login')}
            >
              Já tenho acesso
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
