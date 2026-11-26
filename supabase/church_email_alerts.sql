-- Additive setup for church administrator Resend alerts. No existing policies are changed.
-- Apply only after approval. HTTP scheduling/webhooks must be configured separately.
BEGIN;

CREATE TABLE public.church_email_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('inviter_registered', 'daily_attendees')),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL,
  recipient_email text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'skipped')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  claim_token uuid,
  provider_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
GRANT ALL ON public.church_email_alerts TO service_role;
REVOKE ALL ON public.church_email_alerts FROM anon, authenticated;
ALTER TABLE public.church_email_alerts ENABLE ROW LEVEL SECURITY;
-- No browser policies: recipient addresses and operational records are server-only.
CREATE INDEX church_email_alerts_pending ON public.church_email_alerts (available_at)
  WHERE status IN ('pending', 'processing');

CREATE OR REPLACE FUNCTION public.queue_church_inviter_alert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.church_email_alerts (event_key, kind, church_id, recipient_user_id, recipient_email, payload)
  SELECT 'church-alert:inviter_registered:' || NEW.id || ':' || p.user_id,
    'inviter_registered', NEW.church_id, p.user_id, u.email,
    jsonb_build_object('churchName', c.name, 'adminName', p.full_name, 'inviterName', NEW.full_name)
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  JOIN public.churches c ON c.id = NEW.church_id
  WHERE p.church_id = NEW.church_id AND u.email_confirmed_at IS NOT NULL
    AND u.email IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.user_id AND r.role = 'church_admin')
  ON CONFLICT (event_key) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_church_inviter_alert() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER church_inviter_email_after_insert AFTER INSERT ON public.inviters
FOR EACH ROW EXECUTE FUNCTION public.queue_church_inviter_alert();

CREATE OR REPLACE FUNCTION public.queue_church_daily_alerts()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  report_day date := (now() AT TIME ZONE 'Africa/Accra')::date - 1;
  day_start timestamptz;
  day_end timestamptz;
  queued integer;
BEGIN
  day_start := report_day::timestamp AT TIME ZONE 'Africa/Accra';
  day_end := (report_day + 1)::timestamp AT TIME ZONE 'Africa/Accra';
  INSERT INTO public.church_email_alerts (event_key, kind, church_id, recipient_user_id, recipient_email, payload)
  SELECT 'church-alert:daily_attendees:' || c.id || ':' || report_day || ':' || p.user_id,
    'daily_attendees', c.id, p.user_id, u.email,
    jsonb_build_object('churchName', c.name, 'adminName', p.full_name, 'reportDate', report_day,
      'attendeeCount', (SELECT count(*) FROM public.members m
        WHERE m.church_id = c.id AND m.created_at >= day_start AND m.created_at < day_end))
  FROM public.churches c JOIN public.profiles p ON p.church_id = c.id
  JOIN auth.users u ON u.id = p.user_id
  WHERE u.email_confirmed_at IS NOT NULL AND u.email IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.user_id AND r.role = 'church_admin')
  ON CONFLICT (event_key) DO NOTHING;
  GET DIAGNOSTICS queued = ROW_COUNT;
  RETURN queued;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_church_daily_alerts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_church_daily_alerts() TO service_role;

CREATE OR REPLACE FUNCTION public.claim_church_email_alerts()
RETURNS SETOF public.church_email_alerts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Stop before Resend's 24-hour idempotency retention expires.
  UPDATE public.church_email_alerts SET status = 'failed', last_error = 'Delivery retry window expired'
  WHERE status IN ('pending', 'processing') AND (
    created_at <= now() - interval '23 hours'
    OR (attempts >= 5 AND (locked_until IS NULL OR locked_until < now()))
  );
  RETURN QUERY
  WITH ready AS (
    SELECT a.id FROM public.church_email_alerts a
    WHERE a.status IN ('pending', 'processing') AND a.available_at <= now()
      AND (a.locked_until IS NULL OR a.locked_until < now()) AND a.attempts < 5
    ORDER BY a.created_at LIMIT 25 FOR UPDATE SKIP LOCKED
  )
  UPDATE public.church_email_alerts a SET status = 'processing', attempts = a.attempts + 1,
    locked_until = now() + interval '10 minutes', claim_token = gen_random_uuid()
  FROM ready WHERE a.id = ready.id RETURNING a.*;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_church_email_alerts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_church_email_alerts() TO service_role;

CREATE OR REPLACE FUNCTION public.church_alert_recipient_is_current(alert_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.church_email_alerts a
    JOIN public.profiles p ON p.user_id = a.recipient_user_id AND p.church_id = a.church_id
    JOIN auth.users u ON u.id = p.user_id AND u.email = a.recipient_email
    WHERE a.id = alert_id AND u.email_confirmed_at IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.user_id AND r.role = 'church_admin')
  );
$$;
REVOKE ALL ON FUNCTION public.church_alert_recipient_is_current(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.church_alert_recipient_is_current(uuid) TO service_role;
COMMIT;