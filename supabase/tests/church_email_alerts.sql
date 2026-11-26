-- Run only in a fresh isolated PostgreSQL database, never against the app database.
\set ON_ERROR_STOP on
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz);
CREATE TYPE public.app_role AS ENUM ('church_admin', 'super_admin');
CREATE TABLE public.churches (id uuid PRIMARY KEY, name text NOT NULL);
CREATE TABLE public.profiles (user_id uuid PRIMARY KEY, full_name text, church_id uuid);
CREATE TABLE public.user_roles (user_id uuid, role public.app_role);
CREATE TABLE public.inviters (id uuid PRIMARY KEY, full_name text, church_id uuid);
CREATE TABLE public.members (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), church_id uuid, created_at timestamptz NOT NULL);
\ir ../church_email_alerts.sql

INSERT INTO public.churches VALUES
 ('00000000-0000-0000-0000-000000000001', 'Church A'),
 ('00000000-0000-0000-0000-000000000002', 'Church B'),
 ('00000000-0000-0000-0000-000000000003', 'Church C');
INSERT INTO auth.users VALUES
 ('10000000-0000-0000-0000-000000000001', 'admin-a@example.test', now()),
 ('10000000-0000-0000-0000-000000000002', 'admin-b@example.test', now()),
 ('10000000-0000-0000-0000-000000000003', 'admin-c@example.test', now()),
 ('10000000-0000-0000-0000-000000000004', 'unverified@example.test', null),
 ('10000000-0000-0000-0000-000000000005', 'not-admin@example.test', now());
INSERT INTO public.profiles VALUES
 ('10000000-0000-0000-0000-000000000001', 'Admin A', '00000000-0000-0000-0000-000000000001'),
 ('10000000-0000-0000-0000-000000000002', 'Admin B', '00000000-0000-0000-0000-000000000002'),
 ('10000000-0000-0000-0000-000000000003', 'Admin C', '00000000-0000-0000-0000-000000000003'),
 ('10000000-0000-0000-0000-000000000004', 'Unverified', '00000000-0000-0000-0000-000000000001'),
 ('10000000-0000-0000-0000-000000000005', 'Not an admin', '00000000-0000-0000-0000-000000000001');
INSERT INTO public.user_roles VALUES
 ('10000000-0000-0000-0000-000000000001', 'church_admin'),
 ('10000000-0000-0000-0000-000000000002', 'church_admin'),
 ('10000000-0000-0000-0000-000000000003', 'church_admin'),
 ('10000000-0000-0000-0000-000000000004', 'church_admin');
INSERT INTO public.inviters VALUES ('20000000-0000-0000-0000-000000000001', 'Inviter A', '00000000-0000-0000-0000-000000000001');

DO $$ BEGIN
  IF (SELECT count(*) FROM public.church_email_alerts) <> 1 THEN RAISE EXCEPTION 'Inviter must alert only its verified church admin'; END IF;
  IF (SELECT recipient_email FROM public.church_email_alerts LIMIT 1) <> 'admin-a@example.test' THEN RAISE EXCEPTION 'Wrong recipient'; END IF;
END $$;

INSERT INTO public.members (church_id, created_at) VALUES
 ('00000000-0000-0000-0000-000000000001', date_trunc('day', now() AT TIME ZONE 'Africa/Accra') AT TIME ZONE 'Africa/Accra' - interval '1 day'),
 ('00000000-0000-0000-0000-000000000001', date_trunc('day', now() AT TIME ZONE 'Africa/Accra') AT TIME ZONE 'Africa/Accra' - interval '1 second'),
 ('00000000-0000-0000-0000-000000000001', date_trunc('day', now() AT TIME ZONE 'Africa/Accra') AT TIME ZONE 'Africa/Accra'),
 ('00000000-0000-0000-0000-000000000001', date_trunc('day', now() AT TIME ZONE 'Africa/Accra') AT TIME ZONE 'Africa/Accra' - interval '1 day 1 second'),
 ('00000000-0000-0000-0000-000000000002', date_trunc('day', now() AT TIME ZONE 'Africa/Accra') AT TIME ZONE 'Africa/Accra' - interval '12 hours');

DO $$ BEGIN
  IF public.queue_church_daily_alerts() <> 3 THEN RAISE EXCEPTION 'One daily alert per verified church admin'; END IF;
  IF public.queue_church_daily_alerts() <> 0 THEN RAISE EXCEPTION 'Daily retry created duplicates'; END IF;
  IF (SELECT (payload->>'attendeeCount')::int FROM public.church_email_alerts WHERE kind = 'daily_attendees' AND church_id = '00000000-0000-0000-0000-000000000001') <> 2 THEN RAISE EXCEPTION 'Church A boundaries failed'; END IF;
  IF (SELECT (payload->>'attendeeCount')::int FROM public.church_email_alerts WHERE kind = 'daily_attendees' AND church_id = '00000000-0000-0000-0000-000000000002') <> 1 THEN RAISE EXCEPTION 'Church B count leaked or missing'; END IF;
  IF (SELECT (payload->>'attendeeCount')::int FROM public.church_email_alerts WHERE kind = 'daily_attendees' AND church_id = '00000000-0000-0000-0000-000000000003') <> 0 THEN RAISE EXCEPTION 'Zero count must still be reported'; END IF;
  IF has_table_privilege('anon', 'public.church_email_alerts', 'SELECT') THEN RAISE EXCEPTION 'Anonymous recipient exposure'; END IF;
  IF has_table_privilege('authenticated', 'public.church_email_alerts', 'SELECT') THEN RAISE EXCEPTION 'Browser recipient exposure'; END IF;
  IF has_function_privilege('anon', 'public.queue_church_daily_alerts()', 'EXECUTE') THEN RAISE EXCEPTION 'Public queue execution'; END IF;
  IF NOT has_function_privilege('service_role', 'public.claim_church_email_alerts()', 'EXECUTE') THEN RAISE EXCEPTION 'Worker cannot claim'; END IF;
  IF (SELECT count(*) FROM public.claim_church_email_alerts()) <> 4 THEN RAISE EXCEPTION 'Claim count failed'; END IF;
  IF (SELECT count(*) FROM public.claim_church_email_alerts()) <> 0 THEN RAISE EXCEPTION 'Concurrent duplicate claims'; END IF;
END $$;

UPDATE public.profiles SET church_id = '00000000-0000-0000-0000-000000000002' WHERE user_id = '10000000-0000-0000-0000-000000000001';
DO $$ DECLARE aid uuid; BEGIN
  SELECT id INTO aid FROM public.church_email_alerts WHERE kind = 'inviter_registered';
  IF public.church_alert_recipient_is_current(aid) THEN RAISE EXCEPTION 'Reassigned admin receives stale church alerts'; END IF;
END $$;

UPDATE public.church_email_alerts SET locked_until = now() - interval '1 second', attempts = 5;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.claim_church_email_alerts()) <> 0 THEN RAISE EXCEPTION 'Attempts exceeded five'; END IF;
  IF (SELECT count(*) FROM public.church_email_alerts WHERE status = 'failed') <> 4 THEN RAISE EXCEPTION 'Exhausted leases should become failed'; END IF;
END $$;
SELECT 'Church email SQL checks passed' AS result;