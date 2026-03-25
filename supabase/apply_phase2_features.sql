-- Phase 2 Features: QR Code Event Check-In

-- Update Existing 'members' (Attendees) Table
-- Add checked_in status and timestamp
ALTER TABLE IF EXISTS public.members
ADD COLUMN IF NOT EXISTS checked_in BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMPTZ;

-- Update 'bus_points' Table
-- Add coordinates for interactive map
ALTER TABLE IF EXISTS public.bus_points
ADD COLUMN IF NOT EXISTS lat NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS lng NUMERIC(10, 7);

-- Allow Admins to update the check-in status (Already covered by existing UPDATE policy on public.members, but ensuring safety)
