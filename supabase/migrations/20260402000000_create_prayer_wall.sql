-- Create prayer_wall table for community prayer requests and encouragement
CREATE TABLE IF NOT EXISTS public.prayer_wall (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name TEXT NOT NULL DEFAULT 'Anonymous',
  is_anonymous BOOLEAN NOT NULL DEFAULT true,
  category TEXT NOT NULL DEFAULT 'General',
  title TEXT NOT NULL,
  request TEXT NOT NULL,
  praying_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prayer_wall ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Anyone can view prayer wall requests" ON public.prayer_wall
  FOR SELECT USING (true);

-- Allow public/authenticated insert
CREATE POLICY "Anyone can post prayer requests" ON public.prayer_wall
  FOR INSERT WITH CHECK (true);

-- Allow public to increment praying_count
CREATE POLICY "Anyone can update praying_count" ON public.prayer_wall
  FOR UPDATE USING (true);

-- Atomic RPC function to increment praying counter
CREATE OR REPLACE FUNCTION public.increment_prayer_count(request_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.prayer_wall
  SET praying_count = praying_count + 1
  WHERE id = request_id
  RETURNING praying_count INTO new_count;
  
  RETURN new_count;
END;
$$;

-- Seed initial uplifting prayer requests
INSERT INTO public.prayer_wall (author_name, is_anonymous, category, title, request, praying_count)
VALUES 
  ('Anonymous', true, 'Healing', 'Complete Recovery for My Mother', 'Please join me in faith as we pray for total restoration and strength for my mother who is undergoing medical treatment at Korle Bu. We declare complete divine healing!', 14),
  ('Sister F.', false, 'Breakthrough', 'Guidance in Final Year Medical Exams', 'Standing in agreement for divine wisdom, peace of mind, and supernatural memory retention for all final year healthcare students sitting for exams this month.', 28),
  ('Anonymous', true, 'Family', 'Peace & Salvation in My Household', 'Believing God for the salvation of my siblings and restored joy in our home. By faith, every closed door is opening!', 9),
  ('Anonymous', true, 'Spiritual Growth', 'Fresh Passion for Soul Winning', 'Praying for an unquenchable fire for soul winning and kingdom expansion across the entire Korle Bu enclave and Accra.', 35)
ON CONFLICT DO NOTHING;
