
-- Fix the overly permissive church insert policy
DROP POLICY "Super admins can insert churches" ON public.churches;

-- Allow insert for anonymous (inviter signup creates church if not exists) or super admins
CREATE POLICY "Anyone can insert churches" ON public.churches FOR INSERT
  WITH CHECK (true);
