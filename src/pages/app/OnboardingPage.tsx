import React, { useState } from 'react';
import { Building2, MapPin, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { localStore } from '../../lib/supabase';

interface OnboardingPageProps {
  onNavigate: (path: string) => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onNavigate }) => {
  const { organization, profile, updateProfile } = useAuth();
  const { success } = useToast();

  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState(organization?.name || 'Minha Operação 2026');
  const [territoryType, setTerritoryType] = useState<'bairro' | 'municipio' | 'zona' | 'regiao'>('bairro');
  const [firstCoordinator, setFirstCoordinator] = useState('');
  const [firstPhone, setFirstPhone] = useState('');
  const [firstTerritory, setFirstTerritory] = useState('');

  const handleFinish = () => {
    if (organization) {
      const updatedOrg = {
        ...organization,
        name: orgName,
        settings: {
          ...organization.settings,
          territory_type: territoryType,
        }
      };
      localStore.saveOrganization(updatedOrg);

      if (firstCoordinator.trim()) {
        localStore.saveCoordinator({
          id: 'coord_' + Math.random().toString(36).substring(2, 9),
          organization_id: organization.id,
          name: firstCoordinator.trim(),
          phone: firstPhone.trim(),
          territory: firstTerritory.trim() || 'Região Central',
          status: 'active',
          created_at: new Date().toISOString(),
        });
      }
    }

    success('Configuração inicial concluída com sucesso!');
    onNavigate('/app/dashboard');
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4 text-left">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 text-zinc-950 font-black text-base shadow-sm mb-3">
          N
        </div>
        <h2 className="text-2xl font-bold text-zinc-100">Configuração Inicial</h2>
        <p className="text-xs text-zinc-400 mt-1">
          Personalize sua organização e comece a estruturar sua equipe
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <div className="border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-semibold text-zinc-200">Etapa 1 de 2: Organização & Território</h3>
              <p className="text-xs text-zinc-500">Defina os parâmetros base do seu ambiente multi-tenant</p>
            </div>

            <Input
              label="Nome da Organização"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Ex.: Campanha Regional 2026"
              leftIcon={<Building2 className="w-4 h-4" />}
            />

            <Select
              label="Divisão Territorial Padrão"
              value={territoryType}
              onChange={(e) => setTerritoryType(e.target.value as any)}
              options={[
                { value: 'bairro', label: 'Bairros (Urbano / Municipal)' },
                { value: 'municipio', label: 'Municípios (Estadual / Regional)' },
                { value: 'zona', label: 'Zonas Eleitorais / Seções' },
                { value: 'regiao', label: 'Macro-Regiões' },
              ]}
              helperText="Como sua equipe divide a atuação de campo."
            />

            <div className="pt-3">
              <Button
                variant="primary"
                size="md"
                onClick={() => setStep(2)}
                className="w-full"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Próximo Passo
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-semibold text-zinc-200">Etapa 2 de 2: Primeiro Coordenador (Opcional)</h3>
              <p className="text-xs text-zinc-500">Cadastre um coordenador de referência para começar</p>
            </div>

            <Input
              label="Nome do Coordenador"
              value={firstCoordinator}
              onChange={(e) => setFirstCoordinator(e.target.value)}
              placeholder="Ex.: Carlos Alberto"
            />

            <Input
              label="Telefone / WhatsApp"
              value={firstPhone}
              onChange={(e) => setFirstPhone(e.target.value)}
              placeholder="(11) 99999-9999"
            />

            <Input
              label="Território de Atuação"
              value={firstTerritory}
              onChange={(e) => setFirstTerritory(e.target.value)}
              placeholder="Ex.: Zona Central / Bairro Gonzaga"
              leftIcon={<MapPin className="w-4 h-4" />}
            />

            <div className="flex gap-2 pt-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => setStep(1)}
              >
                Voltar
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleFinish}
                className="flex-1"
                rightIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Concluir & Ir ao Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
