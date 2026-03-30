-- =============================================================
-- my_all.sql — Complete database schema for 100% Answered Prayer
-- Run this against a fresh Supabase/Postgres database to set up
-- all tables, enums, functions, triggers, and RLS policies.
-- =============================================================

-- ========================
-- 1. ENUMS
-- ========================
CREATE TYPE public.app_role AS ENUM ('super_admin', 'church_admin');

-- ========================
-- 2. TABLES
-- ========================

-- Churches
CREATE TABLE IF NOT EXISTS public.churches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  target integer NOT NULL DEFAULT 100,
  confirmed integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- User profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  church_id uuid REFERENCES public.churches(id),
  full_name text NOT NULL,
  username text NOT NULL,
  email text NOT NULL,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User roles (admin/super_admin assignments)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Programs (event/campaign management)
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

-- Inviters (people who invite members)
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

-- Members (registered attendees)
CREATE TABLE IF NOT EXISTS public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id),
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

-- Live stream settings (singleton-style, latest row wins)
CREATE TABLE IF NOT EXISTS public.live_stream_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Live chat messages
CREATE TABLE IF NOT EXISTS public.live_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text NOT NULL DEFAULT 'Anonymous',
  message text NOT NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Testimonials
CREATE TABLE IF NOT EXISTS public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL,
  church_name text DEFAULT '',
  content text NOT NULL,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Bus pickup points
CREATE TABLE IF NOT EXISTS public.bus_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL DEFAULT '',
  departure_time text DEFAULT '',
  program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Live presence events (viewer join/leave tracking)
CREATE TABLE IF NOT EXISTS public.live_presence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_key text,
  event text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Live presence samples (periodic viewer count snapshots)
CREATE TABLE IF NOT EXISTS public.live_presence_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count integer NOT NULL DEFAULT 0,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

-- Live participants (viewers who filled in details)
CREATE TABLE IF NOT EXISTS public.live_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_key text,
  name text,
  contact text,
  location text,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  joined_at timestamptz NOT NULL DEFAULT now()
);
-- Live stream watchers (persistent viewer tracking)
CREATE TABLE IF NOT EXISTS public.live_stream_watchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);


-- 3. FUNCTIONS
-- ========================

-- Check if a user has a specific role (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Auto-create profile on new auth user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- ========================
-- 4. TRIGGERS
-- ========================

-- Auto-update updated_at on churches
CREATE TRIGGER update_churches_updated_at
  BEFORE UPDATE ON public.churches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-update updated_at on programs
CREATE TRIGGER update_programs_updated_at
  BEFORE UPDATE ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-update updated_at on live_stream_settings
CREATE TRIGGER update_live_stream_settings_updated_at
  BEFORE UPDATE ON public.live_stream_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on auth signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================
-- 5. ROW LEVEL SECURITY
-- ========================

-- Enable RLS on all tables
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inviters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_stream_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_presence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_presence_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_stream_watchers ENABLE ROW LEVEL SECURITY;

-- CHURCHES
CREATE POLICY "Anyone can read churches" ON public.churches FOR SELECT USING (true);
CREATE POLICY "Anyone can insert churches" ON public.churches FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update churches" ON public.churches FOR UPDATE USING (has_role(auth.uid(), 'super_admin'));

-- PROFILES
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Super admins can read all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- USER ROLES
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Super admins can read all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- PROGRAMS
CREATE POLICY "Anyone can read programs" ON public.programs FOR SELECT USING (true);
CREATE POLICY "Admins can insert programs" ON public.programs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can update programs" ON public.programs FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can delete programs" ON public.programs FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- INVITERS
CREATE POLICY "Anyone can read inviters" ON public.inviters FOR SELECT USING (true);
CREATE POLICY "Anyone can create inviters" ON public.inviters FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update inviters" ON public.inviters FOR UPDATE USING (has_role(auth.uid(), 'church_admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can delete inviters" ON public.inviters FOR DELETE USING (has_role(auth.uid(), 'church_admin') OR has_role(auth.uid(), 'super_admin'));

-- MEMBERS
CREATE POLICY "Anyone can read members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Anyone can create members" ON public.members FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update members" ON public.members FOR UPDATE USING (has_role(auth.uid(), 'church_admin') OR has_role(auth.uid(), 'super_admin'));

-- LIVE STREAM SETTINGS
CREATE POLICY "Anyone can read live_stream_settings" ON public.live_stream_settings FOR SELECT USING (true);
CREATE POLICY "Admins can insert live_stream_settings" ON public.live_stream_settings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'church_admin'));
CREATE POLICY "Admins can update live_stream_settings" ON public.live_stream_settings FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'church_admin'));

-- LIVE CHATS
CREATE POLICY "Anyone can read live_chats" ON public.live_chats FOR SELECT USING (true);
CREATE POLICY "Anyone can insert live_chats" ON public.live_chats FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update live_chats" ON public.live_chats FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'church_admin'));

-- AUDIT LOGS
CREATE POLICY "Admins can read audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Anyone can insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- TESTIMONIALS
CREATE POLICY "Anyone can read testimonials" ON public.testimonials FOR SELECT USING (true);
CREATE POLICY "Anyone can insert testimonials" ON public.testimonials FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update testimonials" ON public.testimonials FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can delete testimonials" ON public.testimonials FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- BUS POINTS
CREATE POLICY "Anyone can read bus_points" ON public.bus_points FOR SELECT USING (true);
CREATE POLICY "Admins can insert bus_points" ON public.bus_points FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can update bus_points" ON public.bus_points FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can delete bus_points" ON public.bus_points FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- LIVE PRESENCE EVENTS
CREATE POLICY "Anyone can read live_presence_events" ON public.live_presence_events FOR SELECT USING (true);
CREATE POLICY "Anyone can insert live_presence_events" ON public.live_presence_events FOR INSERT WITH CHECK (true);

-- LIVE PRESENCE SAMPLES
CREATE POLICY "Anyone can read live_presence_samples" ON public.live_presence_samples FOR SELECT USING (true);
CREATE POLICY "Anyone can insert live_presence_samples" ON public.live_presence_samples FOR INSERT WITH CHECK (true);

-- LIVE PARTICIPANTS
CREATE POLICY "Anyone can read live_participants" ON public.live_participants FOR SELECT USING (true);
CREATE POLICY "Anyone can insert live_participants" ON public.live_participants FOR INSERT WITH CHECK (true);

-- ========================
-- 6. REALTIME (optional)
-- ========================
-- Enable realtime for live features
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_stream_settings;
