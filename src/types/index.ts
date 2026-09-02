export type UserRole = 'superadmin' | 'admin' | 'manager' | 'coordinator' | 'leader' | 'operator' | 'viewer';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  document?: string;
  plan: 'free' | 'starter' | 'professional' | 'premium' | 'enterprise';
  status: 'active' | 'trial' | 'suspended' | 'canceled';
  logo_url?: string;
  settings?: {
    primary_color?: string;
    timezone?: string;
    territory_type?: 'bairro' | 'municipio' | 'zona' | 'regiao';
  };
  created_at: string;
}

export interface Profile {
  id: string;
  organization_id: string;
  user_id?: string;
  full_name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status?: 'active' | 'pending' | 'inactive';
  avatar_url?: string;
  is_active?: boolean;
  created_at: string;
}

export type OrganizationMember = Profile;

export type AppModule = 
  | 'dashboard'
  | 'organizations'
  | 'users'
  | 'coordinators'
  | 'leaders'
  | 'crm'
  | 'goals'
  | 'events'
  | 'meetings'
  | 'field'
  | 'presence'
  | 'materials'
  | 'stickers'
  | 'intelligence'
  | 'reports'
  | 'settings';

export interface UserModulePermission {
  id: string;
  user_id: string;
  organization_id: string;
  module: AppModule | string;
  can_view: boolean;
  can_create?: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface Coordinator {
  id: string;
  organization_id: string;
  name: string;
  email?: string;
  phone?: string;
  territory: string;
  region?: string;
  status: 'active' | 'inactive';
  notes?: string;
  leaders_count?: number;
  created_at: string;
}

export interface Leader {
  id: string;
  organization_id: string;
  coordinator_id?: string;
  coordinator_name?: string;
  name: string;
  email?: string;
  phone?: string;
  territory: string;
  neighborhood?: string;
  goal_target: number;
  goal_reached: number;
  contacts_count?: number;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
}

export interface CrmContact {
  id: string;
  organization_id: string;
  leader_id?: string;
  leader_name?: string;
  coordinator_id?: string;
  full_name: string;
  email?: string;
  phone: string;
  territory: string;
  neighborhood?: string;
  status: 'lead' | 'contacted' | 'supporter' | 'multiplier' | 'unresponsive';
  tags?: string[];
  notes?: string;
  responsible?: string;
  created_at: string;
}

export interface Goal {
  id: string;
  organization_id: string;
  title: string;
  description?: string;
  category: 'contatos' | 'liderancas' | 'adesivos' | 'eventos' | 'presenca' | 'geral';
  target_value: number;
  current_value: number;
  unit: string;
  responsible_id?: string;
  responsible_name: string;
  start_date: string;
  end_date: string;
  status: 'in_progress' | 'completed' | 'delayed' | 'cancelled';
  created_at?: string;
}

export interface CampaignEvent {
  id: string;
  organization_id: string;
  title: string;
  description?: string;
  event_type: 'comicio' | 'caminhada' | 'carreata' | 'plenaria' | 'visita' | 'outro';
  date: string;
  time: string;
  location: string;
  territory?: string;
  responsible_id?: string;
  responsible_name?: string;
  expected_attendees: number;
  confirmed_attendees: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_at?: string;
}

export type OperationEvent = CampaignEvent;

export interface Meeting {
  id: string;
  organization_id: string;
  title: string;
  agenda?: string;
  date: string;
  time: string;
  location: string;
  responsible?: string;
  responsible_name?: string;
  attendees_count?: number;
  minutes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at?: string;
}

export interface FieldPresence {
  id: string;
  organization_id: string;
  activity_type?: 'evento' | 'reuniao' | 'acao_rua' | 'visita';
  reference_title?: string;
  reference_name?: string;
  date?: string;
  location?: string;
  leader_id?: string;
  leader_name?: string;
  attendee_name?: string;
  name?: string;
  attendee_phone?: string;
  phone?: string;
  attendee_territory?: string;
  confirmed_by?: string;
  status?: 'present' | 'justified' | 'absent';
  created_at: string;
}

export type PresenceLog = FieldPresence;

export interface MaterialInventory {
  id: string;
  organization_id: string;
  name?: string;
  item_name?: string;
  sku?: string;
  category: string;
  total_quantity?: number;
  distributed_quantity?: number;
  stock_quantity?: number;
  min_stock_alert?: number;
  min_quantity?: number;
  unit: string;
  location?: string;
  updated_at?: string;
  created_at?: string;
}

export type MaterialItem = MaterialInventory;

export interface MaterialDistribution {
  id: string;
  organization_id: string;
  material_id: string;
  material_name: string;
  recipient_name: string;
  recipient_type?: 'lideranca' | 'coordenador' | 'voluntario' | 'direto';
  territory?: string;
  quantity: number;
  distributed_at?: string;
  distributed_by?: string;
  status: 'delivered' | 'in_transit' | 'pending';
  notes?: string;
  created_at: string;
}

export interface CarSticker {
  id: string;
  organization_id: string;
  plate?: string;
  vehicle_plate?: string;
  owner_name: string;
  owner_phone?: string;
  phone?: string;
  vehicle_model?: string;
  photo_url?: string;
  attachment_name?: string;
  applied_at?: string;
  applied_by?: string;
  territory: string;
  status: 'applied' | 'removed' | 'scheduled';
  created_at?: string;
}

export interface HouseSticker {
  id: string;
  organization_id: string;
  address: string;
  resident_name: string;
  phone?: string;
  photo_url?: string;
  attachment_name?: string;
  neighborhood?: string;
  territory: string;
  applied_at?: string;
  applied_by?: string;
  status: 'applied' | 'removed' | 'scheduled';
  created_at?: string;
}

export interface PopularDemand {
  id: string;
  organization_id: string;
  title: string;
  category: string;
  territory: string;
  neighborhood?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  urgency?: 'baixa' | 'media' | 'alta' | 'critica';
  status: 'open' | 'under_review' | 'analyzing' | 'addressed' | 'resolved';
  reporter_name?: string;
  description?: string;
  created_at: string;
}

export type DemandItem = PopularDemand;

export interface PlanLimits {
  tier: 'free' | 'starter' | 'professional' | 'premium' | 'enterprise';
  name: string;
  priceMonth: number;
  maxUsers: number;
  maxContacts: number;
  maxLeaders: number;
  storageMb: number;
  features: string[];
}
