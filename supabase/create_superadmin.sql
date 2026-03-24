-- Create a super admin user via SQL
-- WARNING: In a production Supabase environment, it is highly recommended to use the Supabase Auth API
-- to create users so passwords are encrypted correctly with bcrypt. 
-- However, you can insert directly into auth.users for setup purposes if required.
-- The extension pgcrypto is required to encrypt the password.

-- Ensure pgcrypto is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  new_user_id UUID := gen_random_uuid();
  admin_email TEXT := 'admin@cekbu';
  admin_password TEXT := 'Focus03';
BEGIN
  -- 1. Insert into auth.users (encrypting the password)
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    admin_email,
    crypt(admin_password, gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Super Admin", "username": "superadmin"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- 2. Insert into auth.identities
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    format('{"sub": "%s", "email": "%s"}', new_user_id::text, admin_email)::jsonb,
    'email',
    new_user_id::text,
    now(),
    now(),
    now()
  );

  -- Note: The `public.profiles` table should automatically populate via the `on_auth_user_created` trigger 
  -- previously created in the complete_schema.sql.
  
  -- 3. Insert the super_admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, 'super_admin');

END $$;
