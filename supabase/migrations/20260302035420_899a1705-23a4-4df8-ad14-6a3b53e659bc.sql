
-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'church_admin');

-- Churches table
CREATE TABLE public.churches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  target INT NOT NULL DEFAULT 100,
  confirmed INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;

-- Public can read churches (for forms)
CREATE POLICY "Anyone can read churches" ON public.churches FOR SELECT USING (true);

-- Inviters table
CREATE TABLE public.inviters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE NOT NULL,
  invite_count INT NOT NULL DEFAULT 0,
  confirmed_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inviters ENABLE ROW LEVEL SECURITY;

-- Public can read inviters (for member registration dropdown)
CREATE POLICY "Anyone can read inviters" ON public.inviters FOR SELECT USING (true);
-- Public can insert inviters (inviter sign-up form)
CREATE POLICY "Anyone can create inviters" ON public.inviters FOR INSERT WITH CHECK (true);

-- Members table
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  occupation TEXT,
  location TEXT,
  date_of_birth DATE,
  inviter_id UUID REFERENCES public.inviters(id) ON DELETE SET NULL,
  church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE NOT NULL,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Public can read members (for counts)
CREATE POLICY "Anyone can read members" ON public.members FOR SELECT USING (true);
-- Public can insert members (member registration form)
CREATE POLICY "Anyone can create members" ON public.members FOR INSERT WITH CHECK (true);

-- Profiles table for admin users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  phone TEXT,
  church_id UUID REFERENCES public.churches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admin policies: admins can update members and churches
CREATE POLICY "Admins can update members" ON public.members FOR UPDATE
  USING (public.has_role(auth.uid(), 'church_admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update churches" ON public.churches FOR UPDATE
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert churches" ON public.churches FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR true);

-- Admins can manage inviters
CREATE POLICY "Admins can update inviters" ON public.inviters FOR UPDATE
  USING (public.has_role(auth.uid(), 'church_admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete inviters" ON public.inviters FOR DELETE
  USING (public.has_role(auth.uid(), 'church_admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Update function for timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_churches_updated_at
  BEFORE UPDATE ON public.churches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed churches
INSERT INTO public.churches (id, name, target, confirmed) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Grace Community Church', 200, 87),
  ('22222222-2222-2222-2222-222222222222', 'Living Faith Chapel', 150, 45),
  ('33333333-3333-3333-3333-333333333333', 'New Hope Assembly', 100, 32);

-- Seed inviters
INSERT INTO public.inviters (id, full_name, email, phone, church_id, invite_count, confirmed_count) VALUES
  ('aaaa1111-1111-1111-1111-111111111111', 'Pastor James Okonkwo', 'james@grace.org', '+234801234567', '11111111-1111-1111-1111-111111111111', 35, 28),
  ('aaaa2222-2222-2222-2222-222222222222', 'Sister Mary Adebayo', 'mary@grace.org', '+234802345678', '11111111-1111-1111-1111-111111111111', 22, 18),
  ('aaaa3333-3333-3333-3333-333333333333', 'Deacon Peter Eze', 'peter@living.org', '+234803456789', '22222222-2222-2222-2222-222222222222', 15, 10),
  ('aaaa4444-4444-4444-4444-444444444444', 'Elder Sarah Nwosu', 'sarah@newhope.org', '+234804567890', '33333333-3333-3333-3333-333333333333', 20, 14);

-- Seed members
INSERT INTO public.members (full_name, phone, occupation, location, inviter_id, church_id, confirmed, created_at) VALUES
  ('John Doe', '+234811111111', 'Teacher', 'Lagos', 'aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', true, '2026-01-10'),
  ('Jane Smith', '+234822222222', 'Nurse', 'Abuja', 'aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', true, '2026-01-12'),
  ('Michael Obi', '+234833333333', NULL, 'Lagos', 'aaaa2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', false, '2026-02-28'),
  ('Grace Emeka', '+234844444444', 'Engineer', NULL, 'aaaa3333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', true, '2026-02-01'),
  ('David Chukwu', '+234855555555', NULL, NULL, 'aaaa4444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', false, '2026-02-28');
