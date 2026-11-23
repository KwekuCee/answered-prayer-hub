DROP POLICY IF EXISTS "Anyone can read live_chats" ON public.live_chats;
CREATE POLICY "Read visible live_chats" ON public.live_chats FOR SELECT
USING (is_deleted = false OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'church_admin'));

DROP POLICY IF EXISTS "Anyone can read live_presence_samples" ON public.live_presence_samples;
CREATE POLICY "Admins can read live_presence_samples" ON public.live_presence_samples FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'church_admin'));

DROP POLICY IF EXISTS "watchers_read" ON public.live_stream_watchers;
CREATE POLICY "watchers_read_recent" ON public.live_stream_watchers FOR SELECT
USING (last_seen > (now() - interval '1 day'));

DROP POLICY IF EXISTS "Anyone can read live_participants" ON public.live_participants;
CREATE POLICY "Admins can read live_participants" ON public.live_participants FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'church_admin'));

DROP POLICY IF EXISTS "Anyone can read live_presence_events" ON public.live_presence_events;
CREATE POLICY "Admins can read live_presence_events" ON public.live_presence_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'church_admin'));

DROP POLICY IF EXISTS "Anyone can create inviters" ON public.inviters;
CREATE POLICY "Anyone can sign up as inviter" ON public.inviters FOR INSERT TO anon, authenticated
WITH CHECK (invite_count = 0 AND confirmed_count = 0
  AND length(full_name) BETWEEN 1 AND 150
  AND length(email) BETWEEN 3 AND 254
  AND length(phone) BETWEEN 3 AND 30);