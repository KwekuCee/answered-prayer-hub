
-- Allow super admins to read all profiles
CREATE POLICY "Super admins can read all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- Allow super admins to read all roles
CREATE POLICY "Super admins can read all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- Allow authenticated users to insert their own role (for registration)
CREATE POLICY "Users can insert own role" ON public.user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
