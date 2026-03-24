-- Allow super admins to delete churches
CREATE POLICY "Super admins can delete churches" ON public.churches
  FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'));

-- Allow super admins to update profiles (needed when assigning/unassigning roles and churches)
CREATE POLICY "Super admins can update profiles" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'));

-- Allow super admins to manage (insert/delete) user roles
CREATE POLICY "Super admins can insert user roles" ON public.user_roles
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete user roles" ON public.user_roles
  FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'));
