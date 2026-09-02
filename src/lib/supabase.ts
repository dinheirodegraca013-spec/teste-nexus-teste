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

// Initial Mock Multi-Tenant Seed for Sandbox / Demo Experience
const initialOrganizations: Organization[] = [
  {
    id: 'org-alpha',
    name: 'Campanha Central — Litoral',
    slug: 'campanha-central',
    document: '45.123.789/0001-90',
    plan: 'professional',
    status: 'active',
    settings: {
      primary_color: '#09090b',
      timezone: 'America/Sao_Paulo',
      territory_type: 'bairro',
    },
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'org-beta',
    name: 'Diretório Regional Norte',
    slug: 'diretorio-norte',
    document: '12.345.678/0001-12',
    plan: 'starter',
    status: 'active',
    settings: {
      primary_color: '#18181b',
      timezone: 'America/Sao_Paulo',
      territory_type: 'regiao',
    },
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  }
];

const initialMembers: OrganizationMember[] = [
  {
    id: 'mem-1',
    user_id: 'usr-1',
    organization_id: 'org-alpha',
    full_name: 'Dr. Roberto Lins (Administrador)',
    email: 'admin@nexus.com.br',
    role: 'admin',
    status: 'active',
    created_at: '2026-08-01T10:00:00Z',
  },
  {
    id: 'mem-2',
    user_id: 'usr-2',
    organization_id: 'org-alpha',
    full_name: 'Ana Carolina Mendes',
    email: 'ana.mendes@nexus.com.br',
    role: 'manager',
    status: 'active',
    created_at: '2026-08-03T11:00:00Z',
  },
  {
    id: 'mem-3',
    user_id: 'usr-3',
    organization_id: 'org-alpha',
    full_name: 'João Pedro Silveira',
    email: 'joao.campo@nexus.com.br',
    role: 'operator',
    status: 'active',
    created_at: '2026-08-10T14:30:00Z',
  },
];

const initialCoordinators: Coordinator[] = [
  {
    id: 'coord-1',
    organization_id: 'org-alpha',
    name: 'Carlos Alberto Mendonça',
    email: 'carlos.mendonca@nexus.com.br',
    phone: '(13) 99712-4455',
    territory: 'Zona Leste / Gonzaga',
    region: 'Região Central',
    status: 'active',
    notes: 'Coordena 14 lideranças ativas na orla.',
    leaders_count: 5,
    created_at: '2026-08-01T10:00:00Z',
  },
  {
    id: 'coord-2',
    organization_id: 'org-alpha',
    name: 'Dra. Mariana Vasconcelos',
    email: 'mariana.vasconcelos@nexus.com.br',
    phone: '(13) 98831-9090',
    territory: 'Zona Noroeste / Areia Branca',
    region: 'Zona Noroeste',
    status: 'active',
    notes: 'Forte atuação com lideranças comunitárias.',
    leaders_count: 8,
    created_at: '2026-08-05T14:30:00Z',
  },
  {
    id: 'coord-3',
    organization_id: 'org-alpha',
    name: 'Roberto Silveira',
    email: 'roberto.silveira@nexus.com.br',
    phone: '(13) 99122-3344',
    territory: 'Morros / Nova Cintra',
    region: 'Morros',
    status: 'active',
    notes: 'Articulação direta com associações de moradores.',
    leaders_count: 4,
    created_at: '2026-08-10T09:15:00Z',
  }
];

const initialLeaders: Leader[] = [
  {
    id: 'lead-1',
    organization_id: 'org-alpha',
    coordinator_id: 'coord-1',
    coordinator_name: 'Carlos Alberto Mendonça',
    name: 'Fabiana Rios',
    email: 'fabiana.rios@gmail.com',
    phone: '(13) 98144-5566',
    territory: 'Gonzaga',
    neighborhood: 'Gonzaga',
    goal_target: 300,
    goal_reached: 245,
    contacts_count: 245,
    status: 'active',
    created_at: '2026-08-02T11:00:00Z',
  },
  {
    id: 'lead-2',
    organization_id: 'org-alpha',
    coordinator_id: 'coord-1',
    coordinator_name: 'Carlos Alberto Mendonça',
    name: 'Jorge Tadeu',
    email: 'jorge.tadeu@gmail.com',
    phone: '(13) 99655-1122',
    territory: 'Embaré',
    neighborhood: 'Embaré',
    goal_target: 250,
    goal_reached: 198,
    contacts_count: 198,
    status: 'active',
    created_at: '2026-08-04T16:20:00Z',
  },
  {
    id: 'lead-3',
    organization_id: 'org-alpha',
    coordinator_id: 'coord-2',
    coordinator_name: 'Dra. Mariana Vasconcelos',
    name: 'Pastor Marcos Vinicius',
    email: 'marcos.vinicius@gmail.com',
    phone: '(13) 98711-2299',
    territory: 'Areia Branca',
    neighborhood: 'Areia Branca',
    goal_target: 500,
    goal_reached: 420,
    contacts_count: 420,
    status: 'active',
    created_at: '2026-08-06T08:40:00Z',
  },
  {
    id: 'lead-4',
    organization_id: 'org-alpha',
    coordinator_id: 'coord-2',
    coordinator_name: 'Dra. Mariana Vasconcelos',
    name: 'Luciana Queiroz',
    email: 'luciana.queiroz@hotmail.com',
    phone: '(13) 99188-7744',
    territory: 'Castelo',
    neighborhood: 'Castelo',
    goal_target: 200,
    goal_reached: 160,
    contacts_count: 160,
    status: 'active',
    created_at: '2026-08-07T13:10:00Z',
  },
  {
    id: 'lead-5',
    organization_id: 'org-alpha',
    coordinator_id: 'coord-3',
    coordinator_name: 'Roberto Silveira',
    name: 'Valdir Santos (Seu Valdir)',
    email: 'valdir.santos@gmail.com',
    phone: '(13) 98822-6633',
    territory: 'Nova Cintra',
    neighborhood: 'Nova Cintra',
    goal_target: 350,
    goal_reached: 280,
    contacts_count: 280,
    status: 'active',
    created_at: '2026-08-11T15:00:00Z',
  }
];

const initialContacts: CrmContact[] = [
  {
    id: 'crm-1',
    organization_id: 'org-alpha',
    leader_id: 'lead-1',
    leader_name: 'Fabiana Rios',
    coordinator_id: 'coord-1',
    full_name: 'André Guimarães Prado',
    email: 'andre.prado@empresa.com.br',
    phone: '(13) 99761-0021',
    territory: 'Gonzaga',
    neighborhood: 'Gonzaga',
    status: 'multiplier',
    tags: ['comércio', 'voluntário', 'evento'],
    notes: 'Disponível para colocar adesivo microperfurado no veículo e organizar reunião no condomínio.',
    responsible: 'Fabiana Rios',
    created_at: '2026-08-15T10:20:00Z',
  },
  {
    id: 'crm-2',
    organization_id: 'org-alpha',
    leader_id: 'lead-1',
    leader_name: 'Fabiana Rios',
    coordinator_id: 'coord-1',
    full_name: 'Beatriz Vasques',
    email: 'beatriz.vasques@uol.com.br',
    phone: '(13) 98842-1928',
    territory: 'Gonzaga',
    neighborhood: 'Gonzaga',
    status: 'supporter',
    tags: ['saúde', 'adesivo-casa'],
    notes: 'Apoiadora confirmada. Recebeu material informativo.',
    responsible: 'Fabiana Rios',
    created_at: '2026-08-16T11:45:00Z',
  },
  {
    id: 'crm-3',
    organization_id: 'org-alpha',
    leader_id: 'lead-3',
    leader_name: 'Pastor Marcos Vinicius',
    coordinator_id: 'coord-2',
    full_name: 'Cláudio Ferreira Lima',
    email: 'claudio.lima@gmail.com',
    phone: '(13) 99133-7722',
    territory: 'Areia Branca',
    neighborhood: 'Areia Branca',
    status: 'multiplier',
    tags: ['liderança-jovem', 'adesivo-carro'],
    notes: 'Mobilizou 30 jovens para a plenária de sábado.',
    responsible: 'Pastor Marcos',
    created_at: '2026-08-18T14:10:00Z',
  },
  {
    id: 'crm-4',
    organization_id: 'org-alpha',
    leader_id: 'lead-2',
    leader_name: 'Jorge Tadeu',
    coordinator_id: 'coord-1',
    full_name: 'Daniela Alvarenga',
    email: 'daniela.alva@gmail.com',
    phone: '(13) 98155-9988',
    territory: 'Embaré',
    neighborhood: 'Embaré',
    status: 'contacted',
    tags: ['educação'],
    notes: 'Pediu para entrar em contato após a reunião de pais.',
    responsible: 'Jorge Tadeu',
    created_at: '2026-08-20T09:30:00Z',
  },
  {
    id: 'crm-5',
    organization_id: 'org-alpha',
    leader_id: 'lead-5',
    leader_name: 'Valdir Santos',
    coordinator_id: 'coord-3',
    full_name: 'Edson Moreira de Souza',
    phone: '(13) 99611-4477',
    territory: 'Nova Cintra',
    neighborhood: 'Nova Cintra',
    status: 'supporter',
    tags: ['morros', 'comunidade'],
    notes: 'Aceitou receber placa residencial na fachada.',
    responsible: 'Seu Valdir',
    created_at: '2026-08-22T16:00:00Z',
  }
];

const initialGoals: Goal[] = [
  {
    id: 'goal-1',
    organization_id: 'org-alpha',
    title: 'Cadastro de Contatos Qualificados',
    category: 'contatos',
    target_value: 15000,
    current_value: 12450,
    unit: 'contatos',
    responsible_name: 'Carlos Mendonça / Coordenação Geral',
    start_date: '2026-08-01',
    end_date: '2026-09-30',
    status: 'in_progress',
  },
  {
    id: 'goal-2',
    organization_id: 'org-alpha',
    title: 'Formação de Lideranças de Bairro',
    category: 'liderancas',
    target_value: 200,
    current_value: 187,
    unit: 'lideranças',
    responsible_name: 'Dra. Mariana Vasconcelos',
    start_date: '2026-08-01',
    end_date: '2026-09-15',
    status: 'in_progress',
  },
  {
    id: 'goal-3',
    organization_id: 'org-alpha',
    title: 'Adesivagem de Veículos (Perfurados/Laterais)',
    category: 'adesivos',
    target_value: 2500,
    current_value: 1920,
    unit: 'carros',
    responsible_name: 'Equipe de Operações',
    start_date: '2026-08-10',
    end_date: '2026-09-25',
    status: 'in_progress',
  },
  {
    id: 'goal-4',
    organization_id: 'org-alpha',
    title: 'Placas e Adesivos Residenciais',
    category: 'adesivos',
    target_value: 1200,
    current_value: 840,
    unit: 'residências',
    responsible_name: 'Roberto Silveira',
    start_date: '2026-08-10',
    end_date: '2026-09-20',
    status: 'in_progress',
  },
  {
    id: 'goal-5',
    organization_id: 'org-alpha',
    title: 'Presença em Encontros e Plenárias',
    category: 'presenca',
    target_value: 5000,
    current_value: 4620,
    unit: 'presenças',
    responsible_name: 'Mobilização Geral',
    start_date: '2026-08-01',
    end_date: '2026-09-30',
    status: 'in_progress',
  }
];

const initialEvents: CampaignEvent[] = [
  {
    id: 'evt-1',
    organization_id: 'org-alpha',
    title: 'Plenária Geral com Lideranças Comunitárias',
    description: 'Apresentação das diretrizes e metas de mobilização para o próximo mês.',
    event_type: 'plenaria',
    date: '2026-09-05',
    time: '19:30',
    location: 'Auditório Costa Sul, Av. Ana Costa, 340 - Santos/SP',
    territory: 'Gonzaga',
    responsible_name: 'Carlos Mendonça',
    expected_attendees: 300,
    confirmed_attendees: 268,
    status: 'scheduled',
  },
  {
    id: 'evt-2',
    organization_id: 'org-alpha',
    title: 'Caminhada e Adesivaço na Orla',
    description: 'Ponto de encontro no canal 3 até a Praça das Bandeiras.',
    event_type: 'caminhada',
    date: '2026-09-08',
    time: '09:00',
    location: 'Av. Vicente de Carvalho com Av. Washington Luiz',
    territory: 'Gonzaga / Boqueirão',
    responsible_name: 'Fabiana Rios',
    expected_attendees: 500,
    confirmed_attendees: 410,
    status: 'scheduled',
  },
  {
    id: 'evt-3',
    organization_id: 'org-alpha',
    title: 'Encontro com Moradores da Zona Noroeste',
    description: 'Diálogo sobre demandas de infraestrutura e saúde básica.',
    event_type: 'visita',
    date: '2026-09-10',
    time: '18:00',
    location: 'Associação Comunitária de Areia Branca',
    territory: 'Areia Branca',
    responsible_name: 'Dra. Mariana Vasconcelos',
    expected_attendees: 150,
    confirmed_attendees: 135,
    status: 'scheduled',
  }
];

const initialMeetings: Meeting[] = [
  {
    id: 'meet-1',
    organization_id: 'org-alpha',
    title: 'Alinhamento Semanal de Coordenadores',
    agenda: '1. Revisão do percentual de metas por território; 2. Escala de material; 3. Checagem de adesivagem.',
    date: '2026-09-04',
    time: '14:00',
    location: 'Comitê Central / Sala de Reunião 1',
    responsible: 'Coordenação Geral',
    responsible_name: 'Coordenação Geral',
    attendees_count: 12,
    status: 'scheduled',
  },
  {
    id: 'meet-2',
    organization_id: 'org-alpha',
    title: 'Reunião com Lideranças do Comércio e Serviços',
    agenda: 'Apresentação das propostas para fomento econômico e desburocratização.',
    date: '2026-09-07',
    time: '20:00',
    location: 'Sindicato do Comércio Varejista',
    responsible: 'Fabiana Rios',
    responsible_name: 'Fabiana Rios',
    attendees_count: 35,
    status: 'scheduled',
  }
];

const initialFieldPresences: FieldPresence[] = [
  {
    id: 'pres-1',
    organization_id: 'org-alpha',
    activity_type: 'acao_rua',
    reference_title: 'Adesivaço Praça da Independência',
    reference_name: 'Adesivaço Praça da Independência',
    date: '2026-08-28',
    location: 'Praça da Independência, Gonzaga',
    leader_name: 'Fabiana Rios',
    attendee_name: 'Renato Silva Bueno',
    name: 'Renato Silva Bueno',
    attendee_phone: '(13) 99122-8811',
    phone: '(13) 99122-8811',
    attendee_territory: 'Gonzaga',
    confirmed_by: 'Operador de Campo 01',
    status: 'present',
    created_at: '2026-08-28T11:20:00Z',
  },
  {
    id: 'pres-2',
    organization_id: 'org-alpha',
    activity_type: 'reuniao',
    reference_title: 'Reunião Núcleo Noroeste',
    reference_name: 'Reunião Núcleo Noroeste',
    date: '2026-08-29',
    location: 'Castelo',
    leader_name: 'Luciana Queiroz',
    attendee_name: 'Maria Helena Cardoso',
    name: 'Maria Helena Cardoso',
    attendee_phone: '(13) 98833-2211',
    phone: '(13) 98833-2211',
    attendee_territory: 'Castelo',
    confirmed_by: 'Luciana Queiroz',
    status: 'present',
    created_at: '2026-08-29T19:40:00Z',
  }
];

const initialMaterials: MaterialInventory[] = [
  {
    id: 'mat-1',
    organization_id: 'org-alpha',
    name: 'Adesivo Microperfurado Traseiro',
    item_name: 'Adesivo Microperfurado Traseiro',
    sku: 'ADS-PERF-01',
    category: 'Adesivo',
    total_quantity: 2500,
    distributed_quantity: 1920,
    stock_quantity: 420,
    min_stock_alert: 200,
    min_quantity: 200,
    unit: 'unid',
    location: 'Depósito Central - Gaveta A',
    updated_at: '2026-08-30T10:00:00Z',
    created_at: '2026-08-01T10:00:00Z',
  },
  {
    id: 'mat-2',
    organization_id: 'org-alpha',
    name: 'Praguinha Redonda 5cm',
    item_name: 'Praguinha Redonda 5cm',
    sku: 'ADS-PRAG-02',
    category: 'Adesivo',
    total_quantity: 50000,
    distributed_quantity: 31500,
    stock_quantity: 18500,
    min_stock_alert: 5000,
    min_quantity: 5000,
    unit: 'unid',
    location: 'Depósito Central - Prateleira B1',
    updated_at: '2026-08-30T10:00:00Z',
    created_at: '2026-08-01T10:00:00Z',
  },
  {
    id: 'mat-3',
    organization_id: 'org-alpha',
    name: 'Folder Propostas 4 Dobras',
    item_name: 'Folder Propostas 4 Dobras',
    sku: 'MAT-FOLD-01',
    category: 'Gráfica',
    total_quantity: 100000,
    distributed_quantity: 65000,
    stock_quantity: 35000,
    min_stock_alert: 10000,
    min_quantity: 10000,
    unit: 'unid',
    location: 'Depósito Central - Pallet 2',
    updated_at: '2026-08-30T10:00:00Z',
    created_at: '2026-08-01T10:00:00Z',
  },
  {
    id: 'mat-4',
    organization_id: 'org-alpha',
    name: 'Placa Residencial Polionda 50x70',
    item_name: 'Placa Residencial Polionda 50x70',
    sku: 'PLC-RES-01',
    category: 'Adesivo',
    total_quantity: 1500,
    distributed_quantity: 1120,
    stock_quantity: 380,
    min_stock_alert: 150,
    min_quantity: 150,
    unit: 'unid',
    location: 'Depósito Central - Área C',
    updated_at: '2026-08-30T10:00:00Z',
    created_at: '2026-08-01T10:00:00Z',
  }
];

const initialDistributions: MaterialDistribution[] = [
  {
    id: 'dist-1',
    organization_id: 'org-alpha',
    material_id: 'mat-1',
    material_name: 'Adesivo Microperfurado Traseiro',
    recipient_name: 'Carlos Alberto Mendonça',
    recipient_type: 'coordenador',
    territory: 'Zona Leste / Gonzaga',
    quantity: 150,
    distributed_at: '2026-08-25T14:00:00Z',
    distributed_by: 'Almoxarifado Central',
    status: 'delivered',
    notes: 'Repasse para lideranças da orla.',
    created_at: '2026-08-25T14:00:00Z',
  },
  {
    id: 'dist-2',
    organization_id: 'org-alpha',
    material_id: 'mat-3',
    material_name: 'Folder Propostas 4 Dobras',
    recipient_name: 'Pastor Marcos Vinicius',
    recipient_type: 'lideranca',
    territory: 'Areia Branca',
    quantity: 5000,
    distributed_at: '2026-08-27T09:30:00Z',
    distributed_by: 'Almoxarifado Central',
    status: 'delivered',
    notes: 'Distribuição para caminhada no bairro.',
    created_at: '2026-08-27T09:30:00Z',
  }
];

const initialCarStickers: CarSticker[] = [
  {
    id: 'car-1',
    organization_id: 'org-alpha',
    plate: 'ABC-4E89',
    vehicle_plate: 'ABC-4E89',
    owner_name: 'André Guimarães Prado',
    owner_phone: '(13) 99761-0021',
    phone: '(13) 99761-0021',
    vehicle_model: 'Toyota Corolla Preto',
    applied_at: '2026-08-16',
    applied_by: 'Equipe de Aplicação Comitê',
    territory: 'Gonzaga',
    status: 'applied',
    created_at: '2026-08-16T10:00:00Z',
  },
  {
    id: 'car-2',
    organization_id: 'org-alpha',
    plate: 'XYZ-9120',
    vehicle_plate: 'XYZ-9120',
    owner_name: 'Marcelo Faria',
    owner_phone: '(13) 98811-3322',
    phone: '(13) 98811-3322',
    vehicle_model: 'Chevrolet Onix Prata',
    applied_at: '2026-08-20',
    applied_by: 'Fabiana Rios',
    territory: 'Gonzaga',
    status: 'applied',
    created_at: '2026-08-20T10:00:00Z',
  },
  {
    id: 'car-3',
    organization_id: 'org-alpha',
    plate: 'KML-7731',
    vehicle_plate: 'KML-7731',
    owner_name: 'Tiago Bernardes',
    owner_phone: '(13) 99144-6655',
    phone: '(13) 99144-6655',
    vehicle_model: 'VW Gol Branco',
    applied_at: '2026-08-24',
    applied_by: 'Seu Valdir',
    territory: 'Nova Cintra',
    status: 'applied',
    created_at: '2026-08-24T10:00:00Z',
  }
];

const initialHouseStickers: HouseSticker[] = [
  {
    id: 'hse-1',
    organization_id: 'org-alpha',
    address: 'Rua Galeão Carvalhal, 120 - Apto 41',
    resident_name: 'Beatriz Vasques',
    phone: '(13) 98842-1928',
    neighborhood: 'Gonzaga',
    territory: 'Gonzaga',
    applied_at: '2026-08-17',
    applied_by: 'Fabiana Rios',
    status: 'applied',
    created_at: '2026-08-17T10:00:00Z',
  },
  {
    id: 'hse-2',
    organization_id: 'org-alpha',
    address: 'Av. Nossa Senhora de Fátima, 890 - Casa',
    resident_name: 'Edson Moreira de Souza',
    phone: '(13) 99611-4477',
    neighborhood: 'Nova Cintra',
    territory: 'Nova Cintra',
    applied_at: '2026-08-23',
    applied_by: 'Seu Valdir',
    status: 'applied',
    created_at: '2026-08-23T10:00:00Z',
  }
];

const initialDemands: PopularDemand[] = [
  {
    id: 'dem-1',
    organization_id: 'org-alpha',
    title: 'Recapeamento e iluminação no trecho da Av. Afonso Pena',
    category: 'Infraestrutura',
    territory: 'Embaré',
    neighborhood: 'Embaré',
    priority: 'high',
    urgency: 'alta',
    status: 'under_review',
    reporter_name: 'Jorge Tadeu',
    description: 'Demanda de pedestres e comerciantes locais sobre falta de iluminação noturna.',
    created_at: '2026-08-21T10:00:00Z',
  },
  {
    id: 'dem-2',
    organization_id: 'org-alpha',
    title: 'Ampliação do horário de atendimento na UBS Areia Branca',
    category: 'Saúde',
    territory: 'Areia Branca',
    neighborhood: 'Areia Branca',
    priority: 'urgent',
    urgency: 'critica',
    status: 'open',
    reporter_name: 'Pastor Marcos Vinicius',
    description: 'Filas no início da manhã requerem abertura estendida até as 20h.',
    created_at: '2026-08-25T14:30:00Z',
  }
];

// Local state store with multi-tenant isolation
class LocalMultiTenantStore {
  private get<T>(key: string, defaultValue: T[]): T[] {
    if (typeof window === 'undefined') return defaultValue;
    const data = localStorage.getItem(`nexus_${key}`);
    if (!data) {
      localStorage.setItem(`nexus_${key}`, JSON.stringify(defaultValue));
      return defaultValue;
    }
    try {
      return JSON.parse(data);
    } catch {
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`nexus_${key}`, JSON.stringify(value));
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
