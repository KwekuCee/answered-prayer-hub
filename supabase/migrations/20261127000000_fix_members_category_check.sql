-- Fix attendee registration error:
-- new row for relation "members" violates check constraint "members_category_check"
-- Ensures members.category defaults to 'general' and register_member inserts 'general'.
BEGIN;

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_category_check;
UPDATE public.members SET category = 'general' WHERE category IS NULL OR category = 'member';
ALTER TABLE public.members ALTER COLUMN category SET DEFAULT 'general';
ALTER TABLE public.members ADD CONSTRAINT members_category_check CHECK (category IN ('general', 'dignitary', 'choir_member'));

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

COMMIT;
NOTIFY pgrst, 'reload schema';
