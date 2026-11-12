-- has_role: only answers about the caller (prevents probing other users' roles)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL AND _user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.current_admin_church()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT church_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.current_admin_church() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_admin_church() TO authenticated;

-- Roles: no self-assignment. Grant church_admin only at account creation when the auth code matches.
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, username, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
          COALESCE(NEW.raw_user_meta_data->>'username', ''), NEW.email);
  IF NEW.raw_user_meta_data->>'admin_auth_code' = '100PRAYER' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'church_admin');
  END IF;
  RETURN NEW;
END;
$$;

-- Members
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS inviter_notified_at timestamptz;
DROP POLICY IF EXISTS "Anyone can read members" ON public.members;
DROP POLICY IF EXISTS "Anyone can create members" ON public.members;
CREATE POLICY "Admins can read members" ON public.members FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR (public.has_role(auth.uid(),'church_admin') AND church_id = public.current_admin_church()));
CREATE POLICY "Anyone can register as member" ON public.members FOR INSERT TO anon, authenticated
  WITH CHECK (
    (confirmed = false AND inviter_notified_at IS NULL AND length(full_name) BETWEEN 1 AND 150 AND length(phone) BETWEEN 3 AND 30)
    OR public.has_role(auth.uid(),'super_admin')
    OR (public.has_role(auth.uid(),'church_admin') AND church_id = public.current_admin_church()));

CREATE OR REPLACE FUNCTION public.public_member_count()
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*) FROM public.members
$$;
GRANT EXECUTE ON FUNCTION public.public_member_count() TO anon, authenticated;

-- Keep invite counts server-side
CREATE OR REPLACE FUNCTION public.bump_inviter_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.inviter_id IS NOT NULL THEN
    UPDATE public.inviters SET invite_count = invite_count + 1 WHERE id = NEW.inviter_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS members_bump_inviter_count ON public.members;
CREATE TRIGGER members_bump_inviter_count AFTER INSERT ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.bump_inviter_count();

-- Inviters: contact details only for admins; public gets names via function
DROP POLICY IF EXISTS "Anyone can read inviters" ON public.inviters;
CREATE POLICY "Admins can read inviters" ON public.inviters FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR (public.has_role(auth.uid(),'church_admin') AND church_id = public.current_admin_church()));
CREATE OR REPLACE FUNCTION public.list_public_inviters()
RETURNS TABLE(id uuid, full_name text, church_id uuid, church_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, i.full_name, i.church_id, c.name FROM public.inviters i
  LEFT JOIN public.churches c ON c.id = i.church_id ORDER BY i.full_name
$$;
GRANT EXECUTE ON FUNCTION public.list_public_inviters() TO anon, authenticated;

-- Churches
DROP POLICY IF EXISTS "Anyone can insert churches" ON public.churches;
CREATE POLICY "Anyone can register a church" ON public.churches FOR INSERT TO anon, authenticated
  WITH CHECK (public.has_role(auth.uid(),'super_admin')
    OR (confirmed = 0 AND target BETWEEN 1 AND 100000 AND length(name) BETWEEN 2 AND 150 AND name !~ '^[=+\-@]'));

-- Testimonials
DROP POLICY IF EXISTS "Anyone can insert testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Anyone can read approved testimonials" ON public.testimonials;
CREATE POLICY "Anyone can submit testimonials" ON public.testimonials FOR INSERT TO anon, authenticated
  WITH CHECK (is_approved = false AND length(author_name) BETWEEN 1 AND 120 AND length(content) BETWEEN 1 AND 5000);
CREATE POLICY "Anyone can read approved testimonials" ON public.testimonials FOR SELECT
  USING (is_approved = true OR public.has_role(auth.uid(),'super_admin'));

-- Programs
DROP POLICY IF EXISTS "Anyone can read programs" ON public.programs;
CREATE POLICY "Public can read active programs" ON public.programs FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'church_admin'));

-- Audit logs
DROP POLICY IF EXISTS "Anyone can insert audit_logs" ON public.audit_logs;
CREATE POLICY "Admins can insert own audit_logs" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'church_admin')));

-- Live chat
DROP POLICY IF EXISTS "Anyone can insert live_chats" ON public.live_chats;
CREATE POLICY "Anyone can post live_chats" ON public.live_chats FOR INSERT TO anon, authenticated
  WITH CHECK (is_deleted = false AND length(user_name) BETWEEN 1 AND 60 AND length(message) BETWEEN 1 AND 1000);

-- Live presence samples: admins only
DROP POLICY IF EXISTS "Anyone can insert live_presence_samples" ON public.live_presence_samples;
CREATE POLICY "Admins can insert live_presence_samples" ON public.live_presence_samples FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'church_admin'));

-- Live presence events
DROP POLICY IF EXISTS "Anyone can insert live_presence_events" ON public.live_presence_events;
CREATE POLICY "Viewers can log presence events" ON public.live_presence_events FOR INSERT TO anon, authenticated
  WITH CHECK (event IN ('join','leave','heartbeat') AND length(coalesce(viewer_key,'')) BETWEEN 8 AND 100
    AND pg_column_size(coalesce(metadata,'{}'::jsonb)) < 2000);

-- Live participants
DROP POLICY IF EXISTS "Anyone can insert live_participants" ON public.live_participants;
CREATE POLICY "Viewers can register participation" ON public.live_participants FOR INSERT TO anon, authenticated
  WITH CHECK (length(coalesce(viewer_key,'')) BETWEEN 8 AND 100 AND length(coalesce(name,'')) <= 120
    AND length(coalesce(contact,'')) <= 120 AND length(coalesce(location,'')) <= 120);

-- Watchers
DROP POLICY IF EXISTS watchers_insert ON public.live_stream_watchers;
DROP POLICY IF EXISTS watchers_update ON public.live_stream_watchers;
CREATE POLICY watchers_insert ON public.live_stream_watchers FOR INSERT TO anon, authenticated
  WITH CHECK (length(session_id) BETWEEN 8 AND 100 AND last_seen <= now() + interval '1 minute');
CREATE POLICY watchers_update ON public.live_stream_watchers FOR UPDATE TO anon, authenticated
  USING (last_seen > now() - interval '1 day')
  WITH CHECK (length(session_id) BETWEEN 8 AND 100 AND last_seen <= now() + interval '1 minute');

-- Storage: only admins can change resource files
DROP POLICY IF EXISTS resources_upload ON storage.objects;
DROP POLICY IF EXISTS resources_update ON storage.objects;
DROP POLICY IF EXISTS resources_delete ON storage.objects;
CREATE POLICY resources_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resources' AND (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'church_admin')));
CREATE POLICY resources_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'resources' AND (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'church_admin')));
CREATE POLICY resources_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resources' AND (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'church_admin')));