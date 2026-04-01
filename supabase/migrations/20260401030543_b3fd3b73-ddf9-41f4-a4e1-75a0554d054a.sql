
-- Add missing columns to audit_logs
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS target_type text DEFAULT '';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS target_id text DEFAULT '';

-- Ensure profiles.user_id is unique for FK reference
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_key;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);

-- Add FK from audit_logs.user_id to profiles.user_id
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
