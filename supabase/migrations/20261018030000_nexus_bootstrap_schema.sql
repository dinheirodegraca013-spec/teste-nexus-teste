-- NEXUS DEV bootstrap schema. No production data is copied.
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
  slug text NOT NULL UNIQUE, campaign_type text, document text,
  plan text NOT NULL DEFAULT 'free', status text NOT NULL DEFAULT 'active',
  logo_url text, settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL, email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'operator', is_blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  phone text, CONSTRAINT profiles_role_check CHECK (role IN ('superadmin','admin','manager','coordinator','controller','leader','operator','viewer')),
  CONSTRAINT profiles_phone_length CHECK (phone IS NULL OR length(phone) <= 32),
  CONSTRAINT profiles_organization_id_id_key UNIQUE (organization_id,id)
);
CREATE TABLE IF NOT EXISTS public.user_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_key text NOT NULL, can_read boolean NOT NULL DEFAULT false,
  can_write boolean NOT NULL DEFAULT false, can_delete boolean NOT NULL DEFAULT false,
  UNIQUE (user_id,module_key)
);
CREATE TABLE IF NOT EXISTS public.coordinators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL, email text, phone text, territory text NOT NULL DEFAULT '', region text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')), notes text,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (organization_id,id)
);
CREATE TABLE IF NOT EXISTS public.leaders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  coordinator_id uuid, coordinator_name text, name text NOT NULL, email text, phone text,
  territory text NOT NULL DEFAULT '', neighborhood text, goal_target integer NOT NULL DEFAULT 0 CHECK (goal_target >= 0),
  goal_reached integer NOT NULL DEFAULT 0 CHECK (goal_reached >= 0), goal_cars integer NOT NULL DEFAULT 0 CHECK (goal_cars >= 0),
  goal_houses integer NOT NULL DEFAULT 0 CHECK (goal_houses >= 0), goal_presence integer NOT NULL DEFAULT 0 CHECK (goal_presence >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','pending')), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,id)
);
ALTER TABLE public.leaders ADD CONSTRAINT leaders_coordinator_id_tenant_fk FOREIGN KEY (organization_id,coordinator_id) REFERENCES public.coordinators(organization_id,id) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  leader_id uuid, name text NOT NULL, email text, whatsapp text, city text, neighborhood text,
  origin text NOT NULL DEFAULT 'crm', tags text[] NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (organization_id,id)
);
CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL, description text, category text NOT NULL DEFAULT 'geral', target_value integer NOT NULL DEFAULT 0 CHECK (target_value >= 0),
  current_value integer NOT NULL DEFAULT 0 CHECK (current_value >= 0), unit text NOT NULL DEFAULT '', responsible_id uuid, responsible_name text NOT NULL DEFAULT '',
  start_date date, end_date date, status text NOT NULL DEFAULT 'in_progress', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.campaign_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL, description text, event_type text NOT NULL DEFAULT 'outro', date date, time text, location text NOT NULL DEFAULT '',
  territory text, responsible_id uuid, responsible_name text, expected_attendees integer NOT NULL DEFAULT 0 CHECK (expected_attendees >= 0),
  confirmed_attendees integer NOT NULL DEFAULT 0 CHECK (confirmed_attendees >= 0), status text NOT NULL DEFAULT 'scheduled', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL, agenda text, date date, time text, location text NOT NULL DEFAULT '', responsible text, responsible_name text,
  attendees_count integer NOT NULL DEFAULT 0 CHECK (attendees_count >= 0), minutes text, status text NOT NULL DEFAULT 'scheduled', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.field_presences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  activity_type text, reference_title text, reference_name text, date date, location text, leader_id uuid, leader_name text,
  attendee_name text, name text, attendee_phone text, phone text, attendee_territory text, photo_url text, attachment_name text,
  confirmed_by text, status text NOT NULL DEFAULT 'present', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.materials_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text, item_name text, sku text, category text NOT NULL DEFAULT '', total_quantity integer NOT NULL DEFAULT 0 CHECK (total_quantity >= 0),
  distributed_quantity integer NOT NULL DEFAULT 0 CHECK (distributed_quantity >= 0), stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  min_stock_alert integer NOT NULL DEFAULT 0 CHECK (min_stock_alert >= 0), min_quantity integer NOT NULL DEFAULT 0 CHECK (min_quantity >= 0),
  unit text NOT NULL DEFAULT 'un', location text, updated_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
  ,UNIQUE (organization_id,id)
);
CREATE TABLE IF NOT EXISTS public.material_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials_inventory(id), material_name text NOT NULL DEFAULT '', recipient_name text NOT NULL,
  recipient_type text, territory text, quantity integer NOT NULL CHECK (quantity > 0), distributed_at timestamptz, distributed_by text,
  status text NOT NULL DEFAULT 'pending', notes text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.car_stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plate text, vehicle_plate text, owner_name text NOT NULL, owner_phone text, phone text, vehicle_model text, photo_url text, attachment_name text,
  applied_at timestamptz, applied_by text, territory text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'scheduled', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.house_stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  address text NOT NULL, resident_name text NOT NULL, phone text, photo_url text, attachment_name text, neighborhood text, territory text NOT NULL DEFAULT '',
  applied_at timestamptz, applied_by text, status text NOT NULL DEFAULT 'scheduled', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.popular_demands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL, category text NOT NULL DEFAULT '', territory text NOT NULL DEFAULT '', neighborhood text, priority text, urgency text,
  status text NOT NULL DEFAULT 'open', reporter_name text, description text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid, action text NOT NULL, entity text NOT NULL, entity_id text, details jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_contacts ADD CONSTRAINT crm_contacts_leader_id_tenant_fk FOREIGN KEY (organization_id,leader_id) REFERENCES public.leaders(organization_id,id) ON DELETE SET NULL;
ALTER TABLE public.field_presences ADD CONSTRAINT field_presences_leader_id_tenant_fk FOREIGN KEY (organization_id,leader_id) REFERENCES public.leaders(organization_id,id) ON DELETE SET NULL;
ALTER TABLE public.material_distributions ADD CONSTRAINT material_distributions_material_id_tenant_fk FOREIGN KEY (organization_id,material_id) REFERENCES public.materials_inventory(organization_id,id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION private.nexus_auth_org_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT organization_id FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_blocked=false LIMIT 1 $$;
CREATE OR REPLACE FUNCTION private.get_auth_org_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT private.nexus_auth_org_id() $$;
CREATE OR REPLACE FUNCTION private.nexus_is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_blocked=false AND role IN ('admin','superadmin')) $$;
CREATE OR REPLACE FUNCTION public.provision_new_user(p_org_name text,p_org_slug text,p_campaign_type text,p_profile_name text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_org uuid; v_uid uuid := (SELECT auth.uid()); BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id=v_uid) THEN RETURN (SELECT organization_id FROM public.profiles WHERE id=v_uid); END IF;
  INSERT INTO public.organizations(name,slug,campaign_type) VALUES (p_org_name, p_org_slug || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,8), p_campaign_type) RETURNING id INTO v_org;
  INSERT INTO public.profiles(id,organization_id,name,email,role) SELECT v_uid,v_org,p_profile_name,coalesce((SELECT email FROM auth.users WHERE id=v_uid),''),'admin';
  RETURN v_org;
END $fn$;
REVOKE ALL ON FUNCTION public.provision_new_user(text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.provision_new_user(text,text,text,text) TO authenticated;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['organizations','profiles','user_module_permissions','coordinators','leaders','crm_contacts','goals','campaign_events','meetings','field_presences','materials_inventory','material_distributions','car_stickers','house_stickers','popular_demands','audit_logs'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated',t);
  END LOOP;
END $$;
CREATE POLICY organizations_read ON public.organizations FOR SELECT TO authenticated USING (id=private.nexus_auth_org_id());
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING (organization_id=private.nexus_auth_org_id());
CREATE POLICY permissions_read ON public.user_module_permissions FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()) OR (private.nexus_is_admin() AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=user_module_permissions.user_id AND p.organization_id=private.nexus_auth_org_id())));
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['coordinators','leaders','crm_contacts','goals','campaign_events','meetings','field_presences','materials_inventory','material_distributions','car_stickers','house_stickers','popular_demands','audit_logs'] LOOP EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (organization_id=private.nexus_auth_org_id() AND private.nexus_is_admin())',t || '_read',t); END LOOP; END $$;

INSERT INTO storage.buckets (id,name,public) VALUES ('nexus-evidence-private','nexus-evidence-private',false) ON CONFLICT (id) DO UPDATE SET public=false;
GRANT USAGE ON SCHEMA private TO authenticated;
