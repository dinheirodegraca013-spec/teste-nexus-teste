import React, { useState, useEffect, useCallback } from 'react';
import { Building2, CheckCircle2, ShieldCheck, Loader2, LockKeyhole } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Organization } from '../../types';
import { organizationsService } from '../../services';
import { Badge } from '../../components/ui/Badge';

export const OrganizationsPage: React.FC = () => {
  const { organization } = useAuth();
  const { error: toastError } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await organizationsService.getAll();
      if (error) throw error;
      // Do not present unrelated tenants as selectable. The backend currently
      // provisions one tenant per user; there is no authorized tenant switch RPC.
      const active = (data || []).filter((org) => org.id === organization?.id);
      setOrganizations(active);
    } catch (err: any) {
      setOrganizations([]);
      toastError('Erro ao carregar organizações: ' + (err?.message || 'Falha desconhecida.'));
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id, toastError]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-700" />
            Minha organização
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Os dados desta campanha são isolados por políticas de segurança no Supabase.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        <LockKeyhole className="h-4 w-4 shrink-0" />
        <span>
          A criação de organizações adicionais e a troca entre campanhas exigem um
          fluxo administrativo de autorização ainda não implementado. Essas ações
          ficam indisponíveis para evitar uma falsa confirmação ou troca de tenant.
        </span>
      </div>

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-slate-600" />
          <span className="text-xs font-medium">Carregando organização do Supabase...</span>
        </div>
      ) : organizations.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-sm text-slate-600">
          Nenhuma organização disponível para esta conta. Verifique o perfil com o administrador.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {organizations.map((org) => (
            <div
              key={org.id}
              className="p-6 rounded-2xl border border-indigo-500 shadow-md ring-1 ring-indigo-500/20 bg-white"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                    {org.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{org.name}</h3>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">slug: {org.slug}</div>
                  </div>
                </div>
                <Badge variant="success" size="sm" className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ativa
                </Badge>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Plano:</span>
                  <span className="ml-1.5 font-medium text-slate-800 uppercase">{org.plan}</span>
                </div>
                <div>
                  <span className="text-slate-500">Criada em:</span>
                  <span className="ml-1.5 font-mono text-slate-600">
                    {new Date(org.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-700">
                <ShieldCheck className="w-4 h-4" /> Você está gerenciando esta organização
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
