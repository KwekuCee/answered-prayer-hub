
-- 1. Drop the dependent FK on audit_logs first
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

-- 2. Repoint audit_logs.user_id to auth.users(id)
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Now safely drop the obsolete unique constraint on profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_key;
