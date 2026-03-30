
-- Create live_stream_watchers table for persistent viewer tracking
CREATE TABLE IF NOT EXISTS public.live_stream_watchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.live_stream_watchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "watchers_read" ON public.live_stream_watchers FOR SELECT USING (true);
CREATE POLICY "watchers_insert" ON public.live_stream_watchers FOR INSERT WITH CHECK (true);
CREATE POLICY "watchers_update" ON public.live_stream_watchers FOR UPDATE USING (true);

-- Create resources storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('resources', 'resources', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "resources_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'resources');
CREATE POLICY "resources_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'resources');
CREATE POLICY "resources_update" ON storage.objects FOR UPDATE USING (bucket_id = 'resources');
CREATE POLICY "resources_delete" ON storage.objects FOR DELETE USING (bucket_id = 'resources');
