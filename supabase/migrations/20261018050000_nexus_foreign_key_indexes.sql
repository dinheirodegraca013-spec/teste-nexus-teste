-- NEXUS DEV: covering indexes for tenant and hierarchy foreign keys.
-- No row access or policy behavior changes.
CREATE INDEX IF NOT EXISTS nexus_controller_scopes_org_coordinator_idx ON private.nexus_controller_scopes(organization_id,coordinator_id);
CREATE INDEX IF NOT EXISTS nexus_team_memberships_org_user_idx ON private.nexus_team_memberships(organization_id,user_id);
CREATE INDEX IF NOT EXISTS audit_logs_organization_id_idx ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS campaign_events_organization_id_idx ON public.campaign_events(organization_id);
CREATE INDEX IF NOT EXISTS car_stickers_organization_id_idx ON public.car_stickers(organization_id);
CREATE INDEX IF NOT EXISTS crm_contacts_org_leader_idx ON public.crm_contacts(organization_id,leader_id);
CREATE INDEX IF NOT EXISTS field_presences_org_leader_idx ON public.field_presences(organization_id,leader_id);
CREATE INDEX IF NOT EXISTS field_presences_organization_id_idx ON public.field_presences(organization_id);
CREATE INDEX IF NOT EXISTS goals_organization_id_idx ON public.goals(organization_id);
CREATE INDEX IF NOT EXISTS house_stickers_organization_id_idx ON public.house_stickers(organization_id);
CREATE INDEX IF NOT EXISTS leaders_org_coordinator_idx ON public.leaders(organization_id,coordinator_id);
CREATE INDEX IF NOT EXISTS material_distributions_material_id_idx ON public.material_distributions(material_id);
CREATE INDEX IF NOT EXISTS material_distributions_org_material_idx ON public.material_distributions(organization_id,material_id);
CREATE INDEX IF NOT EXISTS material_distributions_organization_id_idx ON public.material_distributions(organization_id);
CREATE INDEX IF NOT EXISTS meetings_organization_id_idx ON public.meetings(organization_id);
CREATE INDEX IF NOT EXISTS popular_demands_organization_id_idx ON public.popular_demands(organization_id);
