-- ==========================================
-- PHASE 1: STRICT RESTRICTIONS ON RLS POLICIES
-- ==========================================
-- This script locks down your tables so Church Admins
-- can ONLY see their own Attendees and Inviters. Super Admins see all.

-- 1. MEMBERS (Attendees)
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members are viewable by assigned church admins" ON public.members;
DROP POLICY IF EXISTS "Members are editable by assigned church admins" ON public.members;
DROP POLICY IF EXISTS "Members can be inserted by anyone" ON public.members;
DROP POLICY IF EXISTS "Members are deletable by assigned church admins" ON public.members;

-- Allow public frontend registration
CREATE POLICY "Members can be inserted by anyone" ON public.members FOR INSERT WITH CHECK (true);

-- Restrict View/Edit/Delete to Super Admins OR the matched Church Admin
CREATE POLICY "Members are viewable by assigned church admins" ON public.members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin') 
  OR church_id = (SELECT church_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Members are editable by assigned church admins" ON public.members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin') 
  OR church_id = (SELECT church_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Members are deletable by assigned church admins" ON public.members FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin') 
  OR church_id = (SELECT church_id FROM public.profiles WHERE user_id = auth.uid())
);


-- 2. INVITERS
ALTER TABLE public.inviters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Inviters are viewable by assigned church admins" ON public.inviters;
DROP POLICY IF EXISTS "Inviters are editable by assigned church admins" ON public.inviters;
DROP POLICY IF EXISTS "Inviters can be inserted by anyone" ON public.inviters;
DROP POLICY IF EXISTS "Inviters are deletable by assigned church admins" ON public.inviters;

CREATE POLICY "Inviters can be inserted by anyone" ON public.inviters FOR INSERT WITH CHECK (true);

CREATE POLICY "Inviters are viewable by assigned church admins" ON public.inviters FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin') 
  OR church_id = (SELECT church_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Inviters are editable by assigned church admins" ON public.inviters FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin') 
  OR church_id = (SELECT church_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Inviters are deletable by assigned church admins" ON public.inviters FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin') 
  OR church_id = (SELECT church_id FROM public.profiles WHERE user_id = auth.uid())
);


-- 3. AUDIT LOGS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Audit logs viewable by super admin and self" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs insertable by authenticated users" ON public.audit_logs;

-- Any logged in admin can create an audit log
CREATE POLICY "Audit logs insertable by authenticated users" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only Super Admins can see EVERYTHING. Normal admins can only see their OWN logs.
CREATE POLICY "Audit logs viewable by super admin and self" ON public.audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  OR user_id = auth.uid()
);


-- 4. LIVE PARTICIPANTS
ALTER TABLE public.live_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Live participants public insert" ON public.live_participants;
DROP POLICY IF EXISTS "Live participants viewable by super admin" ON public.live_participants;
DROP POLICY IF EXISTS "Live participants public update" ON public.live_participants;

CREATE POLICY "Live participants public insert" ON public.live_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Live participants public update" ON public.live_participants FOR UPDATE USING (true);
CREATE POLICY "Live participants viewable by super admin" ON public.live_participants FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);
