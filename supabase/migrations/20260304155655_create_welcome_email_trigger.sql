-- Enable pg_net if not already enabled (required for Supabase Webhooks)
create extension if not exists pg_net;

-- Function to trigger the welcome email webhook
create or replace function public.trigger_welcome_email()
returns trigger as $$
begin
  perform net.http_post(
    url := 'https://mgxbnsudczqmnnezcvox.supabase.co/functions/v1/welcome_email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('request.jwt.claim.sub', true) -- Or anon key if bypassing
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

-- Drop existing triggers if replacing
drop trigger if exists on_member_created_send_email on public.members;
drop trigger if exists on_inviter_created_send_email on public.inviters;

-- Attach trigger to Members table
create trigger on_member_created_send_email
  after insert on public.members
  for each row
  execute function public.trigger_welcome_email();

-- Attach trigger to Inviters table
create trigger on_inviter_created_send_email
  after insert on public.inviters
  for each row
  execute function public.trigger_welcome_email();
