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
function mapCrmContactRow(row: any): CrmContact {
  const tags = Array.isArray(row.tags) ? row.tags : [];
  let status: CrmContact['status'] = 'supporter';
  if (tags.includes('multiplier')) status = 'multiplier';
  else if (tags.includes('lead')) status = 'lead';
  else if (tags.includes('contacted')) status = 'contacted';
  else if (tags.includes('volunteer')) status = 'volunteer';
  else if (tags.includes('undecided')) status = 'undecided';
  else if (tags.includes('unresponsive')) status = 'unresponsive';
  else if (tags.includes('hostile')) status = 'hostile';

  return {
    id: row.id,
    organization_id: row.organization_id,
    leader_id: row.leader_id || undefined,
    name: row.name || '',
    full_name: row.name || '',
    email: row.email || undefined,
    whatsapp: row.whatsapp || '',
    phone: row.whatsapp || '',
    city: row.city || '',
    territory: row.city || row.neighborhood || 'Geral',
    neighborhood: row.neighborhood || undefined,
    origin: row.origin || 'crm',
    tags,
    status,
    created_at: row.created_at,
  };
}

export const crmService = {
  async getAll(organizationId: string) {
    const { data, error } = await supabase
      .from('crm_contacts')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    return { data: ((data as any[]) || []).map(mapCrmContactRow), error };
  },

  async create(contact: Partial<CrmContact> & Record<string, any>) {
    // Filtra e mapeia EXCLUSIVAMENTE para as colunas físicas reais de crm_contacts:
    // [organization_id, leader_id, name, email, whatsapp, neighborhood, city, origin, tags]
    const dbPayload: Record<string, any> = {
      organization_id: contact.organization_id,
      name: (contact.name || contact.full_name || '').trim(),
    };

    if (contact.leader_id) dbPayload.leader_id = contact.leader_id;
    if (contact.email) dbPayload.email = contact.email.trim();
    if (contact.whatsapp || contact.phone) dbPayload.whatsapp = (contact.whatsapp || contact.phone).trim();
    if (contact.neighborhood) dbPayload.neighborhood = contact.neighborhood.trim();
    if (contact.city || contact.territory) dbPayload.city = (contact.city || contact.territory).trim();
    if (contact.origin) dbPayload.origin = contact.origin;
    if (contact.tags && Array.isArray(contact.tags)) dbPayload.tags = contact.tags;

    const { data, error } = await supabase
      .from('crm_contacts')
      .insert([dbPayload])
      .select()
      .maybeSingle();
    return { data: data ? mapCrmContactRow(data) : null, error };
  },

  async update(id: string, updates: Partial<CrmContact> & Record<string, any>) {
    // Filtra e mapeia EXCLUSIVAMENTE para as colunas físicas reais de crm_contacts
    const dbPayload: Record<string, any> = {};

    if (updates.organization_id !== undefined) dbPayload.organization_id = updates.organization_id;
    if (updates.leader_id !== undefined) dbPayload.leader_id = updates.leader_id || null;
    if (updates.name !== undefined || updates.full_name !== undefined) {
      dbPayload.name = (updates.name || updates.full_name || '').trim();
    }
    if (updates.email !== undefined) dbPayload.email = updates.email ? updates.email.trim() : null;
    if (updates.whatsapp !== undefined || updates.phone !== undefined) {
      const phoneVal = updates.whatsapp || updates.phone;
      dbPayload.whatsapp = phoneVal ? phoneVal.trim() : null;
    }
    if (updates.neighborhood !== undefined) {
      dbPayload.neighborhood = updates.neighborhood ? updates.neighborhood.trim() : null;
    }
    if (updates.city !== undefined || updates.territory !== undefined) {
      const cityVal = updates.city || updates.territory;
      dbPayload.city = cityVal ? cityVal.trim() : null;
    }
    if (updates.origin !== undefined) dbPayload.origin = updates.origin;
    if (updates.tags !== undefined) dbPayload.tags = updates.tags;

    const { data, error } = await supabase
      .from('crm_contacts')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data ? mapCrmContactRow(data) : null, error };
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
