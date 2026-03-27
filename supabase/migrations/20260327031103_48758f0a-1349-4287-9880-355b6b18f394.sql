
-- Create programs table
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
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read programs" ON public.programs FOR SELECT USING (true);
CREATE POLICY "Admins can insert programs" ON public.programs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can update programs" ON public.programs FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can delete programs" ON public.programs FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- Create live_stream_settings table
CREATE TABLE IF NOT EXISTS public.live_stream_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.live_stream_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read live_stream_settings" ON public.live_stream_settings FOR SELECT USING (true);
CREATE POLICY "Admins can insert live_stream_settings" ON public.live_stream_settings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'church_admin'));
CREATE POLICY "Admins can update live_stream_settings" ON public.live_stream_settings FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'church_admin'));

-- Create live_chats table
CREATE TABLE IF NOT EXISTS public.live_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text NOT NULL DEFAULT 'Anonymous',
  message text NOT NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.live_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read live_chats" ON public.live_chats FOR SELECT USING (true);
CREATE POLICY "Anyone can insert live_chats" ON public.live_chats FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update live_chats" ON public.live_chats FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'church_admin'));

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Anyone can insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- Create testimonials table
CREATE TABLE IF NOT EXISTS public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL,
  church_name text DEFAULT '',
  content text NOT NULL,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read approved testimonials" ON public.testimonials FOR SELECT USING (true);
CREATE POLICY "Anyone can insert testimonials" ON public.testimonials FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update testimonials" ON public.testimonials FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can delete testimonials" ON public.testimonials FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- Create bus_points table
CREATE TABLE IF NOT EXISTS public.bus_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL DEFAULT '',
  departure_time text DEFAULT '',
  program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bus_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read bus_points" ON public.bus_points FOR SELECT USING (true);
CREATE POLICY "Admins can insert bus_points" ON public.bus_points FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can update bus_points" ON public.bus_points FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can delete bus_points" ON public.bus_points FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- Create live_presence_events table
CREATE TABLE IF NOT EXISTS public.live_presence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_key text,
  event text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.live_presence_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read live_presence_events" ON public.live_presence_events FOR SELECT USING (true);
CREATE POLICY "Anyone can insert live_presence_events" ON public.live_presence_events FOR INSERT WITH CHECK (true);

-- Create live_presence_samples table
CREATE TABLE IF NOT EXISTS public.live_presence_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count integer NOT NULL DEFAULT 0,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.live_presence_samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read live_presence_samples" ON public.live_presence_samples FOR SELECT USING (true);
CREATE POLICY "Anyone can insert live_presence_samples" ON public.live_presence_samples FOR INSERT WITH CHECK (true);

-- Create live_participants table
CREATE TABLE IF NOT EXISTS public.live_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_key text,
  name text,
  contact text,
  location text,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  joined_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.live_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read live_participants" ON public.live_participants FOR SELECT USING (true);
CREATE POLICY "Anyone can insert live_participants" ON public.live_participants FOR INSERT WITH CHECK (true);
