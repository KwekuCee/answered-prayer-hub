-- Standalone Idempotent Supabase SQL Migration for Korle Bu Stands in Worship Shop
-- Safe to run directly in Supabase SQL Editor on top of my_all.sql

BEGIN;

CREATE TABLE IF NOT EXISTS public.shop_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200),
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Apparel',
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  compare_at_price numeric(10,2) CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  stock integer NOT NULL DEFAULT 50 CHECK (stock >= 0),
  image_url text NOT NULL DEFAULT '/images/shop/worship-tee.webp',
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_products
  ADD COLUMN IF NOT EXISTS compare_at_price numeric(10,2) CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.shop_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_number text NOT NULL DEFAULT '233240000000',
  store_notice text NOT NULL DEFAULT 'Place your order with your delivery details and complete it directly on WhatsApp for payment and manual physical delivery.',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Cleanly drop legacy MoMo columns if upgrading from an earlier schema revision
ALTER TABLE public.shop_settings
  DROP COLUMN IF EXISTS momo_number,
  DROP COLUMN IF EXISTS momo_account_name,
  DROP COLUMN IF EXISTS momo_network;

CREATE TABLE IF NOT EXISTS public.shop_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE CHECK (length(btrim(order_number)) BETWEEN 3 AND 64),
  customer_name text NOT NULL CHECK (length(btrim(customer_name)) BETWEEN 1 AND 200),
  customer_phone text NOT NULL CHECK (length(btrim(customer_phone)) BETWEEN 3 AND 50),
  customer_email text,
  delivery_address text NOT NULL CHECK (length(btrim(delivery_address)) BETWEEN 3 AND 500),
  delivery_city text NOT NULL DEFAULT 'Accra',
  delivery_notes text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric(10,2) NOT NULL CHECK (total_amount >= 0),
  payment_method text NOT NULL DEFAULT 'whatsapp',
  payment_reference text,
  payment_confirmed boolean NOT NULL DEFAULT false,
  payment_confirmed_at timestamptz,
  status text NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment','payment_confirmed','processing','dispatched','delivered','cancelled')),
  whatsapp_notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Upgrade existing shop_orders columns/constraints safely for WhatsApp-first orders
ALTER TABLE public.shop_orders
  DROP COLUMN IF EXISTS momo_network,
  DROP CONSTRAINT IF EXISTS shop_orders_payment_method_check;
ALTER TABLE public.shop_orders
  ALTER COLUMN payment_method SET DEFAULT 'whatsapp',
  ALTER COLUMN status SET DEFAULT 'pending_payment',
  ADD CONSTRAINT shop_orders_payment_method_check CHECK (payment_method IN ('whatsapp','momo','card'));

CREATE TABLE IF NOT EXISTS public.shop_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.shop_products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  line_total numeric(10,2) NOT NULL CHECK (line_total >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_products_active ON public.shop_products(is_active, category);
CREATE INDEX IF NOT EXISTS idx_shop_orders_status ON public.shop_orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_order_items_order_id ON public.shop_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_shop_order_items_product_id ON public.shop_order_items(product_id);

ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.shop_products FROM anon, authenticated;
REVOKE ALL ON public.shop_settings FROM anon, authenticated;
REVOKE ALL ON public.shop_orders FROM anon, authenticated;
REVOKE ALL ON public.shop_order_items FROM anon, authenticated;

DROP POLICY IF EXISTS "Public active shop products" ON public.shop_products;
DROP POLICY IF EXISTS "Super admin manages shop products" ON public.shop_products;
GRANT SELECT ON public.shop_products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shop_products TO authenticated;
CREATE POLICY "Public active shop products" ON public.shop_products FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "Super admin manages shop products" ON public.shop_products FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Public shop checkout settings" ON public.shop_settings;
DROP POLICY IF EXISTS "Super admin manages shop settings" ON public.shop_settings;
GRANT SELECT ON public.shop_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shop_settings TO authenticated;
CREATE POLICY "Public shop checkout settings" ON public.shop_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Super admin manages shop settings" ON public.shop_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Public shop order submission" ON public.shop_orders;
DROP POLICY IF EXISTS "Super admin manages shop orders" ON public.shop_orders;
GRANT INSERT ON public.shop_orders TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.shop_orders TO authenticated;
CREATE POLICY "Public shop order submission" ON public.shop_orders FOR INSERT TO anon, authenticated WITH CHECK (
  length(btrim(customer_name)) BETWEEN 1 AND 200
  AND length(btrim(customer_phone)) BETWEEN 3 AND 50
  AND length(btrim(delivery_address)) BETWEEN 3 AND 500
  AND total_amount > 0
  AND payment_method = 'whatsapp'
  AND payment_confirmed = false
  AND status = 'pending_payment'
);
CREATE POLICY "Super admin manages shop orders" ON public.shop_orders FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admin manages shop order items" ON public.shop_order_items;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_order_items TO authenticated;
CREATE POLICY "Super admin manages shop order items" ON public.shop_order_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Storage bucket & policies for Super Admin Product Image Uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-images', 'shop-images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Public read shop images" ON storage.objects;
DROP POLICY IF EXISTS "Super admin uploads shop images" ON storage.objects;
DROP POLICY IF EXISTS "Super admin updates shop images" ON storage.objects;
DROP POLICY IF EXISTS "Super admin deletes shop images" ON storage.objects;

CREATE POLICY "Public read shop images" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'shop-images');

CREATE POLICY "Super admin uploads shop images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'shop-images' AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin updates shop images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'shop-images' AND public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (bucket_id = 'shop-images' AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin deletes shop images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'shop-images' AND public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['shop_products','shop_settings','shop_orders'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.process_shop_order_items()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  elem jsonb;
  pid uuid;
  qty integer;
  uprice numeric(10,2);
  pname text;
BEGIN
  IF jsonb_typeof(NEW.items) = 'array' THEN
    FOR elem IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
      qty := GREATEST(1, COALESCE((elem->>'quantity')::integer, 1));
      uprice := GREATEST(0, COALESCE((elem->>'price')::numeric, 0));
      pname := COALESCE(NULLIF(elem->>'name', ''), 'Store Item');
      pid := NULL;
      BEGIN
        IF elem->>'product_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
          SELECT id INTO pid FROM public.shop_products WHERE id = (elem->>'product_id')::uuid;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        pid := NULL;
      END;

      INSERT INTO public.shop_order_items(order_id, product_id, product_name, unit_price, quantity, line_total)
      VALUES (NEW.id, pid, pname, uprice, qty, uprice * qty);

      IF pid IS NOT NULL THEN
        UPDATE public.shop_products SET stock = GREATEST(0, stock - qty) WHERE id = pid;
      END IF;
    END LOOP;
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.process_shop_order_items() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS process_shop_order_items ON public.shop_orders;
CREATE TRIGGER process_shop_order_items AFTER INSERT ON public.shop_orders FOR EACH ROW EXECUTE FUNCTION public.process_shop_order_items();

INSERT INTO public.shop_settings (whatsapp_number, store_notice)
SELECT '233240000000', 'Place your order with your delivery details and complete it directly on WhatsApp for payment and manual physical delivery.'
WHERE NOT EXISTS (SELECT 1 FROM public.shop_settings);

INSERT INTO public.shop_products (name, description, category, price, stock, image_url, is_active)
SELECT v.name, v.description, v.category, v.price, v.stock, v.image_url, true
FROM (VALUES
  ('KSW 2026 Royal Crest Worship Tee', 'Heavyweight 240gsm organic black cotton crewneck finished with a metallic gold worship crest. Tailored for comfort during all-night praise sessions.', 'Apparel', 150.00, 80, '/images/shop/worship-tee.webp'),
  ('Covenant Hardcover Prayer Journal', 'Charcoal linen hardcover devotional & sermon journal with gold foil trim, satin ribbon marker, and 200 ruled reflection pages.', 'Publications', 95.00, 60, '/images/shop/devotional-journal.webp'),
  ('Sanctuary Canvas Carry Tote', 'Structured heavyweight black and natural canvas tote featuring brushed brass clasp hardware—built for Bibles, devotionals, and study notes.', 'Accessories', 120.00, 45, '/images/shop/worship-tote.webp'),
  ('KSW Embroidered Cap & Wristband Set', 'Structured matte black cotton cap with raised gold embroidery paired with an engraved commemorative worship wristband.', 'Accessories', 85.00, 100, '/images/shop/commemorative-cap.webp')
) AS v(name, description, category, price, stock, image_url)
WHERE NOT EXISTS (SELECT 1 FROM public.shop_products);

COMMIT;
