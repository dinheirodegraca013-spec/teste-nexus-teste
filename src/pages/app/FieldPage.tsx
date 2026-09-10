import React, { useState, useEffect, useCallback } from 'react';
import { Smartphone, Check, UserPlus, Tag, MapPin, CheckCircle2, UserCheck, Flame, Radio, Car, Home, Target, TrendingUp, Phone, Users, Image as ImageIcon, Eye, X, Camera, UploadCloud, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { FileUpload } from '../../components/ui/FileUpload';
import { Leader, CarSticker, HouseSticker, CrmContact, FieldPresence } from '../../types';
import { leadersService, crmService, stickersService, presenceService } from '../../services';

interface FieldPageProps {
  onNavigate?: (path: string) => void;
}

export const FieldPage: React.FC<FieldPageProps> = ({ onNavigate }) => {
  const { organization, profile } = useAuth();
  const { success, error: toastError } = useToast();
  const orgId = organization?.id || '';

  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [activeTab, setActiveTab] = useState<'contact' | 'cars' | 'houses' | 'presence'>('contact');
  const [isLoading, setIsLoading] = useState(true);

  // Local data lists from Supabase
  const [recentContacts, setRecentContacts] = useState<CrmContact[]>([]);
  const [carStickers, setCarStickers] = useState<CarSticker[]>([]);
  const [houseStickers, setHouseStickers] = useState<HouseSticker[]>([]);
  const [presenceLogs, setPresenceLogs] = useState<FieldPresence[]>([]);

  // Find leader profile if logged in as leader or matching name/email
  const currentLeader = leaders.find(
    l => l.email?.toLowerCase() === profile?.email?.toLowerCase() ||
         l.name.toLowerCase() === profile?.full_name?.toLowerCase() ||
         l.id === profile?.id
  ) || leaders[0];

  // Contact fast form
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactNeighborhood, setContactNeighborhood] = useState('');
  const [contactLeader, setContactLeader] = useState('');
  const [isMultiplier, setIsMultiplier] = useState(false);
  const [wantsSticker, setWantsSticker] = useState(false);
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  // Car sticker fast form
  const [carOwnerName, setCarOwnerName] = useState('');
  const [carOwnerPhone, setCarOwnerPhone] = useState('');
  const [carPlate, setCarPlate] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carTerritory, setCarTerritory] = useState('Região Central');
  const [carPhoto, setCarPhoto] = useState<string | null>(null);
  const [carFileName, setCarFileName] = useState<string | null>(null);
  const [isSubmittingCar, setIsSubmittingCar] = useState(false);

  // House sticker fast form
  const [houseResidentName, setHouseResidentName] = useState('');
  const [housePhone, setHousePhone] = useState('');
  const [houseAddress, setHouseAddress] = useState('');
  const [houseTerritory, setHouseTerritory] = useState('Região Central');
  const [housePhoto, setHousePhoto] = useState<string | null>(null);
  const [houseFileName, setHouseFileName] = useState<string | null>(null);
  const [isSubmittingHouse, setIsSubmittingHouse] = useState(false);

  // Presence fast check-in
  const [presenceName, setPresenceName] = useState('');
  const [presencePhone, setPresencePhone] = useState('');
  const [activityName, setActivityName] = useState('Caminhada de Rua / Feira');
  const [presencePhoto, setPresencePhoto] = useState<string | null>(null);
  const [presenceFileName, setPresenceFileName] = useState<string | null>(null);
  const [isSubmittingPresence, setIsSubmittingPresence] = useState(false);

  // Image Preview Modal
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const [leadsRes, contactsRes, carsRes, housesRes, presenceRes] = await Promise.all([
        leadersService.getAll(orgId),
        crmService.getAll(orgId),
        stickersService.getCarStickers(orgId),
        stickersService.getHouseStickers(orgId),
        presenceService.getLogs(orgId),
      ]);

      const loadedLeaders = leadsRes.data || [];
      setLeaders(loadedLeaders);
      setRecentContacts(contactsRes.data || []);
      setCarStickers(carsRes.data || []);
      setHouseStickers(housesRes.data || []);
      setPresenceLogs(presenceRes.data || []);

      if (loadedLeaders.length > 0) {
        const found = loadedLeaders.find(
          l => l.email?.toLowerCase() === profile?.email?.toLowerCase() ||
               l.name.toLowerCase() === profile?.full_name?.toLowerCase()
        ) || loadedLeaders[0];
        setContactNeighborhood(found.neighborhood || found.territory || '');
        setCarTerritory(found.territory || 'Central');
        setHouseTerritory(found.territory || 'Central');
        setContactLeader(found.id);
      }
    } catch (err: any) {
      toastError('Erro ao carregar dados do modo de campo: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, profile, toastError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Target metrics calculation (4 Goals: Apoiador, Carros, Casas, Presença)
  const contactsGoal = currentLeader?.goal_target || 10;
  const contactsReached = recentContacts.filter(c => !currentLeader?.id || c.leader_id === currentLeader.id).length;
  const contactsPercent = Math.min(100, Math.round(((contactsReached || 0) / (contactsGoal || 1)) * 100));

  const carsGoal = currentLeader?.goal_cars || 50;
  const carsReached = carStickers.length;
  const carsPercent = Math.min(100, Math.round(((carsReached || 0) / (carsGoal || 1)) * 100));

  const housesGoal = currentLeader?.goal_houses || 30;
  const housesReached = houseStickers.length;
  const housesPercent = Math.min(100, Math.round(((housesReached || 0) / (housesGoal || 1)) * 100));

  const presenceGoal = currentLeader?.goal_presence || 20;
  const presenceReached = presenceLogs.length;
  const presencePercent = Math.min(100, Math.round(((presenceReached || 0) / (presenceGoal || 1)) * 100));

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) {
      toastError('Informe pelo menos Nome e Telefone.');
      return;
    }

    setIsSubmittingContact(true);
    const assignedLeader = leaders.find(l => l.id === contactLeader) || currentLeader;

    const fieldTags = [
      'campo',
      isMultiplier ? 'multiplier' : 'supporter',
      wantsSticker ? 'adesivo' : null,
    ].filter(Boolean) as string[];

    try {
      const { error: crmErr } = await crmService.create({
        organization_id: orgId,
        leader_id: assignedLeader?.id,
        name: contactName.trim(),
        whatsapp: contactPhone.trim(),
        city: contactNeighborhood.trim() || assignedLeader?.territory || 'Campo',
        neighborhood: contactNeighborhood.trim() || assignedLeader?.neighborhood || undefined,
        origin: 'field',
        tags: fieldTags,
      });

      if (crmErr) {
        toastError('Erro ao registrar apoiador: ' + crmErr.message);
        return;
      }

      if (wantsSticker) {
        await stickersService.createCarSticker({
          organization_id: orgId,
          owner_name: contactName.trim(),
          owner_phone: contactPhone.trim(),
          territory: contactNeighborhood.trim() || assignedLeader?.territory || 'Campo',
          status: 'applied',
        });
      }

      // Update leader progress if assigned
      if (assignedLeader) {
        await leadersService.update(assignedLeader.id, {
          goal_reached: (assignedLeader.goal_reached || 0) + 1,
        });
      }

      setContactName('');
      setContactPhone('');
      setContactNeighborhood(currentLeader?.neighborhood || '');
      setIsMultiplier(false);
      setWantsSticker(false);

      await loadData();
      success('Apoiador salvo no Supabase com sucesso!');
    } catch (err: any) {
      toastError('Erro inesperado: ' + err.message);
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const handleSaveCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carOwnerName.trim()) {
      toastError('Informe o nome do proprietário ou condutor.');
      return;
    }

    setIsSubmittingCar(true);
    try {
      const { error } = await stickersService.createCarSticker({
        organization_id: orgId,
        plate: carPlate.trim().toUpperCase() || undefined,
        vehicle_model: carModel.trim() || undefined,
        owner_name: carOwnerName.trim(),
        owner_phone: carOwnerPhone.trim() || undefined,
        territory: carTerritory.trim() || currentLeader?.territory || 'Ação de Campo',
        photo_url: carPhoto || undefined,
        attachment_name: carFileName || undefined,
        status: 'applied',
      });

      if (error) {
        toastError('Erro ao registrar veículo: ' + error.message);
      } else {
        setCarOwnerName('');
        setCarOwnerPhone('');
        setCarPlate('');
        setCarModel('');
        setCarPhoto(null);
        setCarFileName(null);
        await loadData();
        success('Carro adesivado registrado com sucesso!');
      }
    } catch (err: any) {
      toastError('Erro ao registrar veículo: ' + err.message);
    } finally {
      setIsSubmittingCar(false);
    }
  };

  const handleSaveHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseResidentName.trim()) {
      toastError('Informe o nome do morador ou responsável.');
      return;
    }

    setIsSubmittingHouse(true);
    try {
      const finalAddress = houseAddress.trim() || houseTerritory.trim() || 'Residência autorizada';
      const finalTerritory = houseTerritory.trim() || currentLeader?.territory || 'Bairro Residencial';

      const { error } = await stickersService.createHouseSticker({
        organization_id: orgId,
        resident_name: houseResidentName.trim(),
        phone: housePhone.trim() || undefined,
        address: finalAddress,
        territory: finalTerritory,
        photo_url: housePhoto || undefined,
        attachment_name: houseFileName || undefined,
        status: 'applied',
      });

      if (error) {
        toastError('Erro ao registrar casa: ' + error.message);
      } else {
        setHouseResidentName('');
        setHousePhone('');
        setHouseAddress('');
        setHousePhoto(null);
        setHouseFileName(null);
        await loadData();
        success('Casa adesivada registrada com sucesso!');
      }
    } catch (err: any) {
      toastError('Erro ao registrar casa: ' + err.message);
    } finally {
      setIsSubmittingHouse(false);
    }
  };

  const handleSavePresence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!presenceName.trim()) {
      toastError('Informe o nome do participante.');
      return;
    }

    setIsSubmittingPresence(true);
    try {
      const { error } = await presenceService.createLog({
        organization_id: orgId,
        name: presenceName.trim(),
        phone: presencePhone.trim() || undefined,
        reference_name: activityName.trim() || 'Reunião / Ato Público',
        photo_url: presencePhoto || undefined,
        attachment_name: presenceFileName || undefined,
        status: 'present',
      });

      if (error) {
        toastError('Erro ao registrar presença: ' + error.message);
      } else {
        setPresenceName('');
        setPresencePhone('');
        setPresencePhoto(null);
        setPresenceFileName(null);
        await loadData();
        success('Presença confirmada e registrada com sucesso!');
      }
    } catch (err: any) {
      toastError('Erro ao registrar presença: ' + err.message);
    } finally {
      setIsSubmittingPresence(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 text-left pb-12">
      {/* Top Banner & Leader identification */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <Smartphone className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>Modo de Campo & Rua</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                  <Radio className="w-2.5 h-2.5 text-emerald-600 animate-pulse" /> Ao Vivo
                </span>
              </div>
              <div className="text-xs text-slate-600">
                {currentLeader ? (
                  <span>Líder: <strong className="text-slate-900">{currentLeader.name}</strong> • {currentLeader.neighborhood || currentLeader.territory}</span>
                ) : (
                  <span>Operação de Rua • {organization?.name || 'NEXUS'}</span>
                )}
              </div>
            </div>
          </div>

          <Badge variant="success" size="sm">
            Online
          </Badge>
        </div>

        {/* 4 Real-time Goal Bars requested by User: Apoiador, Carros, Casas, Presença */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* 1. Meta Apoiadores */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight flex items-center gap-1">
              <Users className="w-3 h-3 text-slate-600" /> Apoiadores
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-mono text-base font-bold text-slate-900">{contactsReached}</span>
              <span className="text-[10px] text-slate-500 font-medium">/ {contactsGoal}</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${contactsPercent}%` }} />
            </div>
            <div className="text-[10px] font-bold text-emerald-700 mt-1">{contactsPercent}%</div>
          </div>

          {/* 2. Carros Adesivados */}
          <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
            <div className="text-[10px] font-semibold text-emerald-800 uppercase tracking-tight flex items-center gap-1">
              <Car className="w-3 h-3 text-emerald-600" /> Carros
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-mono text-base font-bold text-emerald-950">{carsReached}</span>
              <span className="text-[10px] text-emerald-700 font-medium">/ {carsGoal}</span>
            </div>
            <div className="w-full bg-emerald-200 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div className="h-full bg-emerald-600 rounded-full transition-all duration-500" style={{ width: `${carsPercent}%` }} />
            </div>
            <div className="text-[10px] font-bold text-emerald-800 mt-1">{carsPercent}%</div>
          </div>

          {/* 3. Casas Adesivadas */}
          <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200">
            <div className="text-[10px] font-semibold text-amber-800 uppercase tracking-tight flex items-center gap-1">
              <Home className="w-3 h-3 text-amber-600" /> Casas
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-mono text-base font-bold text-amber-950">{housesReached}</span>
              <span className="text-[10px] text-amber-700 font-medium">/ {housesGoal}</span>
            </div>
            <div className="w-full bg-amber-200 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div className="h-full bg-amber-600 rounded-full transition-all duration-500" style={{ width: `${housesPercent}%` }} />
            </div>
            <div className="text-[10px] font-bold text-amber-800 mt-1">{housesPercent}%</div>
          </div>

          {/* 4. Presença em Eventos */}
          <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-200">
            <div className="text-[10px] font-semibold text-indigo-800 uppercase tracking-tight flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-indigo-600" /> Presença
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-mono text-base font-bold text-indigo-950">{presenceReached}</span>
              <span className="text-[10px] text-indigo-700 font-medium">/ {presenceGoal}</span>
            </div>
            <div className="w-full bg-indigo-200 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div className="h-full bg-indigo-600 rounded-full transition-all duration-500" style={{ width: `${presencePercent}%` }} />
            </div>
            <div className="text-[10px] font-bold text-indigo-800 mt-1">{presencePercent}%</div>
          </div>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('contact')}
          className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'contact'
              ? 'bg-white text-slate-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
          <span>+ Apoiador</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cars')}
          className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'cars'
              ? 'bg-white text-slate-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Car className="w-3.5 h-3.5 text-emerald-600" />
          <span>+ Carro</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('houses')}
          className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'houses'
              ? 'bg-white text-slate-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Home className="w-3.5 h-3.5 text-amber-600" />
          <span>+ Casa</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('presence')}
          className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'presence'
              ? 'bg-white text-slate-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
          <span>Check-in</span>
        </button>
      </div>

      {/* Tab 1: Fast Contact Form */}
      {activeTab === 'contact' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              Cadastro Rápido de Apoiador
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Coleta expressa durante corpo a corpo, feiras, caminhadas e reuniões.
            </p>
          </div>

          <form onSubmit={handleSaveContact} className="space-y-3.5">
            <Input
              label="Nome do Apoiador / Eleitor"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Ex.: Marcos Silva"
              required
              autoFocus
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="WhatsApp / Telefone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="(11) 98888-8888"
                required
              />
              <Input
                label="Bairro / Local da Abordagem"
                value={contactNeighborhood}
                onChange={(e) => setContactNeighborhood(e.target.value)}
                placeholder="Ex.: Centro / Feira da Praça"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMultiplier}
                  onChange={(e) => setIsMultiplier(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <span className="font-semibold text-slate-900">Multiplicador</span>
                <span className="text-slate-500">— Líder de família, condomínio ou grupo</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={wantsSticker}
                  onChange={(e) => setWantsSticker(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <span className="font-semibold text-emerald-700">Autorizou Adesivo / Material</span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmittingContact}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
              leftIcon={<Check className="w-4 h-4 text-emerald-400" />}
            >
              Salvar Apoiador no Banco
            </Button>
          </form>
        </div>
      )}

      {/* Tab 2: Fast Car Sticker Form */}
      {activeTab === 'cars' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Car className="w-4 h-4 text-emerald-600" />
              Adesivaço & Carros Autorizados
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Registre veículos adesivados com foto de comprovação.
            </p>
          </div>

          <form onSubmit={handleSaveCar} className="space-y-3.5">
            <Input
              label="Nome do Dono / Condutor"
              value={carOwnerName}
              onChange={(e) => setCarOwnerName(e.target.value)}
              placeholder="Ex.: Roberto Almeida"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="WhatsApp / Telefone"
                value={carOwnerPhone}
                onChange={(e) => setCarOwnerPhone(e.target.value)}
                placeholder="(11) 97777-7777"
              />
              <Input
                label="Placa do Carro"
                value={carPlate}
                onChange={(e) => setCarPlate(e.target.value)}
                placeholder="ABC-1D23"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Modelo do Veículo"
                value={carModel}
                onChange={(e) => setCarModel(e.target.value)}
                placeholder="Ex.: Onix Prata"
              />
              <Input
                label="Ponto / Bairro de Adesivagem"
                value={carTerritory}
                onChange={(e) => setCarTerritory(e.target.value)}
                placeholder="Ex.: Comitê Central / Posto 5"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-slate-500" />
                <span>Foto de Comprovação da Adesivagem</span>
              </label>
              <FileUpload
                accept="image/*"
                maxSizeMB={8}
                onFileSelected={(file, dataUrl) => {
                  setCarPhoto(dataUrl);
                  setCarFileName(file.name);
                }}
                onFileRemoved={() => {
                  setCarPhoto(null);
                  setCarFileName(null);
                }}
                currentFileName={carFileName || undefined}
                helperText="Tire uma foto do vidro traseiro ou lateral adesivado."
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmittingCar}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              leftIcon={<Check className="w-4 h-4" />}
            >
              Registrar Carro Adesivado
            </Button>
          </form>
        </div>
      )}

      {/* Tab 3: Fast House Sticker Form */}
      {activeTab === 'houses' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Home className="w-4 h-4 text-amber-600" />
              Casas & Placas Residenciais
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Registre residências e fachadas com autorização de placa ou adesivo.
            </p>
          </div>

          <form onSubmit={handleSaveHouse} className="space-y-3.5">
            <Input
              label="Nome do Morador / Responsável"
              value={houseResidentName}
              onChange={(e) => setHouseResidentName(e.target.value)}
              placeholder="Ex.: Dona Neide"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="WhatsApp / Telefone"
                value={housePhone}
                onChange={(e) => setHousePhone(e.target.value)}
                placeholder="(11) 96666-6666"
              />
              <Input
                label="Bairro / Território"
                value={houseTerritory}
                onChange={(e) => setHouseTerritory(e.target.value)}
                placeholder="Ex.: Morro da Nova Cintra"
              />
            </div>

            <Input
              label="Endereço / Referência"
              value={houseAddress}
              onChange={(e) => setHouseAddress(e.target.value)}
              placeholder="Rua das Palmeiras, 142 (próximo à padaria)"
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-slate-500" />
                <span>Foto da Fachada / Portão com Placa ou Adesivo</span>
              </label>
              <FileUpload
                accept="image/*"
                maxSizeMB={8}
                onFileSelected={(file, dataUrl) => {
                  setHousePhoto(dataUrl);
                  setHouseFileName(file.name);
                }}
                onFileRemoved={() => {
                  setHousePhoto(null);
                  setHouseFileName(null);
                }}
                currentFileName={houseFileName || undefined}
                helperText="Envie a foto comprovando a afixação autorizada do material."
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmittingHouse}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
              leftIcon={<Check className="w-4 h-4" />}
            >
              Registrar Casa Adesivada
            </Button>
          </form>
        </div>
      )}

      {/* Tab 4: Fast Presence Check-in Form WITH UPLOAD BUTTON */}
      {activeTab === 'presence' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              Check-in de Presença Rápido
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Para reuniões, plenárias, caminhadas e comícios com upload de foto/lista.
            </p>
          </div>

          <form onSubmit={handleSavePresence} className="space-y-3.5">
            <Input
              label="Nome do Participante / Eleitor"
              value={presenceName}
              onChange={(e) => setPresenceName(e.target.value)}
              placeholder="Ex.: Anderson Vieira"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="WhatsApp / Telefone (opcional)"
                value={presencePhone}
                onChange={(e) => setPresencePhone(e.target.value)}
                placeholder="(11) 95555-5555"
              />
              <Input
                label="Evento / Ato / Reunião"
                value={activityName}
                onChange={(e) => setActivityName(e.target.value)}
                placeholder="Ex.: Plenária da Saúde / Comício"
              />
            </div>

            {/* Upload Button requested by User for Quick Presence Check-in */}
            <div className="space-y-1.5 p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-200">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-indigo-700" />
                  <span>Upload de Imagem: Foto do Participante ou Lista de Presença</span>
                </label>
                <span className="text-[10px] bg-indigo-200/80 text-indigo-900 font-semibold px-2 py-0.5 rounded">
                  Foto / Câmera
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Tire uma foto da pessoa no ato ou da folha de presença assinada para salvar como comprovante.
              </p>
              
              <FileUpload
                accept="image/*"
                maxSizeMB={10}
                onFileSelected={(file, dataUrl) => {
                  setPresencePhoto(dataUrl);
                  setPresenceFileName(file.name);
                }}
                onFileRemoved={() => {
                  setPresencePhoto(null);
                  setPresenceFileName(null);
                }}
                currentFileName={presenceFileName || undefined}
                helperText="Clique ou arraste a imagem do celular/computador."
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmittingPresence}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
              leftIcon={<Check className="w-4 h-4" />}
            >
              Confirmar Check-in de Presença
            </Button>
          </form>
        </div>
      )}

      {/* Image Zoom Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">{previewImage.title}</h4>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center max-h-[70vh]">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
