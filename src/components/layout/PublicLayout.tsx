import React from 'react';
import { Shield, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';

interface PublicLayoutProps {
  children: React.ReactNode;
  onNavigate: (path: string) => void;
  currentPath: string;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({
  children,
  onNavigate,
  currentPath,
}) => {
  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* Public Navbar */}
      <header className="h-16 border-b border-slate-200 bg-white/85 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <div
            onClick={() => onNavigate('/')}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black tracking-widest text-sm shadow-xs">
              N
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold tracking-widest text-slate-950">NEXUS</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-semibold">SaaS</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs text-slate-500 font-medium">
            <button
              onClick={() => onNavigate('/')}
              className={`hover:text-slate-900 transition-colors cursor-pointer ${currentPath === '/' ? 'text-slate-950 font-semibold' : ''}`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => onNavigate('/termos')}
              className={`hover:text-slate-900 transition-colors cursor-pointer ${currentPath === '/termos' ? 'text-slate-950 font-semibold' : ''}`}
            >
              Termos de Uso
            </button>
            <button
              onClick={() => onNavigate('/privacidade')}
              className={`hover:text-slate-900 transition-colors cursor-pointer ${currentPath === '/privacidade' ? 'text-slate-950 font-semibold' : ''}`}
            >
              Privacidade
            </button>
          </nav>

          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('/login')}
              className="text-xs"
            >
              Entrar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate('/cadastro')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Criar Conta
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {/* Public Footer */}
      <footer className="border-t border-slate-200 bg-white py-10 px-4 sm:px-6 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-700">
              N
            </div>
            <span>© {new Date().getFullYear()} NEXUS Operations. Todos os direitos reservados.</span>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => onNavigate('/termos')} className="hover:text-slate-900 transition-colors cursor-pointer">
              Termos
            </button>
            <button onClick={() => onNavigate('/privacidade')} className="hover:text-slate-900 transition-colors cursor-pointer">
              Privacidade
            </button>
            <div className="flex items-center gap-1.5 text-slate-600">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>Multi-Tenant & Supabase RLS</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
