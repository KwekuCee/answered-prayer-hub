CREATE TABLE public.shop_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Apparel',
  price numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_products TO authenticated;
GRANT ALL ON public.shop_products TO service_role;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read active products" ON public.shop_products FOR SELECT USING (is_active OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Super admins insert products" ON public.shop_products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Super admins update products" ON public.shop_products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Super admins delete products" ON public.shop_products FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER shop_products_updated BEFORE UPDATE ON public.shop_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.shop_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_number text NOT NULL DEFAULT '',
  store_notice text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.shop_settings TO authenticated;
GRANT ALL ON public.shop_settings TO service_role;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads shop settings" ON public.shop_settings FOR SELECT USING (true);
CREATE POLICY "Super admins insert shop settings" ON public.shop_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Super admins update shop settings" ON public.shop_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER shop_settings_updated BEFORE UPDATE ON public.shop_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.shop_orders (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_number text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  delivery_address text NOT NULL DEFAULT '',
  delivery_city text NOT NULL DEFAULT '',
  delivery_notes text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'whatsapp',
  payment_reference text,
  payment_confirmed boolean NOT NULL DEFAULT false,
  payment_confirmed_at timestamptz,
  status text NOT NULL DEFAULT 'pending_payment',
  whatsapp_notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.shop_orders TO anon;
GRANT SELECT, INSERT, UPDATE ON public.shop_orders TO authenticated;
GRANT ALL ON public.shop_orders TO service_role;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers place orders" ON public.shop_orders FOR INSERT TO anon, authenticated WITH CHECK (
  payment_confirmed = false AND payment_confirmed_at IS NULL
  AND status = 'pending_payment'
  AND payment_method IN ('whatsapp','momo','card')
  AND length(customer_name) BETWEEN 1 AND 150
  AND length(customer_phone) BETWEEN 3 AND 30
  AND length(order_number) BETWEEN 1 AND 60
  AND length(id) BETWEEN 1 AND 100
  AND total_amount >= 0
  AND pg_column_size(items) < 20000
);
CREATE POLICY "Super admins read orders" ON public.shop_orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Super admins update orders" ON public.shop_orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Super admins upload shop images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'shop-images' AND public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Super admins update shop images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'shop-images' AND public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Super admins delete shop images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'shop-images' AND public.has_role(auth.uid(),'super_admin'));