-- Create tables to persist presence events and periodic samples for live analytics
CREATE TABLE IF NOT EXISTS public.live_presence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  viewer_key text,
  event text NOT NULL CHECK (event IN ('join','leave')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_presence_events_program_created ON public.live_presence_events (program_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.live_presence_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  count integer NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_presence_samples_program_recorded ON public.live_presence_samples (program_id, recorded_at DESC);
