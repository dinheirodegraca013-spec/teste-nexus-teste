import React, { useState } from 'react';
import { Smartphone, Check, UserPlus, Tag, MapPin, CheckCircle2, UserCheck, Flame, Radio } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { localStore } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';

export const FieldPage: React.FC = () => {
  const { organization, profile } = useAuth();
  const { success, error: toastError } = useToast();
  const orgId = organization?.id || 'org-alpha';

  const leaders = localStore.getLeaders(orgId);
  const [activeTab, setActiveTab] = useState<'contact' | 'sticker' | 'presence'>('contact');

  // Contact fast form
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactNeighborhood, setContactNeighborhood] = useState('');
  const [contactLeader, setContactLeader] = useState(leaders[0]?.id || '');
  const [isMultiplier, setIsMultiplier] = useState(false);
  const [wantsSticker, setWantsSticker] = useState(false);

  // Sticker fast form
  const [stickerType, setStickerType] = useState<'car' | 'house'>('car');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [addressLocation, setAddressLocation] = useState('');

  // Presence fast check-in
  const [presenceName, setPresenceName] = useState('');
  const [presencePhone, setPresencePhone] = useState('');
  const [activityName, setActivityName] = useState('Caminhada de Rua / Feira');

  const [counterToday, setCounterToday] = useState(14);

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) {
      toastError('Informe pelo menos Nome e Telefone.');
      return;
    }

    const assignedLeader = leaders.find(l => l.id === contactLeader);

    localStore.saveContact({
      id: 'crm_field_' + Math.random().toString(36).substring(2, 9),
      organization_id: orgId,
      leader_id: contactLeader || undefined,
      leader_name: assignedLeader?.name,
      full_name: contactName.trim(),
      phone: contactPhone.trim(),
      territory: contactNeighborhood.trim() || assignedLeader?.territory || 'Campo',
      neighborhood: contactNeighborhood.trim() || assignedLeader?.neighborhood || undefined,
      status: isMultiplier ? 'multiplier' : 'supporter',
      tags: wantsSticker ? ['campo', 'adesivo'] : ['campo'],
      responsible: profile?.full_name || 'Operador de Campo',
      created_at: new Date().toISOString(),
    });

    if (wantsSticker) {
      localStore.saveCarSticker({
        id: 'cst_' + Math.random().toString(36).substring(2, 9),
        organization_id: orgId,
        owner_name: contactName.trim(),
        owner_phone: contactPhone.trim(),
        territory: contactNeighborhood.trim() || 'Campo',
        status: 'applied',
        created_at: new Date().toISOString(),
      });
    }

    setContactName('');
    setContactPhone('');
    setContactNeighborhood('');
    setIsMultiplier(false);
    setWantsSticker(false);
    setCounterToday(prev => prev + 1);

    success('Contato gravado em 3 segundos!');
  };

  const handleSaveSticker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerName.trim()) {
      toastError('Informe o nome do responsável.');
      return;
    }

    if (stickerType === 'car') {
      localStore.saveCarSticker({
        id: 'cst_' + Math.random().toString(36).substring(2, 9),
        organization_id: orgId,
        plate: vehiclePlate.trim().toUpperCase() || undefined,
        vehicle_model: vehicleModel.trim() || undefined,
        owner_name: ownerName.trim(),
        owner_phone: ownerPhone.trim() || undefined,
        territory: addressLocation.trim() || 'Ação de Rua',
        status: 'applied',
        created_at: new Date().toISOString(),
      });
    } else {
      localStore.saveHouseSticker({
        id: 'hst_' + Math.random().toString(36).substring(2, 9),
        organization_id: orgId,
        resident_name: ownerName.trim(),
        phone: ownerPhone.trim() || undefined,
        address: addressLocation.trim() || 'Endereço Local',
        territory: 'Bairro Residencial',
        status: 'applied',
        created_at: new Date().toISOString(),
      });
    }

    setOwnerName('');
    setOwnerPhone('');
    setVehiclePlate('');
    setVehicleModel('');
    setAddressLocation('');
    setCounterToday(prev => prev + 1);

    success('Adesivagem confirmada e salva!');
  };

  const handleSavePresence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!presenceName.trim()) {
      toastError('Informe o nome do participante.');
      return;
    }

    localStore.savePresenceLog({
      id: 'pres_' + Math.random().toString(36).substring(2, 9),
      organization_id: orgId,
      name: presenceName.trim(),
      phone: presencePhone.trim() || undefined,
      reference_name: activityName,
      status: 'present',
      created_at: new Date().toISOString(),
    });

    setPresenceName('');
    setPresencePhone('');
    setCounterToday(prev => prev + 1);

    success('Presença confirmada no evento!');
  };

  return (
    <div className="max-w-md mx-auto space-y-4 text-left pb-12">
      {/* Top Banner: Mobile Fast Action Header */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-950">Operação de Campo</h2>
            <p className="text-[11px] text-slate-500">Modo de registro rápido</p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs font-mono font-bold text-emerald-700">{counterToday} salvos</div>
          <div className="text-[10px] text-slate-400">Hoje na equipe</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('contact')}
          className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'contact' ? 'bg-white text-slate-950 font-semibold shadow-xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Contato</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sticker')}
          className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'sticker' ? 'bg-white text-slate-950 font-semibold shadow-xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Adesivo</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('presence')}
          className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'presence' ? 'bg-white text-slate-950 font-semibold shadow-xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Presença</span>
        </button>
      </div>

      {/* Tab 1: Fast Contact Form */}
      {activeTab === 'contact' && (
        <form onSubmit={handleSaveContact} className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3.5 shadow-2xs">
          <div className="border-b border-slate-100 pb-2.5">
            <h3 className="text-sm font-semibold text-slate-900">Cadastrar Novo Apoiador</h3>
            <p className="text-[11px] text-slate-500">Salva direto no CRM da organização</p>
          </div>

          <Input
            label="Nome Completo *"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Ex.: Maria de Fátima"
            required
            autoFocus
          />

          <Input
            label="WhatsApp / Celular *"
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="(11) 98888-7777"
            required
          />

          <Input
            label="Bairro"
            value={contactNeighborhood}
            onChange={(e) => setContactNeighborhood(e.target.value)}
            placeholder="Ex.: Gonzaga / Macuco"
          />

          <Select
            label="Liderança de Referência"
            value={contactLeader}
            onChange={(e) => setContactLeader(e.target.value)}
            options={[
              { value: '', label: 'Coordenação Geral' },
              ...leaders.map(l => ({ value: l.id, label: `${l.name} (${l.neighborhood || l.territory})` }))
            ]}
          />

          {/* Quick Toggle Checkboxes */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer">
              <input
                type="checkbox"
                checked={isMultiplier}
                onChange={(e) => setIsMultiplier(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span className="text-xs text-slate-800 font-medium">Classificar como Multiplicador</span>
            </label>

            <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer">
              <input
                type="checkbox"
                checked={wantsSticker}
                onChange={(e) => setWantsSticker(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span className="text-xs text-slate-800 font-medium">Aplicou Adesivo de Carro</span>
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            rightIcon={<Check className="w-4 h-4" />}
          >
            Gravar Contato
          </Button>
        </form>
      )}

      {/* Tab 2: Fast Sticker Form */}
      {activeTab === 'sticker' && (
        <form onSubmit={handleSaveSticker} className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3.5 shadow-2xs">
          <div className="border-b border-slate-100 pb-2.5">
            <h3 className="text-sm font-semibold text-slate-900">Lançamento de Adesivagem</h3>
            <p className="text-[11px] text-slate-500">Registro de veículos e residências</p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStickerType('car')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                stickerType === 'car' ? 'bg-slate-900 text-white border-slate-900 font-semibold' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              Veículo / Carro
            </button>
            <button
              type="button"
              onClick={() => setStickerType('house')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                stickerType === 'house' ? 'bg-slate-900 text-white border-slate-900 font-semibold' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              Residência / Casa
            </button>
          </div>

          <Input
            label={stickerType === 'car' ? 'Nome do Proprietário *' : 'Nome do Morador *'}
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Ex.: Roberto Silva"
            required
            autoFocus
          />

          <Input
            label="Telefone / WhatsApp"
            type="tel"
            value={ownerPhone}
            onChange={(e) => setOwnerPhone(e.target.value)}
            placeholder="(11) 98888-0000"
          />

          {stickerType === 'car' ? (
            <div className="grid grid-cols-2 gap-2.5">
              <Input
                label="Placa do Carro"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                placeholder="ABC1D23"
              />
              <Input
                label="Modelo / Cor"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="Onix Preto"
              />
            </div>
          ) : (
            <Input
              label="Endereço / Bairro"
              value={addressLocation}
              onChange={(e) => setAddressLocation(e.target.value)}
              placeholder="Rua das Flores, 140 - Gonzaga"
            />
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            rightIcon={<Check className="w-4 h-4" />}
          >
            Confirmar Adesivagem
          </Button>
        </form>
      )}

      {/* Tab 3: Fast Presence Form */}
      {activeTab === 'presence' && (
        <form onSubmit={handleSavePresence} className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3.5 shadow-2xs">
          <div className="border-b border-slate-100 pb-2.5">
            <h3 className="text-sm font-semibold text-slate-900">Check-in de Presença Rápido</h3>
            <p className="text-[11px] text-slate-500">Para reuniões, plenárias e comícios</p>
          </div>

          <Input
            label="Atividade / Evento Atual"
            value={activityName}
            onChange={(e) => setActivityName(e.target.value)}
            placeholder="Ex.: Plenária do Bairro Gonzaga"
          />

          <Input
            label="Nome do Participante *"
            value={presenceName}
            onChange={(e) => setPresenceName(e.target.value)}
            placeholder="Ex.: Juliana Almeida"
            required
            autoFocus
          />

          <Input
            label="WhatsApp para Contato"
            type="tel"
            value={presencePhone}
            onChange={(e) => setPresencePhone(e.target.value)}
            placeholder="(11) 97777-6666"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            rightIcon={<Check className="w-4 h-4" />}
          >
            Registrar Presença
          </Button>
        </form>
      )}
    </div>
  );
};
