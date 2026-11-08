-- =========================================================================
-- Korle Bu Stands in Worship: Phase 6 Admin CRUD Fixes
-- =========================================================================

-- EXPLANATION:
-- By default, Supabase's `profiles` and `user_roles` natively reject mutations
-- from any user who doesn't explicitly own that row (auth.uid() = id).
-- When you, as a Super Admin, try to Edit or Delete another Admin's church or privileges,
-- Supabase violently rejects the write.
-- These RLS overrides explicitly unlock `UPDATE`, `INSERT`, and `DELETE` on all admin vectors.

-- 1. Unrestrict 'profiles' table for Super Admins
DROP POLICY IF EXISTS "Super admins can update profiles" ON public.profiles;
CREATE POLICY "Super admins can update profiles" 
ON public.profiles FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- 2. Unrestrict 'user_roles' table for Super Admins
DROP POLICY IF EXISTS "Super admins can insert user roles" ON public.user_roles;
CREATE POLICY "Super admins can insert user roles" 
ON public.user_roles FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

DROP POLICY IF EXISTS "Super admins can delete user roles" ON public.user_roles;
CREATE POLICY "Super admins can delete user roles" 
ON public.user_roles FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

DROP POLICY IF EXISTS "Super admins can update user roles" ON public.user_roles;
CREATE POLICY "Super admins can update user roles" 
ON public.user_roles FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- 3. Re-assert the global Delete Admin RPC to pierce the Native Auth Schema
DROP FUNCTION IF EXISTS public.delete_admin_user(UUID);

CREATE OR REPLACE FUNCTION public.delete_admin_user(target_user_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_caller_super_admin boolean;
BEGIN
  -- Strict Super Admin role verification
  SELECT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
  ) INTO is_caller_super_admin;

  IF NOT is_caller_super_admin THEN
      RAISE EXCEPTION 'Access denied. You must be a Super Admin to delete administrators.';
  END IF;

  -- Block accidental self-deletion
  IF target_user_id = auth.uid() THEN
      RAISE EXCEPTION 'Access denied. You cannot delete your own Super Admin account.';
  END IF;

  -- Bypasses restricted schema with SECURITY DEFINER
  DELETE FROM auth.users WHERE id = target_user_id;

  -- Throw error if zero rows were actually mutated in auth.users
  IF NOT FOUND THEN
      RAISE EXCEPTION 'Deletion failed: User ID does not exist in auth schema.';
  END IF;

  RETURN true;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to delete admin: %', SQLERRM;
END;
$$;
