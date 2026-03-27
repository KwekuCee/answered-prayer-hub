-- Create resources table for managing uploaded files (PDFs, music, videos, etc.)
CREATE TABLE IF NOT EXISTS public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL, -- 'pdf', 'audio', 'video', 'document', etc.
  mime_type text NOT NULL,
  category text DEFAULT 'general', -- 'prayer_guide', 'study_material', 'music', 'video', 'testimony', etc.
  is_public boolean NOT NULL DEFAULT true,
  download_count integer NOT NULL DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_resources_category ON public.resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_file_type ON public.resources(file_type);
CREATE INDEX IF NOT EXISTS idx_resources_is_public ON public.resources(is_public);

-- Enable RLS
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read public resources" ON public.resources FOR SELECT USING (is_public = true);
CREATE POLICY "Admins can read all resources" ON public.resources FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'church_admin'));
CREATE POLICY "Admins can insert resources" ON public.resources FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'church_admin'));
CREATE POLICY "Admins can update resources" ON public.resources FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'church_admin'));
CREATE POLICY "Admins can delete resources" ON public.resources FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'church_admin'));

-- Function to increment download count
CREATE OR REPLACE FUNCTION public.increment_download_count(resource_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.resources
  SET download_count = download_count + 1
  WHERE id = resource_id;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();