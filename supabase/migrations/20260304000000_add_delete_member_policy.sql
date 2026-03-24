-- Add policy to allow admins to delete members
CREATE POLICY "Admins can delete members" ON public.members FOR DELETE
  USING (public.has_role(auth.uid(), 'church_admin') OR public.has_role(auth.uid(), 'super_admin'));
