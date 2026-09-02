import React, { useState, useEffect } from 'react';
import { Smartphone, Check, UserPlus, Tag, MapPin, CheckCircle2, UserCheck, Flame, Radio, Car, Home, Target, TrendingUp, Phone, Users, Image as ImageIcon, Eye, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { localStore } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { FileUpload } from '../../components/ui/FileUpload';
import { Leader, CarSticker, HouseSticker, CrmContact, FieldPresence } from '../../types';

interface FieldPageProps {
  onNavigate?: (path: string) => void;
}

export const FieldPage: React.FC<FieldPageProps> = ({ onNavigate }) => {
  const { organization, profile } = useAuth();
  const { success, error: toastError } = useToast();
  const orgId = organization?.id || 'org-alpha';

  const [leaders, setLeaders] = useState<Leader[]>(() => localStore.getLeaders(orgId));
  const [activeTab, setActiveTab] = useState<'contact' | 'cars' | 'houses' | 'presence'>('contact');

  // Find leader profile if logged in as leader or matching name/email
  const currentLeader = leaders.find(
    l => l.email?.toLowerCase() === profile?.email?.toLowerCase() ||
         l.name.toLowerCase() === profile?.full_name?.toLowerCase() ||
         l.id === profile?.id
  ) || leaders[0];

  // Contact fast form
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactNeighborhood, setContactNeighborhood] = useState(currentLeader?.neighborhood || '');
  const [contactLeader, setContactLeader] = useState(currentLeader?.id || '');
  const [isMultiplier, setIsMultiplier] = useState(false);
  const [wantsSticker, setWantsSticker] = useState(false);

  // Car sticker fast form
  const [carOwnerName, setCarOwnerName] = useState('');
  const [carOwnerPhone, setCarOwnerPhone] = useState('');
  const [carPlate, setCarPlate] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carTerritory, setCarTerritory] = useState(currentLeader?.territory || 'Região Central');
  const [carPhoto, setCarPhoto] = useState<string | null>(null);
  const [carFileName, setCarFileName] = useState<string | null>(null);

  // House sticker fast form
  const [houseResidentName, setHouseResidentName] = useState('');
  const [housePhone, setHousePhone] = useState('');
  const [houseAddress, setHouseAddress] = useState('');
  const [houseTerritory, setHouseTerritory] = useState(currentLeader?.territory || 'Região Central');
  const [housePhoto, setHousePhoto] = useState<string | null>(null);
  const [houseFileName, setHouseFileName] = useState<string | null>(null);

  // Image Preview Modal
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Presence fast check-in
  const [presenceName, setPresenceName] = useState('');
  const [presencePhone, setPresencePhone] = useState('');
  const [activityName, setActivityName] = useState('Caminhada de Rua / Feira');
  const [presencePhoto, setPresencePhoto] = useState<string | null>(null);
  const [presenceFileName, setPresenceFileName] = useState<string | null>(null);
  const [isSubmittingPresence, setIsSubmittingPresence] = useState(false);

  // Local data lists for real-time progress
  const [recentContacts, setRecentContacts] = useState<CrmContact[]>(() => localStore.getContacts(orgId));
  const [carStickers, setCarStickers] = useState<CarSticker[]>(() => localStore.getCarStickers(orgId));
  const [houseStickers, setHouseStickers] = useState<HouseSticker[]>(() => localStore.getHouseStickers(orgId));
  const [presenceLogs, setPresenceLogs] = useState<FieldPresence[]>(() => localStore.getPresenceLogs(orgId));

  const reloadData = () => {
    setLeaders(localStore.getLeaders(orgId));
    setRecentContacts(localStore.getContacts(orgId));
    setCarStickers(localStore.getCarStickers(orgId));
    setHouseStickers(localStore.getHouseStickers(orgId));
    setPresenceLogs(localStore.getPresenceLogs(orgId));
  };

  useEffect(() => {
    reloadData();
  }, [orgId]);

  // Target metrics calculation
  const contactsGoal = currentLeader?.goal_target || 300;
  const contactsReached = (currentLeader?.goal_reached || 0) + recentContacts.filter(c => c.leader_id === currentLeader?.id).length;
  const contactsPercent = Math.min(100, Math.round((contactsReached / (contactsGoal || 1)) * 100));

  const carsGoal = 50;
  const carsReached = carStickers.length;
  const carsPercent = Math.min(100, Math.round((carsReached / carsGoal) * 100));

  const housesGoal = 30;
  const housesReached = houseStickers.length;
  const housesPercent = Math.min(100, Math.round((housesReached / housesGoal) * 100));

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) {
      toastError('Informe pelo menos Nome e Telefone.');
      return;
    }

    const assignedLeader = leaders.find(l => l.id === contactLeader) || currentLeader;

    localStore.saveContact({
      id: 'crm_field_' + Math.random().toString(36).substring(2, 9),
      organization_id: orgId,
      leader_id: assignedLeader?.id,
      leader_name: assignedLeader?.name,
      full_name: contactName.trim(),
      phone: contactPhone.trim(),
      territory: contactNeighborhood.trim() || assignedLeader?.territory || 'Campo',
      neighborhood: contactNeighborhood.trim() || assignedLeader?.neighborhood || undefined,
      status: isMultiplier ? 'multiplier' : 'supporter',
      tags: wantsSticker ? ['campo', 'adesivo'] : ['campo'],
      responsible: profile?.full_name || assignedLeader?.name || 'Líder de Campo',
      created_at: new Date().toISOString(),
    });

    if (wantsSticker) {
      localStore.saveCarSticker({
        id: 'cst_' + Math.random().toString(36).substring(2, 9),
        organization_id: orgId,
        owner_name: contactName.trim(),
        owner_phone: contactPhone.trim(),
        territory: contactNeighborhood.trim() || assignedLeader?.territory || 'Campo',
        status: 'applied',
        created_at: new Date().toISOString(),
      });
    }

    setContactName('');
    setContactPhone('');
    setContactNeighborhood(currentLeader?.neighborhood || '');
    setIsMultiplier(false);
    setWantsSticker(false);

    reloadData();
    success('Apoiador salvo com sucesso!');
  };

  const [isSubmittingHouse, setIsSubmittingHouse] = useState(false);
  const [isSubmittingCar, setIsSubmittingCar] = useState(false);

  const handleSaveCar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!carOwnerName.trim()) {
      toastError('Informe o nome do proprietário ou condutor.');
      return;
    }

    setIsSubmittingCar(true);
    try {
      localStore.saveCarSticker({
        id: 'cst_' + Math.random().toString(36).substring(2, 9),
        organization_id: orgId,
        plate: carPlate.trim().toUpperCase() || undefined,
        vehicle_model: carModel.trim() || undefined,
        owner_name: carOwnerName.trim(),
        owner_phone: carOwnerPhone.trim() || undefined,
        territory: carTerritory.trim() || currentLeader?.territory || 'Ação de Campo',
        photo_url: carPhoto || undefined,
        attachment_name: carFileName || undefined,
        status: 'applied',
        created_at: new Date().toISOString(),
      });

      setCarOwnerName('');
      setCarOwnerPhone('');
      setCarPlate('');
      setCarModel('');
      setCarPhoto(null);
      setCarFileName(null);

      reloadData();
      success('Carro adesivado registrado com sucesso!');
    } catch {
      toastError('Erro ao registrar veículo. Tente novamente.');
    } finally {
      setIsSubmittingCar(false);
    }
  };

  const handleSaveHouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseResidentName.trim()) {
      toastError('Informe o nome do morador ou responsável.');
      return;
    }

    setIsSubmittingHouse(true);
    try {
      const finalAddress = houseAddress.trim() || houseTerritory.trim() || 'Residência autorizada';
      const finalTerritory = houseTerritory.trim() || currentLeader?.territory || 'Bairro Residencial';

      localStore.saveHouseSticker({
        id: 'hst_' + Math.random().toString(36).substring(2, 9),
        organization_id: orgId,
        resident_name: houseResidentName.trim(),
        phone: housePhone.trim() || undefined,
        address: finalAddress,
        territory: finalTerritory,
        photo_url: housePhoto || undefined,
        attachment_name: houseFileName || undefined,
        status: 'applied',
        created_at: new Date().toISOString(),
      });

      setHouseResidentName('');
      setHousePhone('');
      setHouseAddress('');
      setHousePhoto(null);
      setHouseFileName(null);

      reloadData();
      success('Casa adesivada registrada com sucesso!');
    } catch {
      toastError('Erro ao registrar casa. Tente novamente.');
    } finally {
      setIsSubmittingHouse(false);
    }
  };

  const handleSavePresence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!presenceName.trim()) {
      toastError('Informe o nome do participante.');
      return;
    }

    setIsSubmittingPresence(true);
    try {
      localStore.savePresenceLog({
        id: 'pres_' + Math.random().toString(36).substring(2, 9),
        organization_id: orgId,
        name: presenceName.trim(),
        phone: presencePhone.trim() || undefined,
        reference_name: activityName.trim() || 'Reunião / Ato Público',
        photo_url: presencePhoto || undefined,
        attachment_name: presenceFileName || undefined,
        status: 'present',
        created_at: new Date().toISOString(),
      });

      setPresenceName('');
      setPresencePhone('');
      setPresencePhoto(null);
      setPresenceFileName(null);

      reloadData();
      success('Presença confirmada no evento!');
    } catch {
      toastError('Erro ao registrar presença. Tente novamente.');
    } finally {
      setIsSubmittingPresence(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 text-left pb-12">
      {/* Top Banner: Painel do Líder e Metas */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-xs">
              <Target className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-950">
                  {profile?.full_name || currentLeader?.name || 'Painel da Liderança'}
                </h2>
                <Badge variant="success">Líder Ativo</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentLeader?.neighborhood ? `Bairro: ${currentLeader.neighborhood}` : 'Operação de Campo'} • {organization?.name || 'Campanha'}
              </p>
            </div>
          </div>
        </div>

        {/* Metas em Destaque */}
        <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Meta Apoiadores</span>
              <Users className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-slate-900">{contactsReached}</span>
              <span className="text-xs text-slate-400">/ {contactsGoal}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-slate-900 rounded-full transition-all duration-300"
                style={{ width: `${contactsPercent}%` }}
              />
            </div>
            <div className="text-[10px] text-right font-semibold text-slate-600 mt-1">{contactsPercent}%</div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
            <div className="flex items-center justify-between text-[11px] text-emerald-800 font-medium">
              <span>Carros Adesivados</span>
              <Car className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-emerald-950">{carsReached}</span>
              <span className="text-xs text-emerald-600">/ {carsGoal}</span>
            </div>
            <div className="w-full h-1.5 bg-emerald-200 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                style={{ width: `${carsPercent}%` }}
              />
            </div>
            <div className="text-[10px] text-right font-semibold text-emerald-700 mt-1">{carsPercent}%</div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80">
            <div className="flex items-center justify-between text-[11px] text-amber-800 font-medium">
              <span>Casas Adesivadas</span>
              <Home className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-amber-950">{housesReached}</span>
              <span className="text-xs text-amber-600">/ {housesGoal}</span>
            </div>
            <div className="w-full h-1.5 bg-amber-200 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-amber-600 rounded-full transition-all duration-300"
                style={{ width: `${housesPercent}%` }}
              />
            </div>
            <div className="text-[10px] text-right font-semibold text-amber-700 mt-1">{housesPercent}%</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('contact')}
          className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
            activeTab === 'contact' ? 'bg-white text-slate-950 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Apoiador</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cars')}
          className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
            activeTab === 'cars' ? 'bg-white text-slate-950 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Car className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Carros</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('houses')}
          className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
            activeTab === 'houses' ? 'bg-white text-slate-950 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Home className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Casas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('presence')}
          className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
            activeTab === 'presence' ? 'bg-white text-slate-950 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Presença</span>
        </button>
      </div>

      {/* Tab 1: Fast Contact Form */}
      {activeTab === 'contact' && (
        <div className="space-y-4">
          <form onSubmit={handleSaveContact} className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3.5 shadow-2xs">
            <div className="border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-semibold text-slate-900">Cadastrar Novo Apoiador</h3>
              <p className="text-[11px] text-slate-500">Salva direto na sua base de contatos</p>
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
              Gravar Apoiador
            </Button>
          </form>

          {/* Últimos contatos cadastrados */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Últimos Apoiadores Cadastrados
            </h4>
            <div className="space-y-2">
              {recentContacts.slice(0, 5).map(c => (
                <div key={c.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">{c.full_name}</div>
                    <div className="text-[11px] text-slate-500">{c.phone} • {c.neighborhood || c.territory}</div>
                  </div>
                  <Badge variant={c.status === 'multiplier' ? 'success' : 'default'}>
                    {c.status === 'multiplier' ? 'Multiplicador' : 'Apoiador'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Fast Car Sticker Form */}
      {activeTab === 'cars' && (
        <div className="space-y-4">
          <form onSubmit={handleSaveCar} className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3.5 shadow-2xs">
            <div className="border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Car className="w-4 h-4 text-emerald-600" />
                Cadastrar Carro Adesivado
              </h3>
              <p className="text-[11px] text-slate-500">Registro de veículos que receberam adesivo</p>
            </div>

            <Input
              label="Nome do Proprietário / Motorista *"
              value={carOwnerName}
              onChange={(e) => setCarOwnerName(e.target.value)}
              placeholder="Ex.: Roberto Silva"
              required
              autoFocus
            />

            <Input
              label="Telefone / WhatsApp"
              type="tel"
              value={carOwnerPhone}
              onChange={(e) => setCarOwnerPhone(e.target.value)}
              placeholder="(11) 98888-0000"
            />

            <div className="grid grid-cols-2 gap-2.5">
              <Input
                label="Placa do Carro"
                value={carPlate}
                onChange={(e) => setCarPlate(e.target.value)}
                placeholder="ABC1D23"
              />
              <Input
                label="Modelo / Cor"
                value={carModel}
                onChange={(e) => setCarModel(e.target.value)}
                placeholder="Ex.: Onix Preto"
              />
            </div>

            <Input
              label="Bairro / Região"
              value={carTerritory}
              onChange={(e) => setCarTerritory(e.target.value)}
              placeholder="Ex.: Gonzaga"
            />

            {/* Photo / File Upload for Car Sticker */}
            <FileUpload
              label="Foto do Carro Adesivado (Opcional)"
              helperText="Tire uma foto do veículo adesivado ou anexe o arquivo (JPG/PNG)"
              value={carPhoto}
              fileName={carFileName}
              onChange={(dataUrl, meta) => {
                setCarPhoto(dataUrl);
                setCarFileName(meta?.name || null);
              }}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmittingCar}
              className="w-full mt-2"
              rightIcon={<Check className="w-4 h-4" />}
            >
              Registrar Carro Adesivado
            </Button>
          </form>

          {/* Lista de Carros Adesivados */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Carros Adesivados ({carStickers.length})
              </h4>
            </div>
            {carStickers.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">Nenhum carro cadastrado ainda.</p>
            ) : (
              <div className="space-y-2">
                {carStickers.map(car => (
                  <div key={car.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {car.photo_url ? (
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ url: car.photo_url!, title: `${car.owner_name} - ${car.vehicle_model || car.plate || 'Carro'}` })}
                          className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-300 relative group cursor-pointer"
                          title="Clique para ver a foto ampliada"
                        >
                          <img
                            src={car.photo_url}
                            alt="Foto do carro"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye className="w-3.5 h-3.5 text-white" />
                          </div>
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                          <Car className="w-4 h-4" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 truncate">{car.owner_name}</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {car.vehicle_model || 'Veículo'} {car.plate ? `• Placa: ${car.plate}` : ''} {car.owner_phone ? `• ${car.owner_phone}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {car.photo_url && (
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ url: car.photo_url!, title: `${car.owner_name} - ${car.vehicle_model || car.plate || 'Carro'}` })}
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                          title="Ver Foto"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <Badge variant="success">Adesivado</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Fast House Sticker Form */}
      {activeTab === 'houses' && (
        <div className="space-y-4">
          <form onSubmit={handleSaveHouse} className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3.5 shadow-2xs">
            <div className="border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Home className="w-4 h-4 text-amber-600" />
                Cadastrar Casa Adesivada
              </h3>
              <p className="text-[11px] text-slate-500">Autorizações para faixas, placas ou perfurado em residências</p>
            </div>

            <Input
              label="Nome do Morador / Responsável *"
              value={houseResidentName}
              onChange={(e) => setHouseResidentName(e.target.value)}
              placeholder="Ex.: Dona Helena / Carlos Souza"
              required
              autoFocus
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Telefone / WhatsApp"
                type="tel"
                value={housePhone}
                onChange={(e) => setHousePhone(e.target.value)}
                placeholder="(11) 97777-1111"
              />
              <Input
                label="Bairro / Região"
                value={houseTerritory}
                onChange={(e) => setHouseTerritory(e.target.value)}
                placeholder="Ex.: Gonzaga / Centro"
              />
            </div>

            <Input
              label="Endereço (Rua e Número)"
              value={houseAddress}
              onChange={(e) => setHouseAddress(e.target.value)}
              placeholder="Ex.: Rua das Flores, 140"
            />

            {/* Photo / File Upload for House Sticker */}
            <FileUpload
              label="Foto da Residência / Fachada Adesivada (Opcional)"
              helperText="Tire foto da fachada com a autorização/adesivo ou anexe comprovante"
              value={housePhoto}
              fileName={houseFileName}
              onChange={(dataUrl, meta) => {
                setHousePhoto(dataUrl);
                setHouseFileName(meta?.name || null);
              }}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmittingHouse}
              className="w-full mt-2"
              rightIcon={<Check className="w-4 h-4" />}
            >
              Registrar Casa Adesivada
            </Button>
          </form>

          {/* Lista de Casas Adesivadas */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Casas Adesivadas ({houseStickers.length})
              </h4>
            </div>
            {houseStickers.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">Nenhum residência cadastrada ainda.</p>
            ) : (
              <div className="space-y-2">
                {houseStickers.map(house => (
                  <div key={house.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {house.photo_url ? (
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ url: house.photo_url!, title: `${house.resident_name} - ${house.address}` })}
                          className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-300 relative group cursor-pointer"
                          title="Clique para ver a foto ampliada"
                        >
                          <img
                            src={house.photo_url}
                            alt="Foto da residência"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye className="w-3.5 h-3.5 text-white" />
                          </div>
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-amber-100/70 flex items-center justify-center text-amber-700 shrink-0">
                          <Home className="w-4 h-4" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 truncate">{house.resident_name}</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {house.address} {house.phone ? `• ${house.phone}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {house.photo_url && (
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ url: house.photo_url!, title: `${house.resident_name} - ${house.address}` })}
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                          title="Ver Foto"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <Badge variant="warning">Autorizado</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Fast Presence Form */}
      {activeTab === 'presence' && (
        <div className="space-y-4">
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

            {/* Photo / File Upload for Presence */}
            <FileUpload
              label="Foto / Comprovante de Presença (Opcional)"
              helperText="Selfie, foto do participante, crachá ou foto do ato/reunião"
              value={presencePhoto}
              fileName={presenceFileName}
              onChange={(dataUrl, meta) => {
                setPresencePhoto(dataUrl || null);
                setPresenceFileName(meta?.name || null);
              }}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmittingPresence}
              className="w-full mt-2"
              rightIcon={<Check className="w-4 h-4" />}
            >
              Registrar Presença
            </Button>
          </form>

          {/* Lista de Presenças Confirmadas */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Presenças Registradas ({presenceLogs.length})
              </h4>
            </div>
            {presenceLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">Nenhum check-in registrado nesta sessão.</p>
            ) : (
              <div className="space-y-2">
                {presenceLogs.map(log => (
                  <div key={log.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {log.photo_url ? (
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ url: log.photo_url!, title: `${log.name} - ${log.reference_name || 'Presença'}` })}
                          className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-300 relative group cursor-pointer"
                          title="Clique para ver a foto ampliada"
                        >
                          <img
                            src={log.photo_url}
                            alt="Foto do participante"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye className="w-3.5 h-3.5 text-white" />
                          </div>
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {log.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 truncate">{log.name}</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {log.reference_name || 'Evento'} {log.phone ? `• ${log.phone}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {log.photo_url && (
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ url: log.photo_url!, title: `${log.name} - ${log.reference_name || 'Presença'}` })}
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                          title="Ver Foto"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <Badge variant="success">Presente</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative max-w-xl w-full bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between text-white">
              <span className="text-xs font-semibold truncate pr-4">{previewImage.title}</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 flex items-center justify-center bg-black/60 max-h-[75vh] overflow-auto">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[70vh] w-auto object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

