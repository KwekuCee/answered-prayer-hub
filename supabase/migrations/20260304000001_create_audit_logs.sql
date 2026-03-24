-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL, -- e.g., 'member', 'inviter', 'church', 'admin_role'
    target_id UUID,            -- ID of the entity that was affected
    details JSONB,             -- Additional context (e.g., changes made)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: We reference profiles instead of auth.users directly because 
-- profiles has a direct 1-to-1 mapping and is accessible in the public schema.

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies
-- Super admins can view all audit logs
CREATE POLICY "Super admins can view all audit logs" ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'super_admin'
        )
    );

-- Anyone authenticated can insert an audit log (so Church Admins can log their actions too)
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
