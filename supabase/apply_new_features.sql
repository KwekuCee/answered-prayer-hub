-- 1. ADD DELETE MEMBER POLICY
-- (Skipped: Policy already exists)

-- 2. CREATE AUDIT LOGS TABLE
-- (Skipped: Table and base policies already exist)

CREATE POLICY "Church admins and owners can view their own audit logs"
    ON public.audit_logs
    FOR SELECT
    USING (
        admin_id = auth.uid() OR
        admin_id IN (
            SELECT id FROM public.profiles WHERE user_id = auth.uid()
        )
    );

-- 3. CREATE WELCOME EMAIL TRIGGER
create extension if not exists pg_net;

create or replace function public.trigger_welcome_email()
returns trigger as $$
begin
  perform net.http_post(
    url := 'https://mgxbnsudczqmnnezcvox.supabase.co/functions/v1/welcome_email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('request.jwt.claim.sub', true)
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', TG_TABLE_NAME,
      'schema', 'public',
      'record', row_to_json(NEW)
    )
  );
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_member_created_send_email on public.members;
drop trigger if exists on_inviter_created_send_email on public.inviters;

create trigger on_member_created_send_email
  after insert on public.members
  for each row
  execute function public.trigger_welcome_email();

create trigger on_inviter_created_send_email
  after insert on public.inviters
  for each row
  execute function public.trigger_welcome_email();
