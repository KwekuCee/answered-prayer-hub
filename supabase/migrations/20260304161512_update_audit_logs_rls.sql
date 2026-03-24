-- Update RLS policies to allow Church Admins to view their own audit logs

BEGIN;

-- Drop existing policy if we need to refine (optional, but we can just add a new one)
-- The "Super admins can view all audit logs" still applies.
-- We are adding a new policy for Church Admins.

CREATE POLICY "Church admins and owners can view their own audit logs"
    ON public.audit_logs
    FOR SELECT
    USING (
        admin_id = auth.uid() OR
        admin_id IN (
            SELECT id FROM public.profiles WHERE user_id = auth.uid()
        )
    );

COMMIT;
