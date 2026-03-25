-- Phase 4 Feature Expansion: Live Stream Chat & Analytics

-- 1. Create live_chats table
CREATE TABLE IF NOT EXISTS public.live_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_name TEXT NOT NULL DEFAULT 'Anonymous',
    message TEXT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_chats ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to view all non-deleted chats
CREATE POLICY "Anyone can read active chats" 
    ON public.live_chats FOR SELECT 
    USING (is_deleted = false);

-- Allow admins to read all chats (including deleted)
CREATE POLICY "Admins can read all chats" 
    ON public.live_chats FOR SELECT 
    USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'church_admin'));

-- Allow anonymous users to explicitly send chat messages
CREATE POLICY "Anyone can send a message" 
    ON public.live_chats FOR INSERT 
    WITH CHECK (true);

-- Allow super admins to soft-delete messages for moderation
CREATE POLICY "Super admins can delete messages" 
    ON public.live_chats FOR UPDATE 
    USING (public.has_role(auth.uid(), 'super_admin'))
    WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 2. Turn on Supabase Realtime for the live_chats table
-- We must explicitly enable Realtime broadcast for this table so the frontend can subscribe to INSERTS
alter publication supabase_realtime add table public.live_chats;
