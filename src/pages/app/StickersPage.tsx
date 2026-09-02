import React, { useState } from 'react';
import { Tag, Plus, Car, Home, Phone, MapPin, Trash2, Edit2, CheckCircle2, Image as ImageIcon, Eye, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { localStore } from '../../lib/supabase';
import { CarSticker, HouseSticker } from '../../types';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';
import { FileUpload } from '../../components/ui/FileUpload';

export const StickersPage: React.FC = () => {
  const { organization } = useAuth();
  const { success, error: toastError } = useToast();
  const orgId = organization?.id || 'org-alpha';

  const [carStickers, setCarStickers] = useState<CarSticker[]>(() => localStore.getCarStickers(orgId));
  const [houseStickers, setHouseStickers] = useState<HouseSticker[]>(() => localStore.getHouseStickers(orgId));

  const [activeTab, setActiveTab] = useState<'cars' | 'houses'>('cars');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isCarModalOpen, setIsCarModalOpen] = useState(false);
  const [carForm, setCarForm] = useState({
    plate: '',
    vehicle_model: '',
    owner_name: '',
    owner_phone: '',
    territory: '',
    photo_url: '' as string | undefined,
    attachment_name: '' as string | undefined,
    status: 'applied' as CarSticker['status'],
  });

  const [isHouseModalOpen, setIsHouseModalOpen] = useState(false);
  const [houseForm, setHouseForm] = useState({
    resident_name: '',
    phone: '',
    address: '',
    territory: '',
    photo_url: '' as string | undefined,
    attachment_name: '' as string | undefined,
    status: 'applied' as HouseSticker['status'],
  });

  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const reloadData = () => {
    setCarStickers(localStore.getCarStickers(orgId));
    setHouseStickers(localStore.getHouseStickers(orgId));
  };

  const handleSaveCar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!carForm.owner_name.trim()) {
      toastError('Informe o nome do proprietário.');
      return;
    }

    localStore.saveCarSticker({
      id: 'cst_' + Math.random().toString(36).substring(2, 9),
      organization_id: orgId,
      plate: carForm.plate.trim().toUpperCase() || undefined,
      vehicle_model: carForm.vehicle_model.trim() || undefined,
      owner_name: carForm.owner_name.trim(),
      owner_phone: carForm.owner_phone.trim() || undefined,
      territory: carForm.territory.trim() || 'Geral',
      photo_url: carForm.photo_url || undefined,
      attachment_name: carForm.attachment_name || undefined,
      status: carForm.status,
      created_at: new Date().toISOString(),
    });

    reloadData();
    setIsCarModalOpen(false);
    success('Adesivo de veículo cadastrado com sucesso!');
  };

  const handleSaveHouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseForm.resident_name.trim()) {
      toastError('Informe o nome do morador ou responsável.');
      return;
    }

    try {
      const finalAddress = houseForm.address.trim() || houseForm.territory.trim() || 'Residência autorizada';
      const finalTerritory = houseForm.territory.trim() || 'Geral';

      localStore.saveHouseSticker({
        id: 'hst_' + Math.random().toString(36).substring(2, 9),
        organization_id: orgId,
        resident_name: houseForm.resident_name.trim(),
        phone: houseForm.phone.trim() || undefined,
        address: finalAddress,
        territory: finalTerritory,
        photo_url: houseForm.photo_url || undefined,
        attachment_name: houseForm.attachment_name || undefined,
        status: houseForm.status,
        created_at: new Date().toISOString(),
      });

      reloadData();
      setIsHouseModalOpen(false);
      success('Adesivo residencial cadastrado com sucesso!');
    } catch {
      toastError('Erro ao registrar casa. Tente novamente.');
    }
  };

  const handleDeleteCar = (id: string) => {
    if (window.confirm('Excluir este registro de adesivo?')) {
      localStore.deleteCarSticker(id);
      reloadData();
      success('Registro removido.');
    }
  };

  const handleDeleteHouse = (id: string) => {
    if (window.confirm('Excluir este registro residencial?')) {
      localStore.deleteHouseSticker(id);
      reloadData();
      success('Registro removido.');
    }
  };

  const filteredCars = carStickers.filter(c => 
    c.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.plate && c.plate.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.territory && c.territory.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredHouses = houseStickers.filter(h => 
    h.resident_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (h.territory && h.territory.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/60">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Tag className="w-5 h-5 text-zinc-400" />
            Adesivagem & Visibilidade
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Controle de veículos adesivados (placa, modelo, fotos) e autorizações residenciais
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setHouseForm({ resident_name: '', phone: '', address: '', territory: '', photo_url: undefined, attachment_name: undefined, status: 'applied' });
              setIsHouseModalOpen(true);
            }}
            leftIcon={<Home className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            Adesivar Casa
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setCarForm({ plate: '', vehicle_model: '', owner_name: '', owner_phone: '', territory: '', photo_url: undefined, attachment_name: undefined, status: 'applied' });
              setIsCarModalOpen(true);
            }}
            leftIcon={<Car className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            Adesivar Carro
          </Button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex gap-2 self-start sm:self-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('cars')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'cars' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Veículos ({carStickers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('houses')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'houses' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Residências ({houseStickers.length})</span>
          </button>
        </div>

        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por nome, placa, endereço..."
          className="w-full sm:w-80"
        />
      </div>

      {activeTab === 'cars' ? (
        filteredCars.length === 0 ? (
          <EmptyState
            icon={<Car className="w-6 h-6" />}
            title="Nenhum veículo registrado"
            description="Cadastre carros e motos adesivados em pit-stops ou ações de rua com foto comprovante."
            actionLabel="Adesivar Veículo"
            onAction={() => {
              setCarForm({ plate: '', vehicle_model: '', owner_name: '', owner_phone: '', territory: '', photo_url: undefined, attachment_name: undefined, status: 'applied' });
              setIsCarModalOpen(true);
            }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Foto</TableHead>
                <TableHead>Proprietário & Contato</TableHead>
                <TableHead>Placa & Modelo</TableHead>
                <TableHead>Território / Bairro</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCars.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    {c.photo_url ? (
                      <button
                        type="button"
                        onClick={() => setPreviewImage({ url: c.photo_url!, title: `${c.owner_name} - ${c.vehicle_model || c.plate || 'Carro'}` })}
                        className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800 relative group cursor-pointer"
                        title="Ver foto do veículo"
                      >
                        <img
                          src={c.photo_url}
                          alt="Foto"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="w-3.5 h-3.5 text-white" />
                        </div>
                      </button>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-500">
                        <Car className="w-4 h-4" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-zinc-100">{c.owner_name}</div>
                    {c.owner_phone && (
                      <div className="text-xs font-mono text-zinc-400 mt-0.5">{c.owner_phone}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {c.plate && (
                        <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-100 border border-zinc-700">
                          {c.plate}
                        </span>
                      )}
                      <span className="text-xs text-zinc-300">{c.vehicle_model || 'Veículo'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-zinc-300">{c.territory || 'Geral'}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.status === 'applied' ? 'success' : 'neutral'} size="sm">
                      {c.status === 'applied' ? 'Adesivado' : 'Solicitado'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => handleDeleteCar(c.id)}
                      title="Excluir"
                      className="p-1.5 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : (
        filteredHouses.length === 0 ? (
          <EmptyState
            icon={<Home className="w-6 h-6" />}
            title="Nenhuma residência registrada"
            description="Cadastre as casas e comércios que autorizaram a colocação de placas/adesivos."
            actionLabel="Adesivar Residência"
            onAction={() => {
              setHouseForm({ resident_name: '', phone: '', address: '', territory: '', photo_url: undefined, attachment_name: undefined, status: 'applied' });
              setIsHouseModalOpen(true);
            }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Foto</TableHead>
                <TableHead>Morador / Responsável</TableHead>
                <TableHead>Endereço Completo</TableHead>
                <TableHead>Território / Bairro</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHouses.map((h) => (
                <TableRow key={h.id}>
                  <TableCell>
                    {h.photo_url ? (
                      <button
                        type="button"
                        onClick={() => setPreviewImage({ url: h.photo_url!, title: `${h.resident_name} - ${h.address}` })}
                        className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800 relative group cursor-pointer"
                        title="Ver foto da fachada"
                      >
                        <img
                          src={h.photo_url}
                          alt="Foto"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="w-3.5 h-3.5 text-white" />
                        </div>
                      </button>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-amber-500/70">
                        <Home className="w-4 h-4" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-zinc-100">{h.resident_name}</div>
                    {h.phone && (
                      <div className="text-xs font-mono text-zinc-400 mt-0.5">{h.phone}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-200">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span>{h.address}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-zinc-300">{h.territory || 'Geral'}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={h.status === 'applied' ? 'success' : 'neutral'} size="sm">
                      {h.status === 'applied' ? 'Instalado' : 'Solicitado'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => handleDeleteHouse(h.id)}
                      title="Excluir"
                      className="p-1.5 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      )}

      {/* Car Modal */}
      <Modal
        isOpen={isCarModalOpen}
        onClose={() => setIsCarModalOpen(false)}
        title="Registrar Adesivo em Veículo"
        description="Controle de frotas e carros particulares com adesivo de campanha."
      >
        <form onSubmit={handleSaveCar} className="space-y-3.5 text-left">
          <Input
            label="Nome do Proprietário *"
            value={carForm.owner_name}
            onChange={(e) => setCarForm({ ...carForm, owner_name: e.target.value })}
            placeholder="Ex.: Marcos Aurélio"
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Placa do Carro"
              value={carForm.plate}
              onChange={(e) => setCarForm({ ...carForm, plate: e.target.value })}
              placeholder="BRA2E19"
            />
            <Input
              label="Modelo / Cor"
              value={carForm.vehicle_model}
              onChange={(e) => setCarForm({ ...carForm, vehicle_model: e.target.value })}
              placeholder="Corolla Branco"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Telefone / WhatsApp"
              value={carForm.owner_phone}
              onChange={(e) => setCarForm({ ...carForm, owner_phone: e.target.value })}
              placeholder="(11) 99999-9999"
            />
            <Input
              label="Bairro / Território"
              value={carForm.territory}
              onChange={(e) => setCarForm({ ...carForm, territory: e.target.value })}
              placeholder="Ex.: Gonzaga"
            />
          </div>

          {/* Photo / File Upload for Car Sticker */}
          <FileUpload
            label="Foto do Carro Adesivado (Opcional)"
            helperText="Tire uma foto ou anexe o comprovante (PNG/JPG até 10MB)"
            value={carForm.photo_url || null}
            fileName={carForm.attachment_name || null}
            onChange={(dataUrl, meta) => {
              setCarForm({
                ...carForm,
                photo_url: dataUrl || undefined,
                attachment_name: meta?.name || undefined,
              });
            }}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCarModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Salvar Veículo
            </Button>
          </div>
        </form>
      </Modal>

      {/* House Modal */}
      <Modal
        isOpen={isHouseModalOpen}
        onClose={() => setIsHouseModalOpen(false)}
        title="Registrar Adesivo Residencial / Fachada"
        description="Autorização de fixação de propaganda ou banner em residência."
      >
        <form onSubmit={handleSaveHouse} className="space-y-3.5 text-left">
          <Input
            label="Nome do Morador / Responsável *"
            value={houseForm.resident_name}
            onChange={(e) => setHouseForm({ ...houseForm, resident_name: e.target.value })}
            placeholder="Ex.: Dona Cecília"
            required
            autoFocus
          />

          <Input
            label="Endereço (Rua, Número ou Referência)"
            value={houseForm.address}
            onChange={(e) => setHouseForm({ ...houseForm, address: e.target.value })}
            placeholder="Ex.: Rua Euclides da Cunha, 85 - Casa 2"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Bairro / Território"
              value={houseForm.territory}
              onChange={(e) => setHouseForm({ ...houseForm, territory: e.target.value })}
              placeholder="Ex.: Pompeia"
            />
            <Input
              label="Telefone / WhatsApp"
              value={houseForm.phone}
              onChange={(e) => setHouseForm({ ...houseForm, phone: e.target.value })}
              placeholder="(11) 98888-0000"
            />
          </div>

          {/* Photo / File Upload for House Sticker */}
          <FileUpload
            label="Foto da Fachada / Residência (Opcional)"
            helperText="Tire foto da placa/adesivo instalado na residência"
            value={houseForm.photo_url || null}
            fileName={houseForm.attachment_name || null}
            onChange={(dataUrl, meta) => {
              setHouseForm({
                ...houseForm,
                photo_url: dataUrl || undefined,
                attachment_name: meta?.name || undefined,
              });
            }}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsHouseModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Salvar Residência
            </Button>
          </div>
        </form>
      </Modal>

      {/* Full Photo Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative max-w-xl w-full bg-zinc-900 rounded-2xl border border-zinc-700 overflow-hidden shadow-2xl">
            <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between text-zinc-100">
              <span className="text-xs font-semibold truncate pr-4">{previewImage.title}</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
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
