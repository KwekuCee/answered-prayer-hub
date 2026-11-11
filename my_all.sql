-- my_all.sql: consolidated corrective schema, 2026-11-11
-- Target: an existing Lovable Cloud database or a fresh Supabase-compatible database.
-- BACK UP FIRST. Review SECURITY_REVIEW.md before applying.
-- NOT applied to the live database. Hardened policies require the documented client changes.
-- Preserves existing rows; fails transactionally on unresolved duplicate profile keys.
-- Does not provision managed Auth, Storage, Realtime, credentials, or email delivery.
BEGIN;
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('super_admin','church_admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


CREATE TABLE IF NOT EXISTS public.churches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  target integer NOT NULL DEFAULT 100,
  confirmed integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.churches TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.churches TO authenticated;

ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  church_id uuid REFERENCES public.churches(id),
  full_name text NOT NULL,
  username text NOT NULL,
  email text NOT NULL,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location_name text NOT NULL DEFAULT '',
  map_iframe_url text DEFAULT '',
  start_date text DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.programs TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.programs TO authenticated;

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.inviters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  invite_count integer NOT NULL DEFAULT 0,
  confirmed_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.inviters TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inviters TO authenticated;

ALTER TABLE public.inviters ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid REFERENCES public.churches(id),
  inviter_id uuid REFERENCES public.inviters(id),
  full_name text NOT NULL,
  email text,
  phone text NOT NULL,
  occupation text,
  location text,
  date_of_birth date,
  confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.members TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO authenticated;

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.live_stream_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.live_stream_settings TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_stream_settings TO authenticated;

ALTER TABLE public.live_stream_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.live_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text NOT NULL DEFAULT 'Anonymous',
  message text NOT NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.live_chats TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_chats TO authenticated;

ALTER TABLE public.live_chats ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.audit_logs TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO authenticated;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL,
  church_name text DEFAULT '',
  content text NOT NULL,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.testimonials TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.bus_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL DEFAULT '',
  departure_time text DEFAULT '',
  program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.bus_points TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bus_points TO authenticated;

ALTER TABLE public.bus_points ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.live_presence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_key text,
  event text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.live_presence_events TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_presence_events TO authenticated;

ALTER TABLE public.live_presence_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.live_presence_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count integer NOT NULL DEFAULT 0,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.live_presence_samples TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_presence_samples TO authenticated;

ALTER TABLE public.live_presence_samples ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.live_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_key text,
  name text,
  contact text,
  location text,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  joined_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.live_participants TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_participants TO authenticated;

ALTER TABLE public.live_participants ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.live_stream_watchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.live_stream_watchers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_stream_watchers TO authenticated;

ALTER TABLE public.live_stream_watchers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, description text DEFAULT '', file_name text NOT NULL, file_path text NOT NULL, file_size bigint NOT NULL, file_type text NOT NULL, mime_type text NOT NULL, category text DEFAULT 'general', is_public boolean NOT NULL DEFAULT true, download_count integer NOT NULL DEFAULT 0, uploaded_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.resources TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.prayer_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL DEFAULT 'Anonymous', request text NOT NULL, program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL, status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.prayer_points TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prayer_points TO authenticated;

ALTER TABLE public.prayer_points ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.prayer_wall (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), author_name text NOT NULL DEFAULT 'Anonymous', is_anonymous boolean NOT NULL DEFAULT true, category text NOT NULL DEFAULT 'General', title text NOT NULL, request text NOT NULL, praying_count integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.prayer_wall TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prayer_wall TO authenticated;

ALTER TABLE public.prayer_wall ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.live_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_name text NOT NULL, question text NOT NULL, is_approved boolean NOT NULL DEFAULT false, is_answered boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.live_questions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_questions TO authenticated;

ALTER TABLE public.live_questions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.live_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), question text NOT NULL, options jsonb NOT NULL, is_active boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.live_polls TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_polls TO authenticated;

ALTER TABLE public.live_polls ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.live_poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), poll_id uuid NOT NULL REFERENCES public.live_polls(id) ON DELETE CASCADE, viewer_key text NOT NULL, option_index integer NOT NULL, UNIQUE(poll_id,viewer_key)
);

GRANT ALL ON public.live_poll_votes TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_poll_votes TO authenticated;

ALTER TABLE public.live_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.special_choirs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), choir_name text NOT NULL, church_id uuid REFERENCES public.churches(id) ON DELETE SET NULL, church_name text, leader_name text NOT NULL, leader_phone text NOT NULL, leader_email text, estimated_members integer NOT NULL DEFAULT 1, confirmed_members integer NOT NULL DEFAULT 0, instrument_requirements text, rehearsal_schedule text, status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.special_choirs TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.special_choirs TO authenticated;

ALTER TABLE public.special_choirs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.dignitaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid REFERENCES public.members(id) ON DELETE SET NULL, title text, full_name text NOT NULL, office_or_portfolio text, organization_or_constituency text, contact_phone text NOT NULL, contact_email text, protocol_officer_name text, protocol_officer_phone text, security_detail_count integer NOT NULL DEFAULT 0, special_seating_zone text, "arrivalWindow" text, status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.dignitaries TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dignitaries TO authenticated;

ALTER TABLE public.dignitaries ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS is_external boolean NOT NULL DEFAULT false;

ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS pastor_name text;

ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS pastor_email text;

ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS pastor_phone text;

ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS location text;

ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS auth_code text;

ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS privacy_mode text NOT NULL DEFAULT 'masked';

ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS delegation_notes text;

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL;

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS checked_in boolean NOT NULL DEFAULT false;

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS check_in_time timestamptz;

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'member';

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS choir_delegation_id uuid;

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS dignitary_title text;

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS dignitary_office text;

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS dignitary_constituency text;

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS vip_tier text;

ALTER TABLE public.inviters ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL;

ALTER TABLE public.bus_points ADD COLUMN IF NOT EXISTS lat numeric(10,7);

ALTER TABLE public.bus_points ADD COLUMN IF NOT EXISTS lng numeric(10,7);

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS target_type text DEFAULT '';

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS target_id text DEFAULT '';

ALTER TABLE public.live_stream_settings ADD COLUMN IF NOT EXISTS stream_url text NOT NULL DEFAULT '';

ALTER TABLE public.live_presence_samples ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL;

ALTER TABLE public.live_presence_events ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL;

ALTER TABLE public.members ALTER COLUMN church_id DROP NOT NULL;
-- Do not drop profiles' unique key with CASCADE: that destroys dependent relationships.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_unique ON public.profiles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_role_unique ON public.user_roles(user_id,role);
CREATE UNIQUE INDEX IF NOT EXISTS live_stream_watchers_session_unique ON public.live_stream_watchers(session_id);
-- Upserts with viewer_key require a unique key. Abort rather than discard duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS live_participants_viewer_unique ON public.live_participants(viewer_key);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_program ON public.programs(is_active) WHERE is_active;
CREATE INDEX IF NOT EXISTS members_church_idx ON public.members(church_id);
CREATE INDEX IF NOT EXISTS members_inviter_idx ON public.members(inviter_id);
CREATE INDEX IF NOT EXISTS members_program_idx ON public.members(program_id);
CREATE INDEX IF NOT EXISTS inviters_church_idx ON public.inviters(church_id);
CREATE INDEX IF NOT EXISTS watchers_seen_idx ON public.live_stream_watchers(last_seen) WHERE is_active;
CREATE INDEX IF NOT EXISTS audit_created_idx ON public.audit_logs(created_at DESC);
-- Logs must survive deletion, without referencing managed auth from an app table.
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid,_role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid,public.app_role) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.can_manage_church(_church_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.has_role(auth.uid(),'super_admin') OR
 (public.has_role(auth.uid(),'church_admin') AND EXISTS(
 SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND church_id=_church_id))
$$;
REVOKE ALL ON FUNCTION public.can_manage_church(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_manage_church(uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.is_application_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'church_admin')
$$;
REVOKE ALL ON FUNCTION public.is_application_admin() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_application_admin() TO authenticated,service_role;

-- Remove ALL old policies on the app-owned tables: permissive policies combine with OR.
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT * FROM pg_policies WHERE schemaname='public'
 AND tablename = ANY(ARRAY['churches','profiles','user_roles','programs','inviters','members','live_stream_settings','live_chats','audit_logs','testimonials','bus_points','live_presence_events','live_presence_samples','live_participants','live_stream_watchers','resources','prayer_points','prayer_wall','live_questions','live_polls','live_poll_votes','special_choirs','dignitaries']) LOOP
 EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,p.tablename);
 END LOOP;
END $$;


REVOKE ALL ON public.churches FROM anon,authenticated;

REVOKE ALL ON public.profiles FROM anon,authenticated;

REVOKE ALL ON public.user_roles FROM anon,authenticated;

REVOKE ALL ON public.programs FROM anon,authenticated;

REVOKE ALL ON public.inviters FROM anon,authenticated;

REVOKE ALL ON public.members FROM anon,authenticated;

REVOKE ALL ON public.live_stream_settings FROM anon,authenticated;

REVOKE ALL ON public.live_chats FROM anon,authenticated;

REVOKE ALL ON public.audit_logs FROM anon,authenticated;

REVOKE ALL ON public.testimonials FROM anon,authenticated;

REVOKE ALL ON public.bus_points FROM anon,authenticated;

REVOKE ALL ON public.live_presence_events FROM anon,authenticated;

REVOKE ALL ON public.live_presence_samples FROM anon,authenticated;

REVOKE ALL ON public.live_participants FROM anon,authenticated;

REVOKE ALL ON public.live_stream_watchers FROM anon,authenticated;

REVOKE ALL ON public.resources FROM anon,authenticated;

REVOKE ALL ON public.prayer_points FROM anon,authenticated;

REVOKE ALL ON public.prayer_wall FROM anon,authenticated;

REVOKE ALL ON public.live_questions FROM anon,authenticated;

REVOKE ALL ON public.live_polls FROM anon,authenticated;

REVOKE ALL ON public.live_poll_votes FROM anon,authenticated;

REVOKE ALL ON public.special_choirs FROM anon,authenticated;

REVOKE ALL ON public.dignitaries FROM anon,authenticated;

GRANT SELECT,INSERT,UPDATE,DELETE ON public.members TO authenticated;

CREATE POLICY "Church scoped administration" ON public.members FOR ALL TO authenticated USING (public.can_manage_church(church_id)) WITH CHECK (public.can_manage_church(church_id));

GRANT SELECT,INSERT,UPDATE,DELETE ON public.inviters TO authenticated;

CREATE POLICY "Church scoped administration" ON public.inviters FOR ALL TO authenticated USING (public.can_manage_church(church_id)) WITH CHECK (public.can_manage_church(church_id));

GRANT SELECT,INSERT,UPDATE,DELETE ON public.special_choirs TO authenticated;

CREATE POLICY "Church scoped administration" ON public.special_choirs FOR ALL TO authenticated USING (public.can_manage_church(church_id)) WITH CHECK (public.can_manage_church(church_id));

GRANT SELECT,INSERT,UPDATE,DELETE ON public.user_roles TO authenticated;

CREATE POLICY "Read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id=auth.uid());

CREATE POLICY "Super admin manages roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

GRANT SELECT,INSERT,UPDATE,DELETE ON public.profiles TO authenticated;

CREATE POLICY "Read own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id=auth.uid());

CREATE POLICY "Super admin manages profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Edit own personal details" ON public.profiles FOR UPDATE TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());

GRANT SELECT ON public.churches TO authenticated;

GRANT INSERT,UPDATE,DELETE ON public.churches TO authenticated;

CREATE POLICY "Administrators read churches" ON public.churches FOR SELECT TO authenticated USING (public.is_application_admin());

CREATE POLICY "Super admin manages churches" ON public.churches FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

GRANT SELECT ON public.programs TO anon,authenticated;

GRANT INSERT,UPDATE,DELETE ON public.programs TO authenticated;

CREATE POLICY "Public published content" ON public.programs FOR SELECT TO anon,authenticated USING (true);

CREATE POLICY "Administrator content management" ON public.programs FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

GRANT SELECT ON public.bus_points TO anon,authenticated;

GRANT INSERT,UPDATE,DELETE ON public.bus_points TO authenticated;

CREATE POLICY "Public published content" ON public.bus_points FOR SELECT TO anon,authenticated USING (true);

CREATE POLICY "Administrator content management" ON public.bus_points FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

GRANT SELECT ON public.live_stream_settings TO anon,authenticated;

GRANT INSERT,UPDATE,DELETE ON public.live_stream_settings TO authenticated;

CREATE POLICY "Public published content" ON public.live_stream_settings FOR SELECT TO anon,authenticated USING (true);

CREATE POLICY "Administrator content management" ON public.live_stream_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

GRANT SELECT ON public.live_chats TO anon,authenticated;

GRANT INSERT,UPDATE,DELETE ON public.live_chats TO authenticated;

CREATE POLICY "Public published content" ON public.live_chats FOR SELECT TO anon,authenticated USING (NOT is_deleted);

CREATE POLICY "Administrator content management" ON public.live_chats FOR ALL TO authenticated USING (public.is_application_admin()) WITH CHECK (public.is_application_admin());

GRANT SELECT ON public.testimonials TO anon,authenticated;

GRANT INSERT,UPDATE,DELETE ON public.testimonials TO authenticated;

CREATE POLICY "Public published content" ON public.testimonials FOR SELECT TO anon,authenticated USING (is_approved);

CREATE POLICY "Administrator content management" ON public.testimonials FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

GRANT SELECT ON public.resources TO anon,authenticated;

GRANT INSERT,UPDATE,DELETE ON public.resources TO authenticated;

CREATE POLICY "Public published content" ON public.resources FOR SELECT TO anon,authenticated USING (is_public);

CREATE POLICY "Administrator content management" ON public.resources FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

GRANT SELECT ON public.live_questions TO anon,authenticated;

GRANT INSERT,UPDATE,DELETE ON public.live_questions TO authenticated;

CREATE POLICY "Public published content" ON public.live_questions FOR SELECT TO anon,authenticated USING (is_approved);

CREATE POLICY "Administrator content management" ON public.live_questions FOR ALL TO authenticated USING (public.is_application_admin()) WITH CHECK (public.is_application_admin());

GRANT SELECT ON public.live_polls TO anon,authenticated;

GRANT INSERT,UPDATE,DELETE ON public.live_polls TO authenticated;

CREATE POLICY "Public published content" ON public.live_polls FOR SELECT TO anon,authenticated USING (is_active);

CREATE POLICY "Administrator content management" ON public.live_polls FOR ALL TO authenticated USING (public.is_application_admin()) WITH CHECK (public.is_application_admin());

GRANT SELECT ON public.prayer_wall TO anon,authenticated;

GRANT INSERT,UPDATE,DELETE ON public.prayer_wall TO authenticated;

CREATE POLICY "Public published content" ON public.prayer_wall FOR SELECT TO anon,authenticated USING (true);

CREATE POLICY "Administrator content management" ON public.prayer_wall FOR ALL TO authenticated USING (public.is_application_admin()) WITH CHECK (public.is_application_admin());

GRANT SELECT,INSERT,UPDATE,DELETE ON public.prayer_points TO authenticated;

CREATE POLICY "Private administrator access" ON public.prayer_points FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

GRANT SELECT,INSERT,UPDATE,DELETE ON public.dignitaries TO authenticated;

CREATE POLICY "Private administrator access" ON public.dignitaries FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

GRANT SELECT,INSERT,UPDATE,DELETE ON public.live_participants TO authenticated;

CREATE POLICY "Private administrator access" ON public.live_participants FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

GRANT SELECT,INSERT,UPDATE,DELETE ON public.live_presence_events TO authenticated;

CREATE POLICY "Private administrator access" ON public.live_presence_events FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

GRANT SELECT,INSERT,UPDATE,DELETE ON public.live_presence_samples TO authenticated;

CREATE POLICY "Private administrator access" ON public.live_presence_samples FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

GRANT SELECT,INSERT,UPDATE,DELETE ON public.live_stream_watchers TO authenticated;

CREATE POLICY "Private administrator access" ON public.live_stream_watchers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

GRANT SELECT,INSERT,UPDATE,DELETE ON public.live_poll_votes TO authenticated;

CREATE POLICY "Private administrator access" ON public.live_poll_votes FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

GRANT INSERT ON public.live_chats TO anon,authenticated;

CREATE POLICY "Public submission" ON public.live_chats FOR INSERT TO anon,authenticated WITH CHECK (NOT is_deleted AND length(btrim(message)) BETWEEN 1 AND 2000);

GRANT INSERT ON public.testimonials TO anon,authenticated;

CREATE POLICY "Public submission" ON public.testimonials FOR INSERT TO anon,authenticated WITH CHECK (NOT is_approved AND length(btrim(content)) BETWEEN 1 AND 10000);

GRANT INSERT ON public.live_questions TO anon,authenticated;

CREATE POLICY "Public submission" ON public.live_questions FOR INSERT TO anon,authenticated WITH CHECK (NOT is_approved AND NOT is_answered AND length(btrim(question)) BETWEEN 1 AND 2000);

GRANT INSERT ON public.prayer_points TO anon,authenticated;

CREATE POLICY "Public submission" ON public.prayer_points FOR INSERT TO anon,authenticated WITH CHECK (status='pending' AND length(btrim(request)) BETWEEN 1 AND 10000);

GRANT INSERT ON public.prayer_wall TO anon,authenticated;

CREATE POLICY "Public submission" ON public.prayer_wall FOR INSERT TO anon,authenticated WITH CHECK (praying_count=0 AND length(btrim(title)) BETWEEN 1 AND 200 AND length(btrim(request)) BETWEEN 1 AND 10000);

GRANT SELECT,INSERT ON public.audit_logs TO authenticated;

CREATE POLICY "Super admin reads system logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Church admin reads own actions" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'church_admin') AND user_id=auth.uid());

CREATE POLICY "Identified admin activity" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_application_admin() AND user_id=auth.uid());


-- Public directory RPCs expose names/IDs only, never private contacts or auth codes.
CREATE OR REPLACE FUNCTION public.list_public_inviters()
RETURNS TABLE(id uuid,full_name text,church_id uuid) LANGUAGE sql STABLE
SECURITY DEFINER SET search_path=public AS $$
 SELECT i.id,i.full_name,i.church_id FROM public.inviters i ORDER BY i.full_name
$$;
CREATE OR REPLACE FUNCTION public.list_public_churches()
RETURNS TABLE(id uuid,name text,is_external boolean) LANGUAGE sql STABLE
SECURITY DEFINER SET search_path=public AS $$
 SELECT c.id,c.name,c.is_external FROM public.churches c ORDER BY c.name
$$;
CREATE OR REPLACE FUNCTION public.public_registration_count()
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT count(*) FROM public.members
$$;
REVOKE ALL ON FUNCTION public.list_public_inviters(), public.list_public_churches(), public.public_registration_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_inviters(), public.list_public_churches(), public.public_registration_count() TO anon,authenticated,service_role;

-- Guest members remain allowed, but may not claim attendance, VIP status, or another church.
CREATE OR REPLACE FUNCTION public.register_member(
 p_full_name text,p_phone text,p_inviter_id uuid,p_email text DEFAULT NULL,
 p_occupation text DEFAULT NULL,p_location text DEFAULT NULL,p_date_of_birth date DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE chosen_church uuid; new_id uuid; current_program uuid;
BEGIN
 IF length(btrim(p_full_name)) NOT BETWEEN 1 AND 200 OR p_full_name IS NULL
 OR p_phone IS NULL OR length(btrim(p_phone)) NOT BETWEEN 3 AND 50 THEN
 RAISE EXCEPTION 'Name and phone are required'; END IF;
 IF p_date_of_birth>current_date THEN RAISE EXCEPTION 'Birth date cannot be in the future'; END IF;
 SELECT church_id INTO chosen_church FROM public.inviters WHERE id=p_inviter_id;
 IF chosen_church IS NULL THEN RAISE EXCEPTION 'Select a registered inviter'; END IF;
 SELECT id INTO current_program FROM public.programs WHERE is_active;
 INSERT INTO public.members(full_name,phone,email,occupation,location,date_of_birth,inviter_id,church_id,program_id)
 VALUES(btrim(p_full_name),btrim(p_phone),p_email,p_occupation,p_location,p_date_of_birth,p_inviter_id,chosen_church,current_program)
 RETURNING id INTO new_id;
 RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.register_member(text,text,uuid,text,text,text,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_member(text,text,uuid,text,text,text,date) TO anon,authenticated,service_role;

-- Inviter/admin/church/VIP/choir registration uses a trusted server endpoint.
-- Validate the global code there using a secret, not a value in browser code.
-- Never expose churches.auth_code, and never assign roles from signup metadata.

CREATE OR REPLACE FUNCTION public.protect_profile_scope()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF current_user IN ('anon','authenticated') THEN RAISE EXCEPTION 'Unexpected execution role'; END IF;
 -- Detect browser roles via request claims (SECURITY DEFINER changes current_user).
 IF COALESCE(current_setting('request.jwt.claim.role',true),'') IN ('anon','authenticated')
 OR COALESCE(NULLIF(current_setting('request.jwt.claims',true),''),'{}')::jsonb->>'role' IN ('anon','authenticated') THEN
 IF NOT public.has_role(auth.uid(),'super_admin') AND
 (NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.church_id IS DISTINCT FROM OLD.church_id) THEN
 RAISE EXCEPTION 'Only a super admin may change profile ownership or church'; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_profile_scope ON public.profiles;
CREATE TRIGGER protect_profile_scope BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_scope();
REVOKE ALL ON FUNCTION public.protect_profile_scope() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['churches','programs','live_stream_settings','resources'] LOOP
 EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON public.%I',t,t);
 EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',t,t);
 END LOOP;
END $$;

-- Keep legacy url and dashboard stream_url consistent in both directions.
UPDATE public.live_stream_settings SET stream_url=url WHERE stream_url='' AND url<>'';
CREATE OR REPLACE FUNCTION public.sync_stream_url()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN
 IF NEW.stream_url<>'' THEN NEW.url=NEW.stream_url; ELSE NEW.stream_url=NEW.url; END IF;
 ELSE
 IF NEW.stream_url IS DISTINCT FROM OLD.stream_url THEN NEW.url=NEW.stream_url;
 ELSIF NEW.url IS DISTINCT FROM OLD.url THEN NEW.stream_url=NEW.url; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sync_stream_url ON public.live_stream_settings;
CREATE TRIGGER sync_stream_url BEFORE INSERT OR UPDATE ON public.live_stream_settings FOR EACH ROW EXECUTE FUNCTION public.sync_stream_url();

-- Reject cross-church links and serialize counter changes to prevent lost updates.
CREATE OR REPLACE FUNCTION public.validate_member_link()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE inviter_church uuid;
BEGIN
 IF NEW.inviter_id IS NOT NULL THEN
 SELECT church_id INTO inviter_church FROM public.inviters WHERE id=NEW.inviter_id;
 IF inviter_church IS DISTINCT FROM NEW.church_id THEN RAISE EXCEPTION 'Member and inviter must belong to the same church'; END IF;
 END IF;
 IF NEW.date_of_birth>current_date THEN RAISE EXCEPTION 'Birth date cannot be in the future'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_member_link ON public.members;
CREATE TRIGGER validate_member_link BEFORE INSERT OR UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.validate_member_link();
CREATE OR REPLACE FUNCTION public.update_registration_totals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP IN ('UPDATE','DELETE') THEN
 UPDATE public.inviters SET invite_count=invite_count-1,confirmed_count=confirmed_count-CASE WHEN OLD.confirmed THEN 1 ELSE 0 END WHERE id=OLD.inviter_id;
 UPDATE public.churches SET confirmed=confirmed-CASE WHEN OLD.confirmed THEN 1 ELSE 0 END WHERE id=OLD.church_id;
 END IF;
 IF TG_OP IN ('INSERT','UPDATE') THEN
 UPDATE public.inviters SET invite_count=invite_count+1,confirmed_count=confirmed_count+CASE WHEN NEW.confirmed THEN 1 ELSE 0 END WHERE id=NEW.inviter_id;
 UPDATE public.churches SET confirmed=confirmed+CASE WHEN NEW.confirmed THEN 1 ELSE 0 END WHERE id=NEW.church_id;
 END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.update_registration_totals() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS update_registration_totals ON public.members;
-- Reconcile stale totals before incremental updates become active.
UPDATE public.inviters i SET invite_count=(SELECT count(*) FROM public.members m WHERE m.inviter_id=i.id),confirmed_count=(SELECT count(*) FROM public.members m WHERE m.inviter_id=i.id AND m.confirmed);
UPDATE public.churches c SET confirmed=(SELECT count(*) FROM public.members m WHERE m.church_id=c.id AND m.confirmed);
CREATE TRIGGER update_registration_totals AFTER INSERT OR UPDATE OR DELETE ON public.members FOR EACH ROW EXECUTE FUNCTION public.update_registration_totals();

CREATE OR REPLACE FUNCTION public.validate_live_vote()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE choices jsonb; active boolean;
BEGIN
 SELECT options,is_active INTO choices,active FROM public.live_polls WHERE id=NEW.poll_id;
 IF active IS DISTINCT FROM true OR jsonb_typeof(choices)<>'array' OR NEW.option_index<0 OR NEW.option_index>=jsonb_array_length(choices) THEN RAISE EXCEPTION 'Invalid or closed poll vote'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_live_vote ON public.live_poll_votes;
CREATE TRIGGER validate_live_vote BEFORE INSERT OR UPDATE ON public.live_poll_votes FOR EACH ROW EXECUTE FUNCTION public.validate_live_vote();

-- Existing auth signup trigger is retained; fresh installations get a safe profile-only trigger.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.profiles(user_id,full_name,username,email)
 VALUES(NEW.id,COALESCE(NEW.raw_user_meta_data->>'full_name',''),
 COALESCE(NULLIF(NEW.raw_user_meta_data->>'username',''),NEW.id::text),COALESCE(NEW.email,''))
 ON CONFLICT(user_id) DO NOTHING;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Restrict the existing deletion RPC; do not recreate or alter managed Auth deletion here.
DO $$ BEGIN
 IF to_regprocedure('public.delete_admin_user(uuid)') IS NOT NULL THEN
 REVOKE ALL ON FUNCTION public.delete_admin_user(uuid) FROM PUBLIC,anon;
 GRANT EXECUTE ON FUNCTION public.delete_admin_user(uuid) TO authenticated,service_role;
 END IF;
END $$;
COMMIT;

