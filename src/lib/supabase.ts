import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Organization, 
  Profile, 
  OrganizationMember,
  UserModulePermission, 
  Coordinator, 
  Leader, 
  CrmContact, 
  Goal, 
  CampaignEvent, 
  Meeting, 
  FieldPresence, 
  PresenceLog,
  MaterialInventory, 
  MaterialItem,
  MaterialDistribution, 
  CarSticker, 
  HouseSticker,
  PopularDemand,
  DemandItem
} from '../types';

// Load keys from Vite environment variables (or local override)
const envSupabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const envSupabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Local storage override keys so users/evaluators can test without rebuilding
const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('nexus_supabase_url') : null;
const storedAnonKey = typeof window !== 'undefined' ? localStorage.getItem('nexus_supabase_anon_key') : null;

export const supabaseUrl = storedUrl || envSupabaseUrl;
export const supabaseAnonKey = storedAnonKey || envSupabaseAnonKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') && 
  !supabaseUrl.includes('your-project')
);

// Create actual Supabase client if configured, otherwise create a placeholder
export const supabase: SupabaseClient = createClient(
  supabaseUrl && supabaseUrl.startsWith('http') ? supabaseUrl : 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// Clean state initialization (No fictional/mock data)
const initialOrganizations: Organization[] = [];
const initialMembers: OrganizationMember[] = [];
const initialCoordinators: Coordinator[] = [];
const initialLeaders: Leader[] = [];
const initialContacts: CrmContact[] = [];
const initialGoals: Goal[] = [];
const initialEvents: CampaignEvent[] = [];
const initialMeetings: Meeting[] = [];
const initialFieldPresences: FieldPresence[] = [];
const initialMaterials: MaterialInventory[] = [];
const initialDistributions: MaterialDistribution[] = [];
const initialCarStickers: CarSticker[] = [];
const initialHouseStickers: HouseSticker[] = [];
const initialDemands: PopularDemand[] = [];

// Automatic cleanup of old mock caches
if (typeof window !== 'undefined') {
  const CLEAN_KEY = 'nexus_clean_storage_v4';
  if (!localStorage.getItem(CLEAN_KEY)) {
    const keysToPurge = [
      'nexus_organizations',
      'nexus_members',
      'nexus_coordinators',
      'nexus_leaders',
      'nexus_crm_contacts',
      'nexus_goals',
      'nexus_campaign_events',
      'nexus_meetings',
      'nexus_field_presences',
      'nexus_materials_inventory',
      'nexus_material_distributions',
      'nexus_car_stickers',
      'nexus_house_stickers',
      'nexus_popular_demands',
    ];
    keysToPurge.forEach(k => localStorage.removeItem(k));
    localStorage.setItem(CLEAN_KEY, 'true');
  }
}

// Local state store with multi-tenant isolation and quota-safe fallback
class LocalMultiTenantStore {
  private memoryCache: Record<string, any[]> = {};

  private get<T>(key: string, defaultValue: T[]): T[] {
    if (typeof window === 'undefined') return [...defaultValue];
    if (this.memoryCache[key]) {
      return [...this.memoryCache[key]];
    }

    const data = localStorage.getItem(`nexus_${key}`);
    if (!data) {
      try {
        localStorage.setItem(`nexus_${key}`, JSON.stringify(defaultValue));
      } catch {
        // Ignore quota error on initialization
      }
      this.memoryCache[key] = [...defaultValue];
      return [...defaultValue];
    }
    try {
      const parsed = JSON.parse(data);
      this.memoryCache[key] = parsed;
      return parsed;
    } catch {
      this.memoryCache[key] = [...defaultValue];
      return [...defaultValue];
    }
  }

  private set<T>(key: string, value: T[]): void {
    this.memoryCache[key] = value;
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(`nexus_${key}`, JSON.stringify(value));
    } catch (err) {
      console.warn(`[LocalStore] Quota exceeded or storage error on '${key}', optimizing payloads...`, err);
      try {
        // If storage is full, sanitize older bulky image attachments
        const sanitized = value.map((item: any) => {
          if (item && typeof item === 'object' && item.photo_url && item.photo_url.length > 250000) {
            return { ...item, photo_url: undefined };
          }
          return item;
        });
        localStorage.setItem(`nexus_${key}`, JSON.stringify(sanitized));
      } catch (innerErr) {
        console.warn(`[LocalStore] Saved to in-memory store for session:`, innerErr);
      }
    }
  }

  getOrganizations(): Organization[] {
    return this.get<Organization>('organizations', initialOrganizations);
  }

  saveOrganization(org: Organization): void {
    const list = this.getOrganizations();
    const idx = list.findIndex(o => o.id === org.id);
    if (idx >= 0) {
      list[idx] = org;
    } else {
      list.push(org);
    }
    this.set('organizations', list);
  }

  getMembers(orgId: string): OrganizationMember[] {
    return this.get<OrganizationMember>('members', initialMembers).filter(m => m.organization_id === orgId);
  }

  saveMember(member: OrganizationMember): void {
    const list = this.get<OrganizationMember>('members', initialMembers);
    const idx = list.findIndex(m => m.id === member.id);
    if (idx >= 0) list[idx] = member;
    else list.unshift(member);
    this.set('members', list);
  }

  deleteMember(id: string): void {
    const list = this.get<OrganizationMember>('members', initialMembers).filter(m => m.id !== id);
    this.set('members', list);
  }

  getCoordinators(orgId: string): Coordinator[] {
    return this.get<Coordinator>('coordinators', initialCoordinators).filter(c => c.organization_id === orgId);
  }

  saveCoordinator(coord: Coordinator): void {
    const list = this.get<Coordinator>('coordinators', initialCoordinators);
    const idx = list.findIndex(c => c.id === coord.id);
    if (idx >= 0) list[idx] = coord;
    else list.unshift(coord);
    this.set('coordinators', list);
  }

  deleteCoordinator(id: string): void {
    const list = this.get<Coordinator>('coordinators', initialCoordinators).filter(c => c.id !== id);
    this.set('coordinators', list);
  }

  getLeaders(orgId: string): Leader[] {
    return this.get<Leader>('leaders', initialLeaders).filter(l => l.organization_id === orgId);
  }

  saveLeader(leader: Leader): void {
    const list = this.get<Leader>('leaders', initialLeaders);
    const idx = list.findIndex(l => l.id === leader.id);
    if (idx >= 0) list[idx] = leader;
    else list.unshift(leader);
    this.set('leaders', list);
  }

  deleteLeader(id: string): void {
    const list = this.get<Leader>('leaders', initialLeaders).filter(l => l.id !== id);
    this.set('leaders', list);
  }

  getContacts(orgId: string): CrmContact[] {
    return this.get<CrmContact>('crm_contacts', initialContacts).filter(c => c.organization_id === orgId);
  }

  saveContact(contact: CrmContact): void {
    const list = this.get<CrmContact>('crm_contacts', initialContacts);
    const idx = list.findIndex(c => c.id === contact.id);
    if (idx >= 0) list[idx] = contact;
    else list.unshift(contact);
    this.set('crm_contacts', list);
  }

  deleteContact(id: string): void {
    const list = this.get<CrmContact>('crm_contacts', initialContacts).filter(c => c.id !== id);
    this.set('crm_contacts', list);
  }

  getGoals(orgId: string): Goal[] {
    return this.get<Goal>('goals', initialGoals).filter(g => g.organization_id === orgId);
  }

  saveGoal(goal: Goal): void {
    const list = this.get<Goal>('goals', initialGoals);
    const idx = list.findIndex(g => g.id === goal.id);
    if (idx >= 0) list[idx] = goal;
    else list.unshift(goal);
    this.set('goals', list);
  }

  deleteGoal(id: string): void {
    const list = this.get<Goal>('goals', initialGoals).filter(g => g.id !== id);
    this.set('goals', list);
  }

  getEvents(orgId: string): CampaignEvent[] {
    return this.get<CampaignEvent>('campaign_events', initialEvents).filter(e => e.organization_id === orgId);
  }

  saveEvent(event: CampaignEvent): void {
    const list = this.get<CampaignEvent>('campaign_events', initialEvents);
    const idx = list.findIndex(e => e.id === event.id);
    if (idx >= 0) list[idx] = event;
    else list.unshift(event);
    this.set('campaign_events', list);
  }

  deleteEvent(id: string): void {
    const list = this.get<CampaignEvent>('campaign_events', initialEvents).filter(e => e.id !== id);
    this.set('campaign_events', list);
  }

  getMeetings(orgId: string): Meeting[] {
    return this.get<Meeting>('meetings', initialMeetings).filter(m => m.organization_id === orgId);
  }

  saveMeeting(meeting: Meeting): void {
    const list = this.get<Meeting>('meetings', initialMeetings);
    const idx = list.findIndex(m => m.id === meeting.id);
    if (idx >= 0) list[idx] = meeting;
    else list.unshift(meeting);
    this.set('meetings', list);
  }

  deleteMeeting(id: string): void {
    const list = this.get<Meeting>('meetings', initialMeetings).filter(m => m.id !== id);
    this.set('meetings', list);
  }

  getFieldPresences(orgId: string): FieldPresence[] {
    return this.get<FieldPresence>('field_presences', initialFieldPresences).filter(p => p.organization_id === orgId);
  }

  getPresenceLogs(orgId: string): FieldPresence[] {
    return this.getFieldPresences(orgId);
  }

  saveFieldPresence(presence: FieldPresence): void {
    const list = this.get<FieldPresence>('field_presences', initialFieldPresences);
    list.unshift(presence);
    this.set('field_presences', list);
  }

  savePresenceLog(presence: FieldPresence): void {
    this.saveFieldPresence(presence);
  }

  deletePresenceLog(id: string): void {
    const list = this.get<FieldPresence>('field_presences', initialFieldPresences).filter(p => p.id !== id);
    this.set('field_presences', list);
  }

  getMaterials(orgId: string): MaterialInventory[] {
    return this.get<MaterialInventory>('materials_inventory', initialMaterials).filter(m => m.organization_id === orgId);
  }

  saveMaterial(mat: MaterialInventory): void {
    const list = this.get<MaterialInventory>('materials_inventory', initialMaterials);
    const idx = list.findIndex(m => m.id === mat.id);
    if (idx >= 0) list[idx] = mat;
    else list.unshift(mat);
    this.set('materials_inventory', list);
  }

  getDistributions(orgId: string): MaterialDistribution[] {
    return this.get<MaterialDistribution>('material_distributions', initialDistributions).filter(d => d.organization_id === orgId);
  }

  getMaterialDistributions(orgId: string): MaterialDistribution[] {
    return this.getDistributions(orgId);
  }

  saveDistribution(dist: MaterialDistribution): void {
    const list = this.get<MaterialDistribution>('material_distributions', initialDistributions);
    list.unshift(dist);
    this.set('material_distributions', list);
  }

  saveMaterialDistribution(dist: MaterialDistribution): void {
    this.saveDistribution(dist);
  }

  getCarStickers(orgId: string): CarSticker[] {
    return this.get<CarSticker>('car_stickers', initialCarStickers).filter(s => s.organization_id === orgId);
  }

  saveCarSticker(sticker: CarSticker): void {
    const list = this.get<CarSticker>('car_stickers', initialCarStickers);
    const idx = list.findIndex(s => s.id === sticker.id);
    if (idx >= 0) list[idx] = sticker;
    else list.unshift(sticker);
    this.set('car_stickers', list);
  }

  deleteCarSticker(id: string): void {
    const list = this.get<CarSticker>('car_stickers', initialCarStickers).filter(s => s.id !== id);
    this.set('car_stickers', list);
  }

  getHouseStickers(orgId: string): HouseSticker[] {
    return this.get<HouseSticker>('house_stickers', initialHouseStickers).filter(s => s.organization_id === orgId);
  }

  saveHouseSticker(sticker: HouseSticker): void {
    const list = this.get<HouseSticker>('house_stickers', initialHouseStickers);
    const idx = list.findIndex(s => s.id === sticker.id);
    if (idx >= 0) list[idx] = sticker;
    else list.unshift(sticker);
    this.set('house_stickers', list);
  }

  deleteHouseSticker(id: string): void {
    const list = this.get<HouseSticker>('house_stickers', initialHouseStickers).filter(s => s.id !== id);
    this.set('house_stickers', list);
  }

  getDemands(orgId: string): PopularDemand[] {
    return this.get<PopularDemand>('popular_demands', initialDemands).filter(d => d.organization_id === orgId);
  }

  saveDemand(demand: PopularDemand): void {
    const list = this.get<PopularDemand>('popular_demands', initialDemands);
    const idx = list.findIndex(d => d.id === demand.id);
    if (idx >= 0) list[idx] = demand;
    else list.unshift(demand);
    this.set('popular_demands', list);
  }

  deleteDemand(id: string): void {
    const list = this.get<PopularDemand>('popular_demands', initialDemands).filter(d => d.id !== id);
    this.set('popular_demands', list);
  }
}

export const localStore = new LocalMultiTenantStore();
