-- Add database function to securely delete admins (excluding super_admins)
CREATE OR REPLACE FUNCTION public.delete_admin_user(target_user_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the function creator (postgres role)
SET search_path = public
AS $$
DECLARE
    is_caller_super_admin boolean;
    is_target_super_admin boolean;
BEGIN
    -- 1. Check if the caller is a super_admin
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'super_admin'
    ) INTO is_caller_super_admin;

    IF NOT is_caller_super_admin THEN
        RAISE EXCEPTION 'Unauthorized: Only super admins can delete users';
    END IF;

    -- 2. Check if the target user is a super_admin
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = target_user_id AND role = 'super_admin'
    ) INTO is_target_super_admin;

    IF is_target_super_admin THEN
        RAISE EXCEPTION 'Forbidden: Cannot delete a super admin account';
    END IF;

    -- 3. Delete the user from auth.users
    -- This will cascade to public.profiles, public.user_roles, etc.
    DELETE FROM auth.users WHERE id = target_user_id;

    RETURN true;
END;
$$;
