-- Fix for deleting an admin
CREATE OR REPLACE FUNCTION public.delete_admin_user(target_user_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'super_admin') THEN
        RAISE EXCEPTION 'Unauthorized: Only super admins can delete users';
    END IF;

    -- Prevent a user from deleting themselves
    IF auth.uid() = target_user_id THEN
        RAISE EXCEPTION 'Forbidden: Cannot delete yourself via this function';
    END IF;

    DELETE FROM auth.users WHERE id = target_user_id;

    RETURN true;
END;
$$;

-- Fix for deleting a church safely and bypassing cascading errors
CREATE OR REPLACE FUNCTION public.delete_church_secure(target_church_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_caller_super_admin boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'super_admin'
    ) INTO is_caller_super_admin;

    IF NOT is_caller_super_admin THEN
        RAISE EXCEPTION 'Unauthorized: Only super admins can delete churches';
    END IF;

    -- Unassign profiles
    UPDATE public.profiles SET church_id = NULL WHERE church_id = target_church_id;
    
    -- Delete dependents (some cascade, but this is explicit)
    DELETE FROM public.members WHERE church_id = target_church_id;
    DELETE FROM public.inviters WHERE church_id = target_church_id;

    -- Finally delete the church itself
    DELETE FROM public.churches WHERE id = target_church_id;

    RETURN true;
END;
$$;

-- Ensure user_id in profiles is unique so we can reference it
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_key;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);

-- Fix for Audit Logs foreign key constraint
-- To allow .select("*, profiles(...)") in Supabase, we MUST reference the public profiles table.
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
