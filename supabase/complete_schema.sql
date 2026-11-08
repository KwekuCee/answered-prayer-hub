-- Complete Consolidated Supabase SQL Schema
-- Includes all tables, enums, triggers, and RLS policies for the Korle Bu Stands in Worship system

-- 1. Create app roles enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'church_admin');

-- 2. Churches table
CREATE TABLE public.churches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  target INT NOT NULL DEFAULT 100,
  confirmed INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read churches" ON public.churches FOR SELECT USING (true);
CREATE POLICY "Anyone can insert churches" ON public.churches FOR INSERT WITH CHECK (true);

-- 3. Inviters table
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

CREATE POLICY "Anyone can read inviters" ON public.inviters FOR SELECT USING (true);
CREATE POLICY "Anyone can create inviters" ON public.inviters FOR INSERT WITH CHECK (true);

-- 4. Members table
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

CREATE POLICY "Anyone can read members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Anyone can create members" ON public.members FOR INSERT WITH CHECK (true);

-- 5. Profiles table (for admin users linked to auth.users)
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

-- 6. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7. Security definer function to check roles globally
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

-- 8. Additional Admin Security Policies

-- Church Admins & Super Admins can update/delete members
CREATE POLICY "Admins can update members" ON public.members FOR UPDATE
  USING (public.has_role(auth.uid(), 'church_admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete members" ON public.members FOR DELETE
  USING (public.has_role(auth.uid(), 'church_admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Super Admins only can update churches
CREATE POLICY "Admins can update churches" ON public.churches FOR UPDATE
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Church Admins & Super Admins can update/delete inviters
CREATE POLICY "Admins can update inviters" ON public.inviters FOR UPDATE
  USING (public.has_role(auth.uid(), 'church_admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete inviters" ON public.inviters FOR DELETE
  USING (public.has_role(auth.uid(), 'church_admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Super Admins only can view ALL profiles and roles
CREATE POLICY "Super admins can read all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can read all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- 9. Automatic Updated At Trigger Function
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

-- 10. Auto-Create Profile Trigger upon User Signup
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

