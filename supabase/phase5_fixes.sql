-- =========================================================================
-- Korle Bu Stands in Worship: Phase 5 Upgrades
-- =========================================================================

-- 1. Ensure `program_id` is tracked dynamically for all Registrations
-- By appending these columns, the frontend will be able to effortlessly isolate analytics
-- specifically per active event!

ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL;

ALTER TABLE public.inviters 
ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL;

-- 2. Ensure RLS limits stay tight (Optional safety net)
-- Let's make absolutely sure your Admins are allowed to read the audit_logs!
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() 
    AND role IN ('super_admin', 'church_admin')
  )
);
