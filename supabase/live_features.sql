-- ==========================================
-- PHASE 2: LIVE STREAM Q&A AND POLLING
-- ==========================================
-- Run this script in your Supabase SQL Editor to create the new 
-- interactive tracking tables.

-- 1. LIVE QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.live_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_name TEXT NOT NULL,
    question TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    is_answered BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.live_questions ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a question
CREATE POLICY "Anyone can insert questions" ON public.live_questions FOR INSERT WITH CHECK (true);

-- Admins can see all questions. Public can only see approved questions.
CREATE POLICY "Public sees approved questions, Admins see all" ON public.live_questions FOR SELECT USING (
    is_approved = TRUE OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'church_admin'))
);

-- Only Admins can approve/delete questions
CREATE POLICY "Admins can update questions" ON public.live_questions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'church_admin'))
);
CREATE POLICY "Admins can delete questions" ON public.live_questions FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'church_admin'))
);


-- 2. LIVE POLLS TABLE
CREATE TABLE IF NOT EXISTS public.live_polls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of strings e.g. ["Option A", "Option B"]
    is_active BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.live_polls ENABLE ROW LEVEL SECURITY;

-- Public can see active polls.
CREATE POLICY "Public sees active polls, Admins see all" ON public.live_polls FOR SELECT USING (
    is_active = TRUE OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'church_admin'))
);

-- Only Admins can create/edit polls
CREATE POLICY "Admins can insert polls" ON public.live_polls FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'church_admin'))
);
CREATE POLICY "Admins can update polls" ON public.live_polls FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'church_admin'))
);
CREATE POLICY "Admins can delete polls" ON public.live_polls FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'church_admin'))
);


-- 3. LIVE POLL VOTES TABLE
CREATE TABLE IF NOT EXISTS public.live_poll_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id UUID REFERENCES public.live_polls(id) ON DELETE CASCADE,
    viewer_key TEXT NOT NULL, -- Ties vote to the unique anonymous user
    option_index INTEGER NOT NULL,
    UNIQUE(poll_id, viewer_key) -- Prevent double voting
);

ALTER TABLE public.live_poll_votes ENABLE ROW LEVEL SECURITY;

-- Public can insert a vote
CREATE POLICY "Anyone can cast a vote" ON public.live_poll_votes FOR INSERT WITH CHECK (true);

-- Public can read all votes (to see results) or we can restrict to aggregate queries
CREATE POLICY "Anyone can see votes" ON public.live_poll_votes FOR SELECT USING (true);


-- Turn on Realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_poll_votes;
