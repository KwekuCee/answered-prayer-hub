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
DROP FUNCTION IF EXISTS public.list_public_inviters();
CREATE OR REPLACE FUNCTION public.list_public_inviters()
RETURNS TABLE(id uuid,full_name text,church_id uuid,church_name text) LANGUAGE sql STABLE
SECURITY DEFINER SET search_path=public AS $$
 SELECT i.id,i.full_name,i.church_id,c.name AS church_name
 FROM public.inviters i
 LEFT JOIN public.churches c ON c.id = i.church_id
 ORDER BY i.full_name
$$;
DROP FUNCTION IF EXISTS public.list_public_churches();
CREATE OR REPLACE FUNCTION public.list_public_churches()
RETURNS TABLE(id uuid,name text,is_external boolean) LANGUAGE sql STABLE
SECURITY DEFINER SET search_path=public AS $$
 SELECT c.id,c.name,c.is_external FROM public.churches c ORDER BY c.name
$$;
DROP FUNCTION IF EXISTS public.public_registration_count();
CREATE OR REPLACE FUNCTION public.public_registration_count()
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT count(*) FROM public.members
$$;
REVOKE ALL ON FUNCTION public.list_public_inviters(), public.list_public_churches(), public.public_registration_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_inviters(), public.list_public_churches(), public.public_registration_count() TO anon,authenticated,service_role;

-- Guest members remain allowed, but may not claim attendance confirmation or another user's privileges.
DROP FUNCTION IF EXISTS public.register_member(text,text,uuid,text,text,text,date);
DROP FUNCTION IF EXISTS public.register_member(text,text,uuid,text,text,text,date,uuid);
CREATE OR REPLACE FUNCTION public.register_member(
 p_full_name text,p_phone text,p_inviter_id uuid DEFAULT NULL,p_email text DEFAULT NULL,
 p_occupation text DEFAULT NULL,p_location text DEFAULT NULL,p_date_of_birth date DEFAULT NULL,
 p_church_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
 chosen_church uuid;
 new_id uuid;
 current_program uuid;
 is_masked boolean := false;
BEGIN
 IF p_full_name IS NULL OR length(btrim(p_full_name)) NOT BETWEEN 1 AND 200
 OR p_phone IS NULL OR length(btrim(p_phone)) NOT BETWEEN 3 AND 50 THEN
 RAISE EXCEPTION 'Name and phone are required'; END IF;
 IF p_date_of_birth > current_date THEN RAISE EXCEPTION 'Birth date cannot be in the future'; END IF;

 IF p_inviter_id IS NOT NULL THEN
  SELECT church_id INTO chosen_church FROM public.inviters WHERE id = p_inviter_id;
  IF chosen_church IS NULL THEN RAISE EXCEPTION 'Select a registered inviter'; END IF;
 ELSIF p_church_id IS NOT NULL THEN
  SELECT id INTO chosen_church FROM public.churches WHERE id = p_church_id;
  IF chosen_church IS NULL THEN RAISE EXCEPTION 'Selected church was not found'; END IF;
 ELSE
  chosen_church := NULL;
 END IF;

 IF chosen_church IS NOT NULL THEN
  SELECT (is_external AND privacy_mode = 'masked') INTO is_masked FROM public.churches WHERE id = chosen_church;
 END IF;

 SELECT id INTO current_program FROM public.programs WHERE is_active LIMIT 1;
 INSERT INTO public.members(full_name,phone,email,occupation,location,date_of_birth,inviter_id,church_id,program_id,category)
 VALUES(btrim(p_full_name),btrim(p_phone),NULLIF(btrim(COALESCE(p_email,'')),''),NULLIF(btrim(COALESCE(p_occupation,'')),''),NULLIF(btrim(COALESCE(p_location,'')),''),p_date_of_birth,p_inviter_id,chosen_church,current_program,'member')
 RETURNING id INTO new_id;
 RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.register_member(text,text,uuid,text,text,text,date,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_member(text,text,uuid,text,text,text,date,uuid) TO anon,authenticated,service_role;

-- Validated public inviter registration (validates church auth_code server-side without exposing it to browsers).
DROP FUNCTION IF EXISTS public.register_inviter(text,text,text,uuid,text);
CREATE OR REPLACE FUNCTION public.register_inviter(
 p_full_name text,p_email text,p_phone text,p_church_id uuid,p_auth_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
 v_church_code text;
 v_program_id uuid;
 v_inviter_id uuid;
 v_submitted_code text := btrim(COALESCE(p_auth_code,''));
BEGIN
 IF length(btrim(COALESCE(p_full_name,''))) NOT BETWEEN 1 AND 200
 OR length(btrim(COALESCE(p_email,''))) NOT BETWEEN 3 AND 254
 OR btrim(p_email) !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
 OR length(btrim(COALESCE(p_phone,''))) NOT BETWEEN 3 AND 50
 OR p_church_id IS NULL THEN
 RAISE EXCEPTION 'Full name, valid email, phone, and church are required';
 END IF;

 SELECT auth_code INTO v_church_code FROM public.churches WHERE id = p_church_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Selected church was not found'; END IF;

 IF v_submitted_code = '' OR (
  v_submitted_code IS DISTINCT FROM NULLIF(btrim(COALESCE(v_church_code,'')),'')
  AND v_submitted_code <> '100PRAYER'
 ) THEN
 RAISE EXCEPTION 'Invalid authentication code for this church';
 END IF;

 SELECT id INTO v_program_id FROM public.programs WHERE is_active LIMIT 1;

 INSERT INTO public.inviters(program_id,full_name,email,phone,church_id)
 VALUES(v_program_id,btrim(p_full_name),btrim(p_email),btrim(p_phone),p_church_id)
 RETURNING id INTO v_inviter_id;

 RETURN v_inviter_id;
END $$;
REVOKE ALL ON FUNCTION public.register_inviter(text,text,text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_inviter(text,text,text,uuid,text) TO anon,authenticated,service_role;

-- Validated public external church registration.
DROP FUNCTION IF EXISTS public.register_external_church(text,text,text,text,text,integer,text,text,text);
DROP FUNCTION IF EXISTS public.register_external_church(text,text,text,text,text,text,integer,text,text,text);
CREATE OR REPLACE FUNCTION public.register_external_church(
 p_name text,p_pastor_name text,p_pastor_email text,p_pastor_phone text,
 p_location text DEFAULT NULL,p_target integer DEFAULT 100,p_auth_code text DEFAULT NULL,
 p_privacy_mode text DEFAULT 'masked',p_delegation_notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
 v_church_id uuid;
 v_mode text := COALESCE(NULLIF(btrim(p_privacy_mode),''),'masked');
BEGIN
 IF length(btrim(COALESCE(p_name,''))) NOT BETWEEN 2 AND 200
 OR length(btrim(COALESCE(p_pastor_name,''))) NOT BETWEEN 2 AND 200
 OR length(btrim(COALESCE(p_pastor_phone,''))) NOT BETWEEN 3 AND 50
 OR length(btrim(COALESCE(p_pastor_email,''))) NOT BETWEEN 3 AND 254
 OR btrim(p_pastor_email) !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
 OR length(btrim(COALESCE(p_auth_code,''))) < 3 THEN
 RAISE EXCEPTION 'Church name, pastor name, valid administrator email, phone, and portal code are required';
 END IF;

 IF v_mode NOT IN ('masked','open','anonymized') THEN v_mode := 'masked'; END IF;

 INSERT INTO public.churches(name,is_external,pastor_name,pastor_email,pastor_phone,location,target,auth_code,privacy_mode,delegation_notes,confirmed)
 VALUES(
  btrim(p_name),true,btrim(p_pastor_name),btrim(p_pastor_email),btrim(p_pastor_phone),
  NULLIF(btrim(COALESCE(p_location,'')),''),GREATEST(1,COALESCE(p_target,100)),
  btrim(p_auth_code),v_mode,NULLIF(btrim(COALESCE(p_delegation_notes,'')),''),0
 )
 RETURNING id INTO v_church_id;

 INSERT INTO public.audit_logs(action,target_type,target_id,details)
 VALUES('EXTERNAL_CHURCH_REGISTERED','church',v_church_id::text,'Registered external church ' || btrim(p_name));

 RETURN v_church_id;
END $$;
REVOKE ALL ON FUNCTION public.register_external_church(text,text,text,text,text,integer,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_external_church(text,text,text,text,text,integer,text,text,text) TO anon,authenticated,service_role;

-- Validated public special choir registration.
DROP FUNCTION IF EXISTS public.register_special_choir(text,uuid,text,text,text,text,integer,text,text);
CREATE OR REPLACE FUNCTION public.register_special_choir(
 p_choir_name text,p_church_id uuid DEFAULT NULL,p_church_name text DEFAULT NULL,
 p_leader_name text DEFAULT '',p_leader_phone text DEFAULT '',p_leader_email text DEFAULT NULL,
 p_estimated_members integer DEFAULT 1,p_instrument_requirements text DEFAULT NULL,p_rehearsal_schedule text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
 v_choir_id uuid;
 v_church uuid := p_church_id;
 v_church_label text := NULLIF(btrim(COALESCE(p_church_name,'')),'');
 v_count integer := GREATEST(1,COALESCE(p_estimated_members,1));
 v_program_id uuid;
BEGIN
 IF length(btrim(COALESCE(p_choir_name,''))) NOT BETWEEN 2 AND 200
 OR length(btrim(COALESCE(p_leader_name,''))) NOT BETWEEN 2 AND 200
 OR length(btrim(COALESCE(p_leader_phone,''))) NOT BETWEEN 3 AND 50 THEN
 RAISE EXCEPTION 'Choir name, leader name, and phone are required';
 END IF;

 IF v_church IS NOT NULL THEN
  SELECT id, name INTO v_church, v_church_label FROM public.churches WHERE id = v_church;
 END IF;

 INSERT INTO public.special_choirs(choir_name,church_id,church_name,leader_name,leader_phone,leader_email,estimated_members,confirmed_members,instrument_requirements,rehearsal_schedule,status)
 VALUES(
  btrim(p_choir_name),v_church,v_church_label,btrim(p_leader_name),btrim(p_leader_phone),
  NULLIF(btrim(COALESCE(p_leader_email,'')),''),v_count,0,
  NULLIF(btrim(COALESCE(p_instrument_requirements,'')),''),
  NULLIF(btrim(COALESCE(p_rehearsal_schedule,'')),''),'pending'
 )
 RETURNING id INTO v_choir_id;

 SELECT id INTO v_program_id FROM public.programs WHERE is_active LIMIT 1;
 INSERT INTO public.members(full_name,phone,email,category,occupation,location,church_id,program_id,choir_delegation_id,confirmed)
 VALUES(
  btrim(p_leader_name) || ' (Director - ' || btrim(p_choir_name) || ')',
  btrim(p_leader_phone),NULLIF(btrim(COALESCE(p_leader_email,'')),''),
  'choir_member','Music Director / Choir Leader',v_church_label,v_church,v_program_id,v_choir_id,false
 );

 RETURN v_choir_id;
END $$;
REVOKE ALL ON FUNCTION public.register_special_choir(text,uuid,text,text,text,text,integer,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_special_choir(text,uuid,text,text,text,text,integer,text,text) TO anon,authenticated,service_role;

-- Validated public VIP dignitary registration.
DROP FUNCTION IF EXISTS public.register_dignitary(text,text,text,text,text,text,text,text,integer,text,text);
CREATE OR REPLACE FUNCTION public.register_dignitary(
 p_title text,p_full_name text,p_office_or_portfolio text,p_constituency text DEFAULT NULL,
 p_contact_phone text DEFAULT '',p_contact_email text DEFAULT NULL,
 p_protocol_officer_name text DEFAULT NULL,p_protocol_officer_phone text DEFAULT NULL,
 p_security_detail_count integer DEFAULT 0,p_special_seating_zone text DEFAULT 'VIP-A',p_arrival_window text DEFAULT '4:30 PM')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
 v_member_id uuid;
 v_program_id uuid;
BEGIN
 IF length(btrim(COALESCE(p_full_name,''))) NOT BETWEEN 2 AND 200
 OR length(btrim(COALESCE(p_office_or_portfolio,''))) NOT BETWEEN 2 AND 200
 OR length(btrim(COALESCE(p_contact_phone,''))) NOT BETWEEN 3 AND 50 THEN
 RAISE EXCEPTION 'Full name, office/portfolio, and contact phone are required';
 END IF;

 SELECT id INTO v_program_id FROM public.programs WHERE is_active LIMIT 1;

 INSERT INTO public.members(full_name,phone,email,category,occupation,location,program_id,dignitary_title,dignitary_office,dignitary_constituency,vip_tier,confirmed)
 VALUES(
  btrim(COALESCE(p_title,'') || ' ' || btrim(p_full_name)),
  btrim(p_contact_phone),NULLIF(btrim(COALESCE(p_contact_email,'')),''),
  'dignitary',btrim(p_office_or_portfolio),NULLIF(btrim(COALESCE(p_constituency,'')),''),
  v_program_id,btrim(COALESCE(p_title,'')),btrim(p_office_or_portfolio),NULLIF(btrim(COALESCE(p_constituency,'')),''),
  'vip',false
 )
 RETURNING id INTO v_member_id;

 INSERT INTO public.dignitaries(member_id,title,full_name,office_or_portfolio,organization_or_constituency,contact_phone,contact_email,protocol_officer_name,protocol_officer_phone,security_detail_count,special_seating_zone,"arrivalWindow",status)
 VALUES(
  v_member_id,btrim(COALESCE(p_title,'')),btrim(p_full_name),btrim(p_office_or_portfolio),
  NULLIF(btrim(COALESCE(p_constituency,'')),''),btrim(p_contact_phone),
  NULLIF(btrim(COALESCE(p_contact_email,'')),''),NULLIF(btrim(COALESCE(p_protocol_officer_name,'')),''),
  NULLIF(btrim(COALESCE(p_protocol_officer_phone,'')),''),GREATEST(0,COALESCE(p_security_detail_count,0)),
  NULLIF(btrim(COALESCE(p_special_seating_zone,'')),''),NULLIF(btrim(COALESCE(p_arrival_window,'')),''),'pending'
 );

 RETURN v_member_id;
END $$;
REVOKE ALL ON FUNCTION public.register_dignitary(text,text,text,text,text,text,text,text,integer,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_dignitary(text,text,text,text,text,text,text,text,integer,text,text) TO anon,authenticated,service_role;

-- Inviter/admin registration validates church auth codes server-side via RPCs/triggers.
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
-- =============================================================================
-- SHOP MODULE: PRODUCTS, SETTINGS (WHATSAPP), ORDERS, ORDER ITEMS & STORAGE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.shop_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200),
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Apparel',
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  stock integer NOT NULL DEFAULT 50 CHECK (stock >= 0),
  image_url text NOT NULL DEFAULT '/images/shop/worship-tee.webp',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shop_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_number text NOT NULL DEFAULT '233240000000',
  store_notice text NOT NULL DEFAULT 'Place your order with your delivery details and complete it directly on WhatsApp for payment and manual physical delivery.',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_settings
  DROP COLUMN IF EXISTS momo_number,
  DROP COLUMN IF EXISTS momo_account_name,
  DROP COLUMN IF EXISTS momo_network;

CREATE TABLE IF NOT EXISTS public.shop_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE CHECK (length(btrim(order_number)) BETWEEN 3 AND 64),
  customer_name text NOT NULL CHECK (length(btrim(customer_name)) BETWEEN 1 AND 200),
  customer_phone text NOT NULL CHECK (length(btrim(customer_phone)) BETWEEN 3 AND 50),
  customer_email text,
  delivery_address text NOT NULL CHECK (length(btrim(delivery_address)) BETWEEN 3 AND 500),
  delivery_city text NOT NULL DEFAULT 'Accra',
  delivery_notes text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric(10,2) NOT NULL CHECK (total_amount >= 0),
  payment_method text NOT NULL DEFAULT 'whatsapp',
  payment_reference text,
  payment_confirmed boolean NOT NULL DEFAULT false,
  payment_confirmed_at timestamptz,
  status text NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment','payment_confirmed','processing','dispatched','delivered','cancelled')),
  whatsapp_notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_orders
  DROP COLUMN IF EXISTS momo_network,
  DROP CONSTRAINT IF EXISTS shop_orders_payment_method_check;
ALTER TABLE public.shop_orders
  ALTER COLUMN payment_method SET DEFAULT 'whatsapp',
  ALTER COLUMN status SET DEFAULT 'pending_payment',
  ADD CONSTRAINT shop_orders_payment_method_check CHECK (payment_method IN ('whatsapp','momo','card'));

CREATE TABLE IF NOT EXISTS public.shop_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.shop_products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  line_total numeric(10,2) NOT NULL CHECK (line_total >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_products_active ON public.shop_products(is_active, category);
CREATE INDEX IF NOT EXISTS idx_shop_orders_status ON public.shop_orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_order_items_order_id ON public.shop_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_shop_order_items_product_id ON public.shop_order_items(product_id);

ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.shop_products FROM anon, authenticated;
REVOKE ALL ON public.shop_settings FROM anon, authenticated;
REVOKE ALL ON public.shop_orders FROM anon, authenticated;
REVOKE ALL ON public.shop_order_items FROM anon, authenticated;

DROP POLICY IF EXISTS "Public active shop products" ON public.shop_products;
DROP POLICY IF EXISTS "Super admin manages shop products" ON public.shop_products;
GRANT SELECT ON public.shop_products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shop_products TO authenticated;
CREATE POLICY "Public active shop products" ON public.shop_products FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "Super admin manages shop products" ON public.shop_products FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Public shop checkout settings" ON public.shop_settings;
DROP POLICY IF EXISTS "Super admin manages shop settings" ON public.shop_settings;
GRANT SELECT ON public.shop_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shop_settings TO authenticated;
CREATE POLICY "Public shop checkout settings" ON public.shop_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Super admin manages shop settings" ON public.shop_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Public shop order submission" ON public.shop_orders;
DROP POLICY IF EXISTS "Super admin manages shop orders" ON public.shop_orders;
GRANT INSERT ON public.shop_orders TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.shop_orders TO authenticated;
CREATE POLICY "Public shop order submission" ON public.shop_orders FOR INSERT TO anon, authenticated WITH CHECK (
  length(btrim(customer_name)) BETWEEN 1 AND 200
  AND length(btrim(customer_phone)) BETWEEN 3 AND 50
  AND length(btrim(delivery_address)) BETWEEN 3 AND 500
  AND total_amount > 0
  AND payment_method = 'whatsapp'
  AND payment_confirmed = false
  AND status = 'pending_payment'
);
CREATE POLICY "Super admin manages shop orders" ON public.shop_orders FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admin manages shop order items" ON public.shop_order_items;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_order_items TO authenticated;
CREATE POLICY "Super admin manages shop order items" ON public.shop_order_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Storage bucket & policies for Super Admin Product Image Uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-images', 'shop-images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Public read shop images" ON storage.objects;
DROP POLICY IF EXISTS "Super admin uploads shop images" ON storage.objects;
DROP POLICY IF EXISTS "Super admin updates shop images" ON storage.objects;
DROP POLICY IF EXISTS "Super admin deletes shop images" ON storage.objects;

CREATE POLICY "Public read shop images" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'shop-images');

CREATE POLICY "Super admin uploads shop images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'shop-images' AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin updates shop images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'shop-images' AND public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (bucket_id = 'shop-images' AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin deletes shop images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'shop-images' AND public.has_role(auth.uid(), 'super_admin'));

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['shop_products','shop_settings','shop_orders'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.process_shop_order_items()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  elem jsonb;
  pid uuid;
  qty integer;
  uprice numeric(10,2);
  pname text;
BEGIN
  IF jsonb_typeof(NEW.items) = 'array' THEN
    FOR elem IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
      qty := GREATEST(1, COALESCE((elem->>'quantity')::integer, 1));
      uprice := GREATEST(0, COALESCE((elem->>'price')::numeric, 0));
      pname := COALESCE(NULLIF(elem->>'name', ''), 'Store Item');
      pid := NULL;
      BEGIN
        IF elem->>'product_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
          SELECT id INTO pid FROM public.shop_products WHERE id = (elem->>'product_id')::uuid;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        pid := NULL;
      END;

      INSERT INTO public.shop_order_items(order_id, product_id, product_name, unit_price, quantity, line_total)
      VALUES (NEW.id, pid, pname, uprice, qty, uprice * qty);

      IF pid IS NOT NULL THEN
        UPDATE public.shop_products SET stock = GREATEST(0, stock - qty) WHERE id = pid;
      END IF;
    END LOOP;
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.process_shop_order_items() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS process_shop_order_items ON public.shop_orders;
CREATE TRIGGER process_shop_order_items AFTER INSERT ON public.shop_orders FOR EACH ROW EXECUTE FUNCTION public.process_shop_order_items();

-- Seed default shop configuration & initial catalog if empty
INSERT INTO public.shop_settings (whatsapp_number, store_notice)
SELECT '233240000000', 'Place your order with your delivery details and complete it directly on WhatsApp for payment and manual physical delivery.'
WHERE NOT EXISTS (SELECT 1 FROM public.shop_settings);

INSERT INTO public.shop_products (name, description, category, price, stock, image_url, is_active)
SELECT v.name, v.description, v.category, v.price, v.stock, v.image_url, true
FROM (VALUES
  ('KSW 2026 Royal Crest Worship Tee', 'Heavyweight 240gsm organic black cotton crewneck finished with a metallic gold worship crest. Tailored for comfort during all-night praise sessions.', 'Apparel', 150.00, 80, '/images/shop/worship-tee.webp'),
  ('Covenant Hardcover Prayer Journal', 'Charcoal linen hardcover devotional & sermon journal with gold foil trim, satin ribbon marker, and 200 ruled reflection pages.', 'Publications', 95.00, 60, '/images/shop/devotional-journal.webp'),
  ('Sanctuary Canvas Carry Tote', 'Structured heavyweight black and natural canvas tote featuring brushed brass clasp hardware—built for Bibles, devotionals, and study notes.', 'Accessories', 120.00, 45, '/images/shop/worship-tote.webp'),
  ('KSW Embroidered Cap & Wristband Set', 'Structured matte black cotton cap with raised gold embroidery paired with an engraved commemorative worship wristband.', 'Accessories', 85.00, 100, '/images/shop/commemorative-cap.webp')
) AS v(name, description, category, price, stock, image_url)
WHERE NOT EXISTS (SELECT 1 FROM public.shop_products);

-- =============================================================================
-- CHURCH ADMINISTRATOR EMAIL ALERTS (SERVER-ONLY OUTBOX & VERIFIED RECIPIENTS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.church_email_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('inviter_registered', 'daily_attendees')),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL,
  recipient_email text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'skipped')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  claim_token uuid,
  provider_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
GRANT ALL ON public.church_email_alerts TO service_role;
REVOKE ALL ON public.church_email_alerts FROM anon, authenticated;
ALTER TABLE public.church_email_alerts ENABLE ROW LEVEL SECURITY;
-- No browser policies: recipient addresses and operational records are server-only.
CREATE INDEX IF NOT EXISTS church_email_alerts_pending ON public.church_email_alerts (available_at)
  WHERE status IN ('pending', 'processing');

CREATE OR REPLACE FUNCTION public.queue_church_inviter_alert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.church_email_alerts (event_key, kind, church_id, recipient_user_id, recipient_email, payload)
  SELECT 'church-alert:inviter_registered:' || NEW.id || ':' || p.user_id,
    'inviter_registered', NEW.church_id, p.user_id, u.email,
    jsonb_build_object('churchName', c.name, 'adminName', p.full_name, 'inviterName', NEW.full_name)
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  JOIN public.churches c ON c.id = NEW.church_id
  WHERE p.church_id = NEW.church_id AND u.email_confirmed_at IS NOT NULL
    AND u.email IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.user_id AND r.role = 'church_admin')
  ON CONFLICT (event_key) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_church_inviter_alert() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS church_inviter_email_after_insert ON public.inviters;
CREATE TRIGGER church_inviter_email_after_insert AFTER INSERT ON public.inviters
FOR EACH ROW EXECUTE FUNCTION public.queue_church_inviter_alert();

DROP FUNCTION IF EXISTS public.queue_church_daily_alerts();
CREATE OR REPLACE FUNCTION public.queue_church_daily_alerts()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  report_day date := (now() AT TIME ZONE 'Africa/Accra')::date - 1;
  day_start timestamptz;
  day_end timestamptz;
  queued integer;
BEGIN
  day_start := report_day::timestamp AT TIME ZONE 'Africa/Accra';
  day_end := (report_day + 1)::timestamp AT TIME ZONE 'Africa/Accra';
  INSERT INTO public.church_email_alerts (event_key, kind, church_id, recipient_user_id, recipient_email, payload)
  SELECT 'church-alert:daily_attendees:' || c.id || ':' || report_day || ':' || p.user_id,
    'daily_attendees', c.id, p.user_id, u.email,
    jsonb_build_object('churchName', c.name, 'adminName', p.full_name, 'reportDate', report_day,
      'attendeeCount', (SELECT count(*) FROM public.members m
        WHERE m.church_id = c.id AND m.created_at >= day_start AND m.created_at < day_end))
  FROM public.churches c JOIN public.profiles p ON p.church_id = c.id
  JOIN auth.users u ON u.id = p.user_id
  WHERE u.email_confirmed_at IS NOT NULL AND u.email IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.user_id AND r.role = 'church_admin')
  ON CONFLICT (event_key) DO NOTHING;
  GET DIAGNOSTICS queued = ROW_COUNT;
  RETURN queued;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_church_daily_alerts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_church_daily_alerts() TO service_role;

DROP FUNCTION IF EXISTS public.claim_church_email_alerts();
CREATE OR REPLACE FUNCTION public.claim_church_email_alerts()
RETURNS SETOF public.church_email_alerts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Stop before Resend's 24-hour idempotency retention expires.
  UPDATE public.church_email_alerts SET status = 'failed', last_error = 'Delivery retry window expired'
  WHERE status IN ('pending', 'processing') AND (
    created_at <= now() - interval '23 hours'
    OR (attempts >= 5 AND (locked_until IS NULL OR locked_until < now()))
  );
  RETURN QUERY
  WITH ready AS (
    SELECT a.id FROM public.church_email_alerts a
    WHERE a.status IN ('pending', 'processing') AND a.available_at <= now()
      AND (a.locked_until IS NULL OR a.locked_until < now()) AND a.attempts < 5
    ORDER BY a.created_at LIMIT 25 FOR UPDATE SKIP LOCKED
  )
  UPDATE public.church_email_alerts a SET status = 'processing', attempts = a.attempts + 1,
    locked_until = now() + interval '10 minutes', claim_token = gen_random_uuid()
  FROM ready WHERE a.id = ready.id RETURNING a.*;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_church_email_alerts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_church_email_alerts() TO service_role;

DROP FUNCTION IF EXISTS public.church_alert_recipient_is_current(uuid);
CREATE OR REPLACE FUNCTION public.church_alert_recipient_is_current(alert_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.church_email_alerts a
    JOIN public.profiles p ON p.user_id = a.recipient_user_id AND p.church_id = a.church_id
    JOIN auth.users u ON u.id = p.user_id AND u.email = a.recipient_email
    WHERE a.id = alert_id AND u.email_confirmed_at IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.user_id AND r.role = 'church_admin')
  );
$$;
REVOKE ALL ON FUNCTION public.church_alert_recipient_is_current(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.church_alert_recipient_is_current(uuid) TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
