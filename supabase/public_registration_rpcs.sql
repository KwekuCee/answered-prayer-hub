-- Standalone idempotent migration for safe public registration RPCs & directory projections.
-- Run this in Supabase SQL Editor (or run the full consolidated my_all.sql).
BEGIN;

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_category_check;
UPDATE public.members SET category = 'general' WHERE category IS NULL OR category = 'member';
ALTER TABLE public.members ALTER COLUMN category SET DEFAULT 'general';
ALTER TABLE public.members ADD CONSTRAINT members_category_check CHECK (category IN ('general', 'dignitary', 'choir_member'));

DROP FUNCTION IF EXISTS public.list_public_inviters();
CREATE OR REPLACE FUNCTION public.list_public_inviters()
RETURNS TABLE(id uuid, full_name text, church_id uuid, church_name text) LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, i.full_name, i.church_id, c.name AS church_name
  FROM public.inviters i
  LEFT JOIN public.churches c ON c.id = i.church_id
  ORDER BY i.full_name;
$$;

DROP FUNCTION IF EXISTS public.list_public_churches();
CREATE OR REPLACE FUNCTION public.list_public_churches()
RETURNS TABLE(id uuid, name text, is_external boolean) LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.name, COALESCE(c.is_external, false) AS is_external
  FROM public.churches c
  ORDER BY c.name;
$$;

REVOKE ALL ON FUNCTION public.list_public_inviters(), public.list_public_churches() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_inviters(), public.list_public_churches() TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.register_member(text, text, uuid, text, text, text, date);
DROP FUNCTION IF EXISTS public.register_member(text, text, uuid, text, text, text, date, uuid);
CREATE OR REPLACE FUNCTION public.register_member(
  p_full_name text,
  p_phone text,
  p_inviter_id uuid DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_occupation text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_date_of_birth date DEFAULT NULL,
  p_church_id uuid DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  chosen_church uuid;
  new_id uuid;
  current_program uuid;
BEGIN
  IF p_full_name IS NULL OR length(btrim(p_full_name)) NOT BETWEEN 1 AND 200
     OR p_phone IS NULL OR length(btrim(p_phone)) NOT BETWEEN 3 AND 50 THEN
    RAISE EXCEPTION 'Name and phone are required';
  END IF;
  IF p_date_of_birth > current_date THEN
    RAISE EXCEPTION 'Birth date cannot be in the future';
  END IF;

  IF p_inviter_id IS NOT NULL THEN
    SELECT church_id INTO chosen_church FROM public.inviters WHERE id = p_inviter_id;
    IF chosen_church IS NULL THEN
      RAISE EXCEPTION 'Select a registered inviter';
    END IF;
  ELSIF p_church_id IS NOT NULL THEN
    SELECT id INTO chosen_church FROM public.churches WHERE id = p_church_id;
    IF chosen_church IS NULL THEN
      RAISE EXCEPTION 'Selected church was not found';
    END IF;
  ELSE
    chosen_church := NULL;
  END IF;

  SELECT id INTO current_program FROM public.programs WHERE is_active LIMIT 1;

  INSERT INTO public.members (
    full_name, phone, email, occupation, location, date_of_birth,
    inviter_id, church_id, program_id, category
  )
  VALUES (
    btrim(p_full_name),
    btrim(p_phone),
    NULLIF(btrim(COALESCE(p_email, '')), ''),
    NULLIF(btrim(COALESCE(p_occupation, '')), ''),
    NULLIF(btrim(COALESCE(p_location, '')), ''),
    p_date_of_birth,
    p_inviter_id,
    chosen_church,
    current_program,
    'general'
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.register_member(text, text, uuid, text, text, text, date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_member(text, text, uuid, text, text, text, date, uuid) TO anon, authenticated, service_role;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.church_credentials (
  church_id uuid PRIMARY KEY REFERENCES public.churches(id) ON DELETE CASCADE,
  auth_code_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.church_credentials FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.church_credentials TO service_role;
ALTER TABLE public.church_credentials ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.churches ALTER COLUMN auth_code DROP NOT NULL;

INSERT INTO public.church_credentials (church_id, auth_code_hash)
SELECT id, crypt(btrim(auth_code), gen_salt('bf'))
FROM public.churches
WHERE auth_code IS NOT NULL AND btrim(auth_code) <> ''
ON CONFLICT (church_id) DO NOTHING;

UPDATE public.churches SET auth_code = NULL WHERE auth_code IS NOT NULL;

DROP FUNCTION IF EXISTS public.register_inviter(text, text, text, uuid, text);
CREATE OR REPLACE FUNCTION public.register_inviter(
  p_full_name text,
  p_email text,
  p_phone text,
  p_church_id uuid,
  p_auth_code text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_church_code text;
  v_church_hash text;
  v_is_external boolean := false;
  v_program_id uuid;
  v_inviter_id uuid;
  v_submitted_code text := btrim(COALESCE(p_auth_code, ''));
BEGIN
  IF length(btrim(COALESCE(p_full_name, ''))) NOT BETWEEN 1 AND 200
     OR length(btrim(COALESCE(p_email, ''))) NOT BETWEEN 3 AND 254
     OR btrim(p_email) !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
     OR length(btrim(COALESCE(p_phone, ''))) NOT BETWEEN 3 AND 50
     OR p_church_id IS NULL THEN
    RAISE EXCEPTION 'Full name, valid email, phone, and church are required';
  END IF;

  SELECT c.auth_code, COALESCE(c.is_external, false), cc.auth_code_hash
  INTO v_church_code, v_is_external, v_church_hash
  FROM public.churches c
  LEFT JOIN public.church_credentials cc ON cc.church_id = c.id
  WHERE c.id = p_church_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected church was not found';
  END IF;

  IF v_submitted_code = '' THEN
    RAISE EXCEPTION 'Invalid authentication code for this church';
  END IF;

  IF v_church_hash IS NOT NULL THEN
    IF crypt(v_submitted_code, v_church_hash) IS DISTINCT FROM v_church_hash
       AND (v_is_external OR v_submitted_code <> '100PRAYER') THEN
      RAISE EXCEPTION 'Invalid authentication code for this church';
    END IF;
  ELSIF v_is_external THEN
    IF v_submitted_code IS DISTINCT FROM NULLIF(btrim(COALESCE(v_church_code, '')), '') THEN
      RAISE EXCEPTION 'Invalid authentication code for this church';
    END IF;
  ELSE
    IF v_submitted_code IS DISTINCT FROM NULLIF(btrim(COALESCE(v_church_code, '')), '')
       AND v_submitted_code <> '100PRAYER' THEN
      RAISE EXCEPTION 'Invalid authentication code for this church';
    END IF;
  END IF;

  SELECT id INTO v_program_id FROM public.programs WHERE is_active LIMIT 1;

  INSERT INTO public.inviters (program_id, full_name, email, phone, church_id)
  VALUES (v_program_id, btrim(p_full_name), btrim(p_email), btrim(p_phone), p_church_id)
  RETURNING id INTO v_inviter_id;

  RETURN v_inviter_id;
END $$;
REVOKE ALL ON FUNCTION public.register_inviter(text, text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_inviter(text, text, text, uuid, text) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.register_external_church(text, text, text, text, text, integer, text, text, text);
DROP FUNCTION IF EXISTS public.register_external_church(text, text, text, text, text, text, integer, text, text, text);
CREATE OR REPLACE FUNCTION public.register_external_church(
  p_name text,
  p_pastor_name text,
  p_pastor_email text,
  p_pastor_phone text,
  p_location text DEFAULT NULL,
  p_target integer DEFAULT 100,
  p_auth_code text DEFAULT NULL,
  p_privacy_mode text DEFAULT 'masked',
  p_delegation_notes text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_church_id uuid;
  v_mode text := COALESCE(NULLIF(btrim(p_privacy_mode), ''), 'masked');
  v_code text := btrim(COALESCE(p_auth_code, ''));
  v_email text := btrim(COALESCE(p_pastor_email, ''));
BEGIN
  IF length(btrim(COALESCE(p_name, ''))) NOT BETWEEN 2 AND 200
     OR length(btrim(COALESCE(p_pastor_name, ''))) NOT BETWEEN 2 AND 200
     OR length(btrim(COALESCE(p_pastor_phone, ''))) NOT BETWEEN 3 AND 50
     OR length(v_email) NOT BETWEEN 3 AND 254
     OR v_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
     OR length(v_code) < 6 THEN
    RAISE EXCEPTION 'Church name, pastor name, valid administrator email, phone, and portal password (min 6 characters) are required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.churches
    WHERE is_external = true AND lower(btrim(COALESCE(pastor_email, ''))) = lower(v_email)
  ) THEN
    RAISE EXCEPTION 'An external church is already registered with this administrator email';
  END IF;

  IF v_mode = 'anonymized' OR v_mode NOT IN ('masked', 'open') THEN
    v_mode := 'masked';
  END IF;

  INSERT INTO public.churches (
    name, is_external, pastor_name, pastor_email, pastor_phone,
    location, target, auth_code, privacy_mode, delegation_notes, confirmed
  )
  VALUES (
    btrim(p_name), true, btrim(p_pastor_name), v_email, btrim(p_pastor_phone),
    NULLIF(btrim(COALESCE(p_location, '')), ''), GREATEST(1, COALESCE(p_target, 100)),
    NULL, v_mode, NULLIF(btrim(COALESCE(p_delegation_notes, '')), ''), 0
  )
  RETURNING id INTO v_church_id;

  INSERT INTO public.church_credentials (church_id, auth_code_hash)
  VALUES (v_church_id, crypt(v_code, gen_salt('bf')));

  INSERT INTO public.audit_logs (action, target_type, target_id, details)
  VALUES ('EXTERNAL_CHURCH_REGISTERED', 'church', v_church_id::text, 'Registered external church ' || btrim(p_name));

  RETURN v_church_id;
END $$;
REVOKE ALL ON FUNCTION public.register_external_church(text, text, text, text, text, integer, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_external_church(text, text, text, text, text, integer, text, text, text) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.verify_external_church_credentials(text, text);
CREATE OR REPLACE FUNCTION public.verify_external_church_credentials(p_email text, p_password text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_email text := lower(btrim(COALESCE(p_email, '')));
  v_pass text := btrim(COALESCE(p_password, ''));
BEGIN
  IF v_email = '' OR v_pass = '' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.churches c
    JOIN public.church_credentials cc ON cc.church_id = c.id
    WHERE c.is_external = true
      AND lower(btrim(COALESCE(c.pastor_email, ''))) = v_email
      AND cc.auth_code_hash = crypt(v_pass, cc.auth_code_hash)
      AND NOT EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.user_roles r ON r.user_id = p.user_id
        WHERE p.church_id = c.id AND r.role = 'church_admin'
      )
  );
END $$;
REVOKE ALL ON FUNCTION public.verify_external_church_credentials(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_external_church_credentials(text, text) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.claim_external_church_role(text);
CREATE OR REPLACE FUNCTION public.claim_external_church_role(p_password text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_church record;
  v_pass text := btrim(COALESCE(p_password, ''));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT lower(btrim(email)) INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Verified user email not found';
  END IF;

  SELECT c.id, c.name, c.pastor_name, c.pastor_phone
  INTO v_church
  FROM public.churches c
  JOIN public.church_credentials cc ON cc.church_id = c.id
  WHERE c.is_external = true
    AND lower(btrim(COALESCE(c.pastor_email, ''))) = v_email
    AND cc.auth_code_hash = crypt(v_pass, cc.auth_code_hash)
  LIMIT 1;

  IF v_church.id IS NULL THEN
    RAISE EXCEPTION 'Invalid external church administrator credentials';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles r ON r.user_id = p.user_id
    WHERE p.church_id = v_church.id AND r.role = 'church_admin' AND p.user_id <> v_uid
  ) THEN
    RAISE EXCEPTION 'This church administrator portal has already been claimed';
  END IF;

  PERFORM set_config('app.claiming_external_church', '1', true);

  INSERT INTO public.profiles (user_id, full_name, username, email, phone, church_id)
  VALUES (
    v_uid,
    COALESCE(NULLIF(btrim(v_church.pastor_name), ''), v_email),
    split_part(v_email, '@', 1) || '_' || substr(v_uid::text, 1, 6),
    v_email,
    NULLIF(btrim(COALESCE(v_church.pastor_phone, '')), ''),
    v_church.id
  )
  ON CONFLICT (user_id) DO UPDATE
  SET church_id = COALESCE(public.profiles.church_id, EXCLUDED.church_id),
      phone = COALESCE(NULLIF(btrim(public.profiles.phone), ''), EXCLUDED.phone);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'church_admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.audit_logs (user_id, action, target_type, target_id, details)
  VALUES (v_uid, 'EXTERNAL_CHURCH_ADMIN_CLAIMED', 'church', v_church.id::text, 'Activated church admin access for ' || v_church.name);

  RETURN v_church.id;
END $$;
REVOKE ALL ON FUNCTION public.claim_external_church_role(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_external_church_role(text) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.set_church_privacy_mode(uuid, text);
CREATE OR REPLACE FUNCTION public.set_church_privacy_mode(p_church_id uuid, p_privacy_mode text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_manage_church(p_church_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF p_privacy_mode NOT IN ('masked', 'open') THEN
    RAISE EXCEPTION 'Privacy mode must be masked or open';
  END IF;

  UPDATE public.churches
  SET privacy_mode = p_privacy_mode
  WHERE id = p_church_id;

  INSERT INTO public.audit_logs (user_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'CHURCH_PRIVACY_MODE_UPDATED', 'church', p_church_id::text, 'Updated church privacy mode to ' || p_privacy_mode);
END $$;
REVOKE ALL ON FUNCTION public.set_church_privacy_mode(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_church_privacy_mode(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.protect_profile_scope()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'Unexpected execution role';
  END IF;
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') IN ('anon', 'authenticated')
     OR COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb->>'role' IN ('anon', 'authenticated') THEN
    IF NOT public.has_role(auth.uid(), 'super_admin') AND (
      NEW.user_id IS DISTINCT FROM OLD.user_id
      OR (
        NEW.church_id IS DISTINCT FROM OLD.church_id
        AND NOT (OLD.church_id IS NULL AND current_setting('app.claiming_external_church', true) = '1')
      )
    ) THEN
      RAISE EXCEPTION 'Only a super admin may change profile ownership or church';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_profile_scope ON public.profiles;
CREATE TRIGGER protect_profile_scope BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_scope();
REVOKE ALL ON FUNCTION public.protect_profile_scope() FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.register_special_choir(text, uuid, text, text, text, text, integer, text, text);
CREATE OR REPLACE FUNCTION public.register_special_choir(
  p_choir_name text,
  p_church_id uuid DEFAULT NULL,
  p_church_name text DEFAULT NULL,
  p_leader_name text DEFAULT '',
  p_leader_phone text DEFAULT '',
  p_leader_email text DEFAULT NULL,
  p_estimated_members integer DEFAULT 1,
  p_instrument_requirements text DEFAULT NULL,
  p_rehearsal_schedule text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_choir_id uuid;
  v_church uuid := p_church_id;
  v_church_label text := NULLIF(btrim(COALESCE(p_church_name, '')), '');
  v_count integer := GREATEST(1, COALESCE(p_estimated_members, 1));
  v_program_id uuid;
BEGIN
  IF length(btrim(COALESCE(p_choir_name, ''))) NOT BETWEEN 2 AND 200
     OR length(btrim(COALESCE(p_leader_name, ''))) NOT BETWEEN 2 AND 200
     OR length(btrim(COALESCE(p_leader_phone, ''))) NOT BETWEEN 3 AND 50 THEN
    RAISE EXCEPTION 'Choir name, leader name, and phone are required';
  END IF;

  IF v_church IS NOT NULL THEN
    SELECT id, name INTO v_church, v_church_label FROM public.churches WHERE id = v_church;
  END IF;

  INSERT INTO public.special_choirs (
    choir_name, church_id, church_name, leader_name, leader_phone, leader_email,
    estimated_members, confirmed_members, instrument_requirements, rehearsal_schedule, status
  )
  VALUES (
    btrim(p_choir_name), v_church, v_church_label, btrim(p_leader_name), btrim(p_leader_phone),
    NULLIF(btrim(COALESCE(p_leader_email, '')), ''), v_count, 0,
    NULLIF(btrim(COALESCE(p_instrument_requirements, '')), ''),
    NULLIF(btrim(COALESCE(p_rehearsal_schedule, '')), ''), 'pending'
  )
  RETURNING id INTO v_choir_id;

  SELECT id INTO v_program_id FROM public.programs WHERE is_active LIMIT 1;
  INSERT INTO public.members (
    full_name, phone, email, category, occupation, location, church_id, program_id, choir_delegation_id, confirmed
  )
  VALUES (
    btrim(p_leader_name) || ' (Director - ' || btrim(p_choir_name) || ')',
    btrim(p_leader_phone), NULLIF(btrim(COALESCE(p_leader_email, '')), ''),
    'choir_member', 'Music Director / Choir Leader', v_church_label, v_church, v_program_id, v_choir_id, false
  );

  RETURN v_choir_id;
END $$;
REVOKE ALL ON FUNCTION public.register_special_choir(text, uuid, text, text, text, text, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_special_choir(text, uuid, text, text, text, text, integer, text, text) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.register_dignitary(text, text, text, text, text, text, text, text, integer, text, text);
CREATE OR REPLACE FUNCTION public.register_dignitary(
  p_title text,
  p_full_name text,
  p_office_or_portfolio text,
  p_constituency text DEFAULT NULL,
  p_contact_phone text DEFAULT '',
  p_contact_email text DEFAULT NULL,
  p_protocol_officer_name text DEFAULT NULL,
  p_protocol_officer_phone text DEFAULT NULL,
  p_security_detail_count integer DEFAULT 0,
  p_special_seating_zone text DEFAULT 'VIP-A',
  p_arrival_window text DEFAULT '4:30 PM'
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_member_id uuid;
  v_program_id uuid;
BEGIN
  IF length(btrim(COALESCE(p_full_name, ''))) NOT BETWEEN 2 AND 200
     OR length(btrim(COALESCE(p_office_or_portfolio, ''))) NOT BETWEEN 2 AND 200
     OR length(btrim(COALESCE(p_contact_phone, ''))) NOT BETWEEN 3 AND 50 THEN
    RAISE EXCEPTION 'Full name, office/portfolio, and contact phone are required';
  END IF;

  SELECT id INTO v_program_id FROM public.programs WHERE is_active LIMIT 1;

  INSERT INTO public.members (
    full_name, phone, email, category, occupation, location, program_id,
    dignitary_title, dignitary_office, dignitary_constituency, vip_tier, confirmed
  )
  VALUES (
    btrim(COALESCE(p_title, '') || ' ' || btrim(p_full_name)),
    btrim(p_contact_phone), NULLIF(btrim(COALESCE(p_contact_email, '')), ''),
    'dignitary', btrim(p_office_or_portfolio), NULLIF(btrim(COALESCE(p_constituency, '')), ''),
    v_program_id, btrim(COALESCE(p_title, '')), btrim(p_office_or_portfolio),
    NULLIF(btrim(COALESCE(p_constituency, '')), ''), 'vip', false
  )
  RETURNING id INTO v_member_id;

  INSERT INTO public.dignitaries (
    member_id, title, full_name, office_or_portfolio, organization_or_constituency,
    contact_phone, contact_email, protocol_officer_name, protocol_officer_phone,
    security_detail_count, special_seating_zone, "arrivalWindow", status
  )
  VALUES (
    v_member_id, btrim(COALESCE(p_title, '')), btrim(p_full_name), btrim(p_office_or_portfolio),
    NULLIF(btrim(COALESCE(p_constituency, '')), ''), btrim(p_contact_phone),
    NULLIF(btrim(COALESCE(p_contact_email, '')), ''), NULLIF(btrim(COALESCE(p_protocol_officer_name, '')), ''),
    NULLIF(btrim(COALESCE(p_protocol_officer_phone, '')), ''), GREATEST(0, COALESCE(p_security_detail_count, 0)),
    NULLIF(btrim(COALESCE(p_special_seating_zone, '')), ''), NULLIF(btrim(COALESCE(p_arrival_window, '')), ''), 'pending'
  );

  RETURN v_member_id;
END $$;
REVOKE ALL ON FUNCTION public.register_dignitary(text, text, text, text, text, text, text, text, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_dignitary(text, text, text, text, text, text, text, text, integer, text, text) TO anon, authenticated, service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
