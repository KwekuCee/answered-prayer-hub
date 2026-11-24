DROP POLICY IF EXISTS "Anyone reads shop settings" ON public.shop_settings;
CREATE POLICY "Super admins read shop settings" ON public.shop_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE OR REPLACE FUNCTION public.get_public_shop_settings()
RETURNS TABLE(whatsapp_number text, store_notice text, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT whatsapp_number, store_notice, updated_at FROM public.shop_settings ORDER BY updated_at DESC LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.get_public_shop_settings() TO anon, authenticated;