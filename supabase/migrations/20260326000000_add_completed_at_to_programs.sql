-- Add completed_at column to programs so programs can be marked completed
ALTER TABLE public.programs
ADD COLUMN IF NOT EXISTS completed_at timestamptz NULL;

-- Optionally create an index for queries by completed_at
CREATE INDEX IF NOT EXISTS idx_programs_completed_at ON public.programs (completed_at);
