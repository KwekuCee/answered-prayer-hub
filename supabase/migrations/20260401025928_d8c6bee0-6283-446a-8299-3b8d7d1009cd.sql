
CREATE OR REPLACE FUNCTION public.delete_admin_user(target_user_id UUID)
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
      RAISE EXCEPTION 'Access denied. You must be a Super Admin to delete administrators.';
  END IF;

  IF target_user_id = auth.uid() THEN
      RAISE EXCEPTION 'Access denied. You cannot delete your own Super Admin account.';
  END IF;

  -- Clean up app-level data first
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE user_id = target_user_id;

  -- Try to delete from auth.users; ignore if not found
  BEGIN
    DELETE FROM auth.users WHERE id = target_user_id;
  EXCEPTION
    WHEN OTHERS THEN NULL;
  END;

  RETURN true;
END;
$$;
