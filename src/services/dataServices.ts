import { supabase } from '../lib/supabase';
import { 
  Coordinator, 
  Leader, 
  CrmContact, 
  Goal, 
  CampaignEvent, 
  Meeting, 
  FieldPresence, 
  MaterialInventory, 
  MaterialDistribution, 
  CarSticker, 
  HouseSticker, 
  PopularDemand 
} from '../types';

// Coordinators Service
export const coordinatorsService = {
  async getAll(organizationId: string) {
    const { data, error } = await supabase
      .from('coordinators')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });
    return { data: (data as Coordinator[]) || [], error };
  },

  async create(coordinator: Partial<Coordinator>) {
    const { data, error } = await supabase
      .from('coordinators')
      .insert([coordinator])
      .select()
      .maybeSingle();
    return { data: data as Coordinator | null, error };
  },

  async update(id: string, updates: Partial<Coordinator>) {
    const { data, error } = await supabase
      .from('coordinators')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as Coordinator | null, error };
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('coordinators')
      .delete()
      .eq('id', id);
    return { error };
  }
};

// Leaders Service
export const leadersService = {
  async getAll(organizationId: string) {
    const { data, error } = await supabase
      .from('leaders')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });
    return { data: (data as Leader[]) || [], error };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('leaders')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return { data: data as Leader | null, error };
  },

  async create(leader: Partial<Leader>) {
    const { data, error } = await supabase
      .from('leaders')
      .insert([leader])
      .select()
      .maybeSingle();
    return { data: data as Leader | null, error };
  },

  async update(id: string, updates: Partial<Leader>) {
    const { data, error } = await supabase
      .from('leaders')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as Leader | null, error };
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('leaders')
      .delete()
      .eq('id', id);
    return { error };
  }
};

// CRM Contacts Service
export const crmService = {
  async getAll(organizationId: string) {
    const { data, error } = await supabase
      .from('crm_contacts')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    return { data: (data as CrmContact[]) || [], error };
  },

  async create(contact: Partial<CrmContact>) {
    const { data, error } = await supabase
      .from('crm_contacts')
      .insert([contact])
      .select()
      .maybeSingle();
    return { data: data as CrmContact | null, error };
  },

  async update(id: string, updates: Partial<CrmContact>) {
    const { data, error } = await supabase
      .from('crm_contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as CrmContact | null, error };
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('crm_contacts')
      .delete()
      .eq('id', id);
    return { error };
  }
};

// Goals Service
export const goalsService = {
  async getAll(organizationId: string) {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    return { data: (data as Goal[]) || [], error };
  },

  async create(goal: Partial<Goal>) {
    const { data, error } = await supabase
      .from('goals')
      .insert([goal])
      .select()
      .maybeSingle();
    return { data: data as Goal | null, error };
  },

  async update(id: string, updates: Partial<Goal>) {
    const { data, error } = await supabase
      .from('goals')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as Goal | null, error };
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id);
    return { error };
  }
};

// Events Service
export const eventsService = {
  async getAll(organizationId: string) {
    const { data, error } = await supabase
      .from('campaign_events')
      .select('*')
      .eq('organization_id', organizationId)
      .order('date', { ascending: true });
    return { data: (data as CampaignEvent[]) || [], error };
  },

  async create(event: Partial<CampaignEvent>) {
    const { data, error } = await supabase
      .from('campaign_events')
      .insert([event])
      .select()
      .maybeSingle();
    return { data: data as CampaignEvent | null, error };
  },

  async update(id: string, updates: Partial<CampaignEvent>) {
    const { data, error } = await supabase
      .from('campaign_events')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as CampaignEvent | null, error };
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('campaign_events')
      .delete()
      .eq('id', id);
    return { error };
  }
};

// Meetings Service
export const meetingsService = {
  async getAll(organizationId: string) {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('organization_id', organizationId)
      .order('date', { ascending: true });
    return { data: (data as Meeting[]) || [], error };
  },

  async create(meeting: Partial<Meeting>) {
    const { data, error } = await supabase
      .from('meetings')
      .insert([meeting])
      .select()
      .maybeSingle();
    return { data: data as Meeting | null, error };
  },

  async update(id: string, updates: Partial<Meeting>) {
    const { data, error } = await supabase
      .from('meetings')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as Meeting | null, error };
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id);
    return { error };
  }
};

// Field Presences Service
export const presenceService = {
  async getAll(organizationId: string) {
    const { data, error } = await supabase
      .from('field_presences')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    return { data: (data as FieldPresence[]) || [], error };
  },

  async getLogs(organizationId: string) {
    return this.getAll(organizationId);
  },

  async create(presence: Partial<FieldPresence>) {
    const { data, error } = await supabase
      .from('field_presences')
      .insert([presence])
      .select()
      .maybeSingle();
    return { data: data as FieldPresence | null, error };
  },

  async createLog(presence: Partial<FieldPresence>) {
    return this.create(presence);
  },

  async update(id: string, updates: Partial<FieldPresence>) {
    const { data, error } = await supabase
      .from('field_presences')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as FieldPresence | null, error };
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('field_presences')
      .delete()
      .eq('id', id);
    return { error };
  },

  async deleteLog(id: string) {
    return this.delete(id);
  }
};

// Materials & Distribution Service
export const materialsService = {
  async getInventory(organizationId: string) {
    const { data, error } = await supabase
      .from('materials_inventory')
      .select('*')
      .eq('organization_id', organizationId)
      .order('category', { ascending: true });
    return { data: (data as MaterialInventory[]) || [], error };
  },

  async getItems(organizationId: string) {
    return this.getInventory(organizationId);
  },

  async getDistributions(organizationId: string) {
    const { data, error } = await supabase
      .from('material_distributions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    return { data: (data as MaterialDistribution[]) || [], error };
  },

  async createItem(item: Partial<MaterialInventory>) {
    const { data, error } = await supabase
      .from('materials_inventory')
      .insert([item])
      .select()
      .maybeSingle();
    return { data: data as MaterialInventory | null, error };
  },

  async updateItem(id: string, updates: Partial<MaterialInventory>) {
    const { data, error } = await supabase
      .from('materials_inventory')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as MaterialInventory | null, error };
  },

  async createDistribution(dist: Partial<MaterialDistribution>) {
    const { data, error } = await supabase
      .from('material_distributions')
      .insert([dist])
      .select()
      .maybeSingle();
    return { data: data as MaterialDistribution | null, error };
  },

  async deleteItem(id: string) {
    const { error } = await supabase
      .from('materials_inventory')
      .delete()
      .eq('id', id);
    return { error };
  }
};

// Stickers Service (Cars and Houses)
export const stickersService = {
  async getCarStickers(organizationId: string) {
    const { data, error } = await supabase
      .from('car_stickers')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    return { data: (data as CarSticker[]) || [], error };
  },

  async createCarSticker(sticker: Partial<CarSticker>) {
    const { data, error } = await supabase
      .from('car_stickers')
      .insert([sticker])
      .select()
      .maybeSingle();
    return { data: data as CarSticker | null, error };
  },

  async updateCarSticker(id: string, updates: Partial<CarSticker>) {
    const { data, error } = await supabase
      .from('car_stickers')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as CarSticker | null, error };
  },

  async deleteCarSticker(id: string) {
    const { error } = await supabase
      .from('car_stickers')
      .delete()
      .eq('id', id);
    return { error };
  },

  async getHouseStickers(organizationId: string) {
    const { data, error } = await supabase
      .from('house_stickers')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    return { data: (data as HouseSticker[]) || [], error };
  },

  async createHouseSticker(sticker: Partial<HouseSticker>) {
    const { data, error } = await supabase
      .from('house_stickers')
      .insert([sticker])
      .select()
      .maybeSingle();
    return { data: data as HouseSticker | null, error };
  },

  async updateHouseSticker(id: string, updates: Partial<HouseSticker>) {
    const { data, error } = await supabase
      .from('house_stickers')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as HouseSticker | null, error };
  },

  async deleteHouseSticker(id: string) {
    const { error } = await supabase
      .from('house_stickers')
      .delete()
      .eq('id', id);
    return { error };
  }
};

// Intelligence / Demands Service
export const intelligenceService = {
  async getDemands(organizationId: string) {
    const { data, error } = await supabase
      .from('popular_demands')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    return { data: (data as PopularDemand[]) || [], error };
  },

  async createDemand(demand: Partial<PopularDemand>) {
    const { data, error } = await supabase
      .from('popular_demands')
      .insert([demand])
      .select()
      .maybeSingle();
    return { data: data as PopularDemand | null, error };
  },

  async updateDemand(id: string, updates: Partial<PopularDemand>) {
    const { data, error } = await supabase
      .from('popular_demands')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as PopularDemand | null, error };
  },

  async deleteDemand(id: string) {
    const { error } = await supabase
      .from('popular_demands')
      .delete()
      .eq('id', id);
    return { error };
  }
};

// Audit Logs Service
export const auditService = {
  async log(entry: {
    organization_id: string;
    user_id?: string;
    action: string;
    entity: string;
    entity_id?: string;
    details?: any;
  }) {
    try {
      await supabase.from('audit_logs').insert([entry]);
    } catch (err) {
      console.warn('[Audit] Erro ao registrar log de auditoria:', err);
    }
  }
};
