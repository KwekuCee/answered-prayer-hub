-- Migration: Add RLS policies for live presence and participants
-- Ensures anonymous clients can insert presence/participant records only when a program is active,
-- while selects/updates/deletes require authenticated access.

/* Enable Row Level Security on the tables */
ALTER TABLE IF EXISTS public.live_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.live_presence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.live_presence_samples ENABLE ROW LEVEL SECURITY;

/*
  Policies rationale:
  - Authenticated users (role `authenticated`) keep full access for admin clients.
  - Anonymous (public/anon) clients are allowed to INSERT when they provide a `viewer_key`
    and the target `program_id` is either NULL or refers to an active program (programs.is_active = true).
  - Anonymous reads/updates/deletes are blocked by default (no policy), protecting persisted data.
  - UPDATE/DELETE operations are restricted to authenticated users by policy.
*/

-- live_participants: allow authenticated full access
DROP POLICY IF EXISTS "authenticated_full_access_live_participants" ON public.live_participants;
CREATE POLICY "authenticated_full_access_live_participants"
  ON public.live_participants
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- live_participants: allow anon INSERT when program is active and viewer_key is provided
DROP POLICY IF EXISTS "anon_insert_live_participants_active_program" ON public.live_participants;
CREATE POLICY "anon_insert_live_participants_active_program"
  ON public.live_participants
  FOR INSERT
  TO anon
  USING (false)
  WITH CHECK (
    viewer_key IS NOT NULL
    AND (
      program_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.programs p WHERE p.id = public.live_participants.program_id AND p.is_active = true
      )
    )
  );

-- live_participants: restrict UPDATE/DELETE to authenticated users
-- live_participants: restrict UPDATE to authenticated users
DROP POLICY IF EXISTS "authenticated_update_live_participants" ON public.live_participants;
CREATE POLICY "authenticated_update_live_participants"
  ON public.live_participants
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- live_participants: restrict DELETE to authenticated users
DROP POLICY IF EXISTS "authenticated_delete_live_participants" ON public.live_participants;
CREATE POLICY "authenticated_delete_live_participants"
  ON public.live_participants
  FOR DELETE
  TO authenticated
  USING (true);

-- live_presence_events: allow authenticated full access (select/modify)
DROP POLICY IF EXISTS "authenticated_full_access_live_presence_events" ON public.live_presence_events;
CREATE POLICY "authenticated_full_access_live_presence_events"
  ON public.live_presence_events
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- live_presence_events: allow anon INSERT when program is active and viewer_key is provided
DROP POLICY IF EXISTS "anon_insert_live_presence_events_active_program" ON public.live_presence_events;
CREATE POLICY "anon_insert_live_presence_events_active_program"
  ON public.live_presence_events
  FOR INSERT
  TO anon
  USING (false)
  WITH CHECK (
    viewer_key IS NOT NULL
    AND (
      program_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.programs p WHERE p.id = public.live_presence_events.program_id AND p.is_active = true
      )
    )
  );

-- live_presence_events: restrict UPDATE/DELETE to authenticated users
-- live_presence_events: restrict UPDATE to authenticated users
DROP POLICY IF EXISTS "authenticated_update_live_presence_events" ON public.live_presence_events;
CREATE POLICY "authenticated_update_live_presence_events"
  ON public.live_presence_events
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- live_presence_events: restrict DELETE to authenticated users
DROP POLICY IF EXISTS "authenticated_delete_live_presence_events" ON public.live_presence_events;
CREATE POLICY "authenticated_delete_live_presence_events"
  ON public.live_presence_events
  FOR DELETE
  TO authenticated
  USING (true);

-- live_presence_samples: allow authenticated full access
DROP POLICY IF EXISTS "authenticated_full_access_live_presence_samples" ON public.live_presence_samples;
CREATE POLICY "authenticated_full_access_live_presence_samples"
  ON public.live_presence_samples
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- live_presence_samples: allow anon INSERT when program is active
DROP POLICY IF EXISTS "anon_insert_live_presence_samples_active_program" ON public.live_presence_samples;
CREATE POLICY "anon_insert_live_presence_samples_active_program"
  ON public.live_presence_samples
  FOR INSERT
  TO anon
  USING (false)
  WITH CHECK (
    -- samples are allowed when the program referenced is active (or program_id is null)
    (program_id IS NULL OR EXISTS (
      SELECT 1 FROM public.programs p WHERE p.id = public.live_presence_samples.program_id AND p.is_active = true
    ))
  );

-- live_presence_samples: restrict UPDATE/DELETE to authenticated users
-- live_presence_samples: restrict UPDATE to authenticated users
DROP POLICY IF EXISTS "authenticated_update_live_presence_samples" ON public.live_presence_samples;
CREATE POLICY "authenticated_update_live_presence_samples"
  ON public.live_presence_samples
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- live_presence_samples: restrict DELETE to authenticated users
DROP POLICY IF EXISTS "authenticated_delete_live_presence_samples" ON public.live_presence_samples;
CREATE POLICY "authenticated_delete_live_presence_samples"
  ON public.live_presence_samples
  FOR DELETE
  TO authenticated
  USING (true);

/* NOTES:
 - After applying this migration, anonymous clients will still require the anon API key
   (your public Supabase key) and will be able to INSERT presence/participant rows only
   when a program is active. Reads/edits/deletes are reserved for authenticated users.
 - If you want anonymous SELECT access (e.g., public leaderboard), add an explicit SELECT
   policy for `anon` with a restrictive `USING` clause.
 - Review these policies against your desired security posture before deploying to production.
*/
