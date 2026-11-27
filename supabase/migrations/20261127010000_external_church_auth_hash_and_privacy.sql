-- Migration: Hash external church passwords with pgcrypto bcrypt in private church_credentials,
-- enable verified portal login claiming via claim_external_church_role, and allow authorized
-- Masked vs Open call-center privacy updates via set_church_privacy_mode.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS is_external boolean NOT NULL DEFAULT false;
ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS pastor_name text;
ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS pastor_email text;
ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS pastor_phone text;
ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS auth_code text;
ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS privacy_mode text NOT NULL DEFAULT 'masked';
ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS delegation_notes text;
ALTER TABLE public.churches ALTER COLUMN auth_code DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.church_credentials (
  church_id uuid PRIMARY KEY REFERENCES public.churches(id) ON DELETE CASCADE,
  auth_code_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.church_credentials FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.church_credentials TO service_role;
ALTER TABLE public.church_credentials ENABLE ROW LEVEL SECURITY;

-- Hash any existing plaintext churches.auth_code entries and wipe plaintext values
INSERT INTO public.church_credentials (church_id, auth_code_hash)
SELECT id, crypt(btrim(auth_code), gen_salt('bf'))
FROM public.churches
WHERE auth_code IS NOT NULL AND btrim(auth_code) <> ''
ON CONFLICT (church_id) DO NOTHING;

UPDATE public.churches SET auth_code = NULL WHERE auth_code IS NOT NULL;

-- Verify inviter church access codes against bcrypt hashes
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

-- Validated public external church registration (hashes password into church_credentials)
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

-- Checks whether an email + password match an unclaimed external church credential hash
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

-- Claims church_admin role and profile church link after verifying signed-in user email and bcrypt password hash
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

-- Allows Super Admin or the church's assigned Church Admin to switch privacy_mode between 'masked' and 'open'
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

-- Ensure protect_profile_scope allows claim_external_church_role when claiming from NULL church_id
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

COMMIT;
NOTIFY pgrst, 'reload schema';
