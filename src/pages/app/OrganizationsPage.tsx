import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, CheckCircle2, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Organization } from '../../types';
import { organizationsService } from '../../services';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';

export const OrganizationsPage: React.FC = () => {
  const { organization, switchOrganization, createOrganization } = useAuth();
  const { success, error: toastError } = useToast();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await organizationsService.getAll();
      setOrganizations(data || []);
    } catch (err: any) {
      toastError('Erro ao carregar organizações: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) {
      toastError('Informe o nome da nova organização.');
      return;
    }

    setIsSubmitting(true);
    try {
      const org = await createOrganization(newOrgName.trim());
      await loadData();
      setIsModalOpen(false);
      setNewOrgName('');
      success(`Organização "${org.name}" criada com sucesso no Supabase!`);
    } catch (err: any) {
      toastError('Erro ao criar organização: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectOrg = (id: string) => {
    switchOrganization(id);
    success('Organização ativa alterada.');
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-700" />
            Organizações & Multi-Tenancy
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ambientes com isolamento estrito de dados e banco de dados via PostgreSQL RLS
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
          className="text-xs"
        >
          Criar Nova Organização
        </Button>
      </div>

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-slate-600" />
          <span className="text-xs font-medium">Carregando organizações do Supabase...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {organizations.map((org) => {
            const isCurrent = org.id === organization?.id;

            return (
              <div
                key={org.id}
                className={`p-6 rounded-2xl border transition-all flex flex-col justify-between space-y-5 bg-white ${
                  isCurrent
                    ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                        {org.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{org.name}</h3>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">slug: {org.slug}</div>
                      </div>
                    </div>

                    {isCurrent && (
                      <Badge variant="success" size="sm" className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Ativa
                      </Badge>
                    )}
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
                </div>

                <div>
                  {isCurrent ? (
                    <div className="text-xs text-emerald-700 font-medium flex items-center gap-1.5 py-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Você está gerenciando esta organização agora</span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectOrg(org.id)}
                      className="w-full text-xs"
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      Alternar para esta Organização
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Criar Nova Organização"
        description="Um novo espaço de trabalho isolado será criado com suas próprias lideranças, metas e contatos."
      >
        <form onSubmit={handleCreateOrg} className="space-y-4 text-left">
          <Input
            label="Nome da Organização"
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            placeholder="Ex.: Campanha Deputado 2026"
            required
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Criar Organização
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
