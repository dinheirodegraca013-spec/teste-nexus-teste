import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  Contact, 
  Target, 
  Calendar, 
  UsersRound, 
  Smartphone, 
  CheckSquare, 
  Package, 
  Tag, 
  Compass, 
  FileText, 
  Building2, 
  Shield, 
  CreditCard, 
  Settings, 
  User, 
  LogOut
} from 'lucide-react';
import { useAuth, normalizeRole } from '../../contexts/AuthContext';
import { AppModule } from '../../types';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavGroup {
  title: string;
  items: {
    name: string;
    path: string;
    icon: React.ElementType;
    module?: AppModule;
    adminOnly?: boolean;
    highlight?: boolean;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { profile, organization, signOut, hasPermission } = useAuth();

  const isLeader = normalizeRole(profile?.role) === 'leader';

  const leaderNavGroups: NavGroup[] = [
    {
      title: 'Operação do Líder',
      items: [
        { name: 'Painel & Metas de Campo', path: '/app/campo', icon: Target, highlight: true },
        { name: 'Carros & Casas Adesivadas', path: '/app/adesivos', icon: Tag },
        { name: 'Meus Apoiadores (CRM)', path: '/app/crm', icon: Contact },
      ]
    },
    {
      title: 'Minha Conta',
      items: [
        { name: 'Meu Perfil', path: '/app/perfil', icon: User },
      ]
    }
  ];

  const adminNavGroups: NavGroup[] = [
    {
      title: 'Principal',
      items: [
        { name: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard, module: 'dashboard' },
        { name: 'CRM & Contatos', path: '/app/crm', icon: Contact, module: 'crm' },
      ]
    },
    {
      title: 'Estrutura & Articulação',
      items: [
        { name: 'Coordenadores', path: '/app/coordenadores', icon: UsersRound, module: 'coordinators' },
        { name: 'Lideranças', path: '/app/liderancas', icon: UserCheck, module: 'leaders' },
        { name: 'Metas & Indicadores', path: '/app/metas', icon: Target, module: 'goals' },
      ]
    },
    {
      title: 'Operação & Campo',
      items: [
        { name: 'Campo (Rápido)', path: '/app/campo', icon: Smartphone, module: 'field', highlight: true },
        { name: 'Eventos', path: '/app/eventos', icon: Calendar, module: 'events' },
        { name: 'Reuniões', path: '/app/reunioes', icon: Users, module: 'meetings' },
        { name: 'Presença', path: '/app/presenca', icon: CheckSquare, module: 'presence' },
      ]
    },
    {
      title: 'Materiais & Adesivos',
      items: [
        { name: 'Estoque & Materiais', path: '/app/materiais', icon: Package, module: 'materials' },
        { name: 'Adesivos (Carros & Casas)', path: '/app/adesivos', icon: Tag, module: 'stickers' },
      ]
    },
    {
      title: 'Inteligência',
      items: [
        { name: 'Territorial & Demandas', path: '/app/inteligencia', icon: Compass, module: 'intelligence' },
        { name: 'Relatórios', path: '/app/relatorios', icon: FileText, module: 'reports' },
      ]
    },
    {
      title: 'Administração',
      items: [
        { name: 'Equipe & Permissões', path: '/app/usuarios', icon: Shield, module: 'users' },
        { name: 'Organizações', path: '/app/organizacoes', icon: Building2, module: 'organizations' },
        { name: 'Planos & Assinatura', path: '/app/planos', icon: CreditCard, adminOnly: true },
        { name: 'Configurações', path: '/app/configuracoes', icon: Settings, module: 'settings' },
      ]
    }
  ];

  const navGroups = isLeader ? leaderNavGroups : adminNavGroups;

  const handleItemClick = (path: string) => {
    onNavigate(path);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/80 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleItemClick('/app/dashboard')} 
            aria-label="Ir para o dashboard do NEXUS"
            className="flex items-center gap-2.5 cursor-pointer select-none text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 rounded-lg"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black tracking-widest text-sm shadow-xs">
              N
            </div>
            <div>
              <div className="text-sm font-bold tracking-widest text-slate-950">NEXUS</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">SaaS Operação</div>
            </div>
          </button>
        </div>

        {/* Active organization. Membership changes are managed server-side. */}
        <div className="p-3 border-b border-slate-100">
          <div className="w-full text-left p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs shadow-2xs">
            <div className="truncate pr-2">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Organização Ativa</div>
              <div className="text-slate-900 font-semibold truncate mt-0.5">{organization?.name || 'Carregando...'}</div>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5 custom-scrollbar text-left">
          {navGroups.map((group) => {
            const filteredItems = group.items.filter(item => {
              if (item.adminOnly && !['admin', 'superadmin'].includes(normalizeRole(profile?.role))) return false;
              if (!item.module) return true;
              return hasPermission(item.module, 'view');
            });

            if (filteredItems.length === 0) return null;

            return (
              <div key={group.title} className="space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {group.title}
                </div>
                {filteredItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPath === item.path || currentPath.startsWith(`${item.path}/`);
                  return (
                    <button
                      type="button"
                      key={item.path}
                      onClick={() => handleItemClick(item.path)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        isActive
                          ? 'bg-slate-100 text-slate-950 font-semibold border border-slate-200/70 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      } ${item.highlight && !isActive ? 'border border-emerald-200 text-emerald-700 bg-emerald-50/40' : ''}`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : item.highlight ? 'text-emerald-600' : 'text-slate-500'}`} />
                      <span className="truncate">{item.name}</span>
                      {item.highlight && !isActive && (
                        <span className="ml-auto text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded border border-emerald-200 uppercase font-bold">
                          Rápido
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* User profile & Logout */}
        <div className="p-3 border-t border-slate-100 bg-white">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200/80">
            <button
              type="button"
              onClick={() => handleItemClick('/app/perfil')}
              aria-label="Abrir meu perfil"
              className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 rounded-lg"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-800 flex items-center justify-center text-xs font-semibold shrink-0 border border-slate-300">
                {profile?.full_name?.charAt(0) || <User className="w-3.5 h-3.5" />}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-slate-900 truncate">{profile?.full_name || 'Usuário'}</div>
                <div className="text-[10px] text-slate-400 capitalize font-medium">{profile?.role || 'admin'}</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => signOut()}
              aria-label="Sair do NEXUS"
              title="Sair do NEXUS"
              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
