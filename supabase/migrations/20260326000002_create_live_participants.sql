-- Table to store brief participant info collected before watching the stream
CREATE TABLE IF NOT EXISTS public.live_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_key text UNIQUE,
  name text NOT NULL,
  contact text,
  location text,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  joined_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_participants_program_joined ON public.live_participants (program_id, joined_at DESC);
