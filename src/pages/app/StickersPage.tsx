import React, { useState, useEffect, useCallback } from 'react';
import { Tag, Plus, Car, Home, Phone, MapPin, Trash2, Edit2, CheckCircle2, Image as ImageIcon, Eye, X, Loader2, Camera } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { CarSticker, HouseSticker } from '../../types';
import { stickersService } from '../../services';
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
  const orgId = organization?.id || '';

  const [carStickers, setCarStickers] = useState<CarSticker[]>([]);
  const [houseStickers, setHouseStickers] = useState<HouseSticker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const [carsRes, housesRes] = await Promise.all([
        stickersService.getCarStickers(orgId),
        stickersService.getHouseStickers(orgId),
      ]);
      setCarStickers(carsRes.data || []);
      setHouseStickers(housesRes.data || []);
    } catch (err: any) {
      toastError('Erro ao carregar adesivagens: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, toastError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carForm.owner_name.trim()) {
      toastError('Informe o nome do proprietário.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await stickersService.createCarSticker({
        organization_id: orgId,
        plate: carForm.plate.trim().toUpperCase() || undefined,
        vehicle_model: carForm.vehicle_model.trim() || undefined,
        owner_name: carForm.owner_name.trim(),
        owner_phone: carForm.owner_phone.trim() || undefined,
        territory: carForm.territory.trim() || 'Geral',
        photo_url: carForm.photo_url || undefined,
        attachment_name: carForm.attachment_name || undefined,
        status: carForm.status,
      });

      if (error) {
        toastError('Erro ao cadastrar adesivo de carro: ' + error.message);
      } else {
        await loadData();
        setIsCarModalOpen(false);
        success('Adesivo de veículo cadastrado com sucesso no Supabase!');
      }
    } catch (err: any) {
      toastError('Erro inesperado: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseForm.resident_name.trim()) {
      toastError('Informe o nome do morador ou responsável.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalAddress = houseForm.address.trim() || houseForm.territory.trim() || 'Residência autorizada';
      const finalTerritory = houseForm.territory.trim() || 'Geral';

      const { error } = await stickersService.createHouseSticker({
        organization_id: orgId,
        resident_name: houseForm.resident_name.trim(),
        phone: houseForm.phone.trim() || undefined,
        address: finalAddress,
        territory: finalTerritory,
        photo_url: houseForm.photo_url || undefined,
        attachment_name: houseForm.attachment_name || undefined,
        status: houseForm.status,
      });

      if (error) {
        toastError('Erro ao cadastrar casa: ' + error.message);
      } else {
        await loadData();
        setIsHouseModalOpen(false);
        success('Casa / Placa residencial cadastrada com sucesso!');
      }
    } catch (err: any) {
      toastError('Erro ao registrar casa: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCar = async (id: string) => {
    if (window.confirm('Excluir este registro de carro adesivado?')) {
      const { error } = await stickersService.deleteCarSticker(id);
      if (error) {
        toastError('Erro ao remover: ' + error.message);
      } else {
        await loadData();
        success('Registro de veículo excluído.');
      }
    }
  };

  const handleDeleteHouse = async (id: string) => {
    if (window.confirm('Excluir este registro de casa adesivada?')) {
      const { error } = await stickersService.deleteHouseSticker(id);
      if (error) {
        toastError('Erro ao remover: ' + error.message);
      } else {
        await loadData();
        success('Registro residencial excluído.');
      }
    }
  };

  const filteredCars = carStickers.filter(c => 
    c.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.plate && c.plate.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.owner_phone && c.owner_phone.includes(searchTerm)) ||
    (c.territory && c.territory.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredHouses = houseStickers.filter(h =>
    h.resident_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (h.phone && h.phone.includes(searchTerm)) ||
    (h.address && h.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (h.territory && h.territory.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-slate-700" />
            Controle de Adesivagens (Carros & Casas)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro com foto de veículos perfurados/adesivados e residências autorizadas
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'cars' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setCarForm({
                  plate: '',
                  vehicle_model: '',
                  owner_name: '',
                  owner_phone: '',
                  territory: '',
                  photo_url: undefined,
                  attachment_name: undefined,
                  status: 'applied',
                });
                setIsCarModalOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
              className="text-xs"
            >
              Novo Carro Adesivado
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setHouseForm({
                  resident_name: '',
                  phone: '',
                  address: '',
                  territory: '',
                  photo_url: undefined,
                  attachment_name: undefined,
                  status: 'applied',
                });
                setIsHouseModalOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
              className="text-xs"
            >
              Nova Casa Adesivada
            </Button>
          )}
        </div>
      </div>

      {/* Navigation tabs & search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('cars')}
            className={`flex-1 sm:flex-initial py-1.5 px-4 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'cars'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Car className="w-4 h-4 text-emerald-600" />
            <span>Carros Adesivados ({carStickers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('houses')}
            className={`flex-1 sm:flex-initial py-1.5 px-4 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'houses'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Home className="w-4 h-4 text-amber-600" />
            <span>Casas & Placas ({houseStickers.length})</span>
          </button>
        </div>

        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar placa, morador, endereço ou telefone..."
          className="w-full sm:w-80"
        />
      </div>

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-slate-600" />
          <span className="text-xs font-medium">Carregando adesivagens do Supabase...</span>
        </div>
      ) : activeTab === 'cars' ? (
        filteredCars.length === 0 ? (
          <EmptyState
            icon={<Car className="w-6 h-6" />}
            title="Nenhum veículo registrado"
            description="Cadastre carros e motos adesivados com comprovante fotográfico."
            actionLabel="Adicionar Carro"
            onAction={() => setIsCarModalOpen(true)}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proprietário & Contato</TableHead>
                <TableHead>Veículo & Placa</TableHead>
                <TableHead>Território / Ponto</TableHead>
                <TableHead>Foto Comprovante</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCars.map((car) => (
                <TableRow key={car.id}>
                  <TableCell>
                    <div className="font-medium text-slate-900">{car.owner_name}</div>
                    {car.owner_phone && <div className="text-xs font-mono text-slate-500 mt-0.5">{car.owner_phone}</div>}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-800">{car.vehicle_model || 'Veículo'}</div>
                    {car.plate && (
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 border border-slate-200 rounded mt-0.5 inline-block text-slate-700">
                        {car.plate}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{car.territory || 'Geral'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {car.photo_url ? (
                      <button
                        type="button"
                        onClick={() => setPreviewImage({ url: car.photo_url!, title: `Carro - ${car.owner_name}` })}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Ver Foto</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={car.status === 'applied' ? 'success' : 'neutral'} size="sm">
                      {car.status === 'applied' ? 'Adesivado' : car.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => handleDeleteCar(car.id)}
                      className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Excluir"
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
            title="Nenhuma casa registrada"
            description="Cadastre residências que autorizaram placas ou adesivos com foto."
            actionLabel="Adicionar Casa"
            onAction={() => setIsHouseModalOpen(true)}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Morador & Contato</TableHead>
                <TableHead>Endereço / Referência</TableHead>
                <TableHead>Bairro / Território</TableHead>
                <TableHead>Foto Fachada</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHouses.map((house) => (
                <TableRow key={house.id}>
                  <TableCell>
                    <div className="font-medium text-slate-900">{house.resident_name}</div>
                    {house.phone && <div className="text-xs font-mono text-slate-500 mt-0.5">{house.phone}</div>}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-slate-800">{house.address}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{house.territory || 'Geral'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {house.photo_url ? (
                      <button
                        type="button"
                        onClick={() => setPreviewImage({ url: house.photo_url!, title: `Casa - ${house.resident_name}` })}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium hover:bg-amber-100 transition-colors cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Ver Foto</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={house.status === 'applied' ? 'success' : 'neutral'} size="sm">
                      {house.status === 'applied' ? 'Afixado' : house.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => handleDeleteHouse(house.id)}
                      className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Excluir"
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
        title="Registrar Carro Adesivado"
        description="Salve os dados do veículo e anexe a foto de comprovação."
      >
        <form onSubmit={handleSaveCar} className="space-y-3.5 text-left">
          <Input
            label="Nome do Proprietário / Condutor"
            value={carForm.owner_name}
            onChange={(e) => setCarForm({ ...carForm, owner_name: e.target.value })}
            placeholder="Ex.: Valmir Silva"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Telefone / WhatsApp"
              value={carForm.owner_phone}
              onChange={(e) => setCarForm({ ...carForm, owner_phone: e.target.value })}
              placeholder="(11) 98888-8888"
            />
            <Input
              label="Placa do Veículo"
              value={carForm.plate}
              onChange={(e) => setCarForm({ ...carForm, plate: e.target.value })}
              placeholder="ABC-1234"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Modelo do Veículo"
              value={carForm.vehicle_model}
              onChange={(e) => setCarForm({ ...carForm, vehicle_model: e.target.value })}
              placeholder="Ex.: Onix / Prisma"
            />
            <Input
              label="Ponto de Adesivagem / Bairro"
              value={carForm.territory}
              onChange={(e) => setCarForm({ ...carForm, territory: e.target.value })}
              placeholder="Ex.: Comitê Central"
            />
          </div>

          <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-emerald-600" />
              <span>Foto do Veículo Adesivado</span>
            </label>
            <FileUpload
              accept="image/*"
              maxSizeMB={8}
              onFileSelected={(file, dataUrl) => {
                setCarForm(prev => ({
                  ...prev,
                  photo_url: dataUrl,
                  attachment_name: file.name,
                }));
              }}
              onFileRemoved={() => {
                setCarForm(prev => ({
                  ...prev,
                  photo_url: undefined,
                  attachment_name: undefined,
                }));
              }}
              currentFileName={carForm.attachment_name || undefined}
              helperText="Foto nítida da traseira ou lateral adesivada."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCarModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Salvar Veículo
            </Button>
          </div>
        </form>
      </Modal>

      {/* House Modal */}
      <Modal
        isOpen={isHouseModalOpen}
        onClose={() => setIsHouseModalOpen(false)}
        title="Registrar Casa / Placa Residencial"
        description="Salve os dados do morador e anexe a foto da fachada."
      >
        <form onSubmit={handleSaveHouse} className="space-y-3.5 text-left">
          <Input
            label="Nome do Morador / Responsável"
            value={houseForm.resident_name}
            onChange={(e) => setHouseForm({ ...houseForm, resident_name: e.target.value })}
            placeholder="Ex.: Dona Irene"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Telefone / WhatsApp"
              value={houseForm.phone}
              onChange={(e) => setHouseForm({ ...houseForm, phone: e.target.value })}
              placeholder="(11) 97777-7777"
            />
            <Input
              label="Bairro / Território"
              value={houseForm.territory}
              onChange={(e) => setHouseForm({ ...houseForm, territory: e.target.value })}
              placeholder="Ex.: Gonzaga / Macuco"
            />
          </div>

          <Input
            label="Endereço / Referência da Residência"
            value={houseForm.address}
            onChange={(e) => setHouseForm({ ...houseForm, address: e.target.value })}
            placeholder="Rua das Flores, 88 (em frente ao mercado)"
            required
          />

          <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-amber-600" />
              <span>Foto da Fachada com a Placa / Adesivo</span>
            </label>
            <FileUpload
              accept="image/*"
              maxSizeMB={8}
              onFileSelected={(file, dataUrl) => {
                setHouseForm(prev => ({
                  ...prev,
                  photo_url: dataUrl,
                  attachment_name: file.name,
                }));
              }}
              onFileRemoved={() => {
                setHouseForm(prev => ({
                  ...prev,
                  photo_url: undefined,
                  attachment_name: undefined,
                }));
              }}
              currentFileName={houseForm.attachment_name || undefined}
              helperText="Foto do portão ou muro com autorização visível."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsHouseModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Salvar Casa
            </Button>
          </div>
        </form>
      </Modal>

      {/* Image Preview Modal */}
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
