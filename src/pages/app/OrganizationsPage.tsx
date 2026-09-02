import React, { useState } from 'react';
import { Building2, Plus, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { localStore } from '../../lib/supabase';
import { Organization } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';

export const OrganizationsPage: React.FC = () => {
  const { organization, switchOrganization, createOrganization } = useAuth();
  const { success, error: toastError } = useToast();

  const [organizations, setOrganizations] = useState<Organization[]>(() => localStore.getOrganizations());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');

  const reloadData = () => {
    setOrganizations(localStore.getOrganizations());
  };

  const handleCreateOrg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) {
      toastError('Informe o nome da nova organização.');
      return;
    }

    const org = createOrganization(newOrgName.trim());
    reloadData();
    setIsModalOpen(false);
    setNewOrgName('');
    success(`Organização "${org.name}" criada com sucesso!`);
  };

  const handleSelectOrg = (id: string) => {
    switchOrganization(id);
    success('Organização ativa alterada.');
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/60">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-zinc-400" />
            Organizações & Multi-Tenancy
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {organizations.map((org) => {
          const isCurrent = org.id === organization?.id;

          return (
            <div
              key={org.id}
              className={`p-6 rounded-2xl border transition-all flex flex-col justify-between space-y-5 ${
                isCurrent
                  ? 'bg-zinc-900 border-zinc-500/60 shadow-lg'
                  : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-100">
                      {org.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-100">{org.name}</h3>
                      <div className="text-xs text-zinc-500 font-mono mt-0.5">slug: {org.slug}</div>
                    </div>
                  </div>

                  {isCurrent && (
                    <Badge variant="success" size="sm" className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Ativa
                    </Badge>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-800/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-zinc-500">Plano:</span>
                    <span className="ml-1.5 font-medium text-zinc-300 uppercase">{org.plan}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Criada em:</span>
                    <span className="ml-1.5 font-mono text-zinc-400">
                      {new Date(org.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                {isCurrent ? (
                  <div className="text-xs text-zinc-400 flex items-center gap-1.5 py-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
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

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Criar Nova Organização"
        description="Um novo ambiente isolado por tenant será inicializado."
      >
        <form onSubmit={handleCreateOrg} className="space-y-4 text-left">
          <Input
            label="Nome da Organização"
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            placeholder="Ex.: Campanha Municipal 2026 - Diretório Regional"
            required
            autoFocus
          />

          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-xs text-zinc-400 leading-relaxed">
            Ao criar esta organização, você será configurado como <strong>Administrador Geral</strong> com acesso irrestrito a todos os módulos e políticas RLS criadas automaticamente.
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Criar e Entrar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
