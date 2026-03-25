-- Phase 1 Features: Prayer Requests (Update) & Live Stream Settings

-- 1. Update Existing 'prayer_points' Table
-- Add status tracking column to track whether a request has been prayed for
ALTER TABLE IF EXISTS public.prayer_points
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- 2. Create live_stream_settings table (Single row table)
CREATE TABLE IF NOT EXISTS public.live_stream_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.live_stream_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view live stream settings
CREATE POLICY "Anyone can read live stream settings" ON public.live_stream_settings
  FOR SELECT USING (true);

-- Only Super Admins can update live stream settings
CREATE POLICY "Super admins can update live stream settings" ON public.live_stream_settings
  FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can insert live stream settings" ON public.live_stream_settings
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Trigger to update updated_at automatically
CREATE TRIGGER update_live_stream_settings_updated_at
  BEFORE UPDATE ON public.live_stream_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial empty config if not exists
INSERT INTO public.live_stream_settings (is_active, url) 
SELECT false, '' 
WHERE NOT EXISTS (SELECT 1 FROM public.live_stream_settings);
