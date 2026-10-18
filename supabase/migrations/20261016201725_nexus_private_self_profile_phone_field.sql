-- Historical execution note: target project is selected by the deployment configuration.
-- The profile UI allowed editing a phone number but the DB lacked the column.
-- Keep phone tenant-private (profiles RLS). No public address book.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.profiles'::regclass AND conname='profiles_phone_length'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_length
      CHECK (phone IS NULL OR length(phone) <= 32);
  END IF;
END $$;

GRANT UPDATE (name, phone) ON TABLE public.profiles TO authenticated;

DROP POLICY IF EXISTS profile_update_own_name ON public.profiles;
DROP POLICY IF EXISTS profile_update_own_contact ON public.profiles;
CREATE POLICY profile_update_own_contact ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = (SELECT auth.uid())
    AND organization_id = (SELECT private.nexus_auth_org_id())
    AND is_blocked = false
  )
  WITH CHECK (
    id = (SELECT auth.uid())
    AND organization_id = (SELECT private.nexus_auth_org_id())
    AND is_blocked = false
  );
