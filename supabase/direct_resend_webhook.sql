-- =========================================================================================
-- Answered Prayer Hub: Direct Resend API Webhook (No Edge Functions Required)
-- =========================================================================================

-- Instead of using an Edge Function, we will let Supabase's Database call Resend DIRECTLY
-- over HTTP using pg_net when a new attendee registers!

-- 1. Enable the HTTP extension
CREATE EXTENSION IF NOT EXISTS pg_net;


-- 2. Create the Trigger Function
CREATE OR REPLACE FUNCTION public.send_welcome_email()
RETURNS TRIGGER AS $$
DECLARE
  -- IMPORTANT: Paste your actual Resend API Key here between the quotes
  resend_api_key TEXT := 'REPLACE_WITH_YOUR_ACTUAL_RESEND_API_KEY';
  payload JSONB;
BEGIN
  -- Build the JSON body for the Resend API
  payload := jsonb_build_object(
    'from', '100% Answered Prayer <onboarding@resend.dev>',
    'to', jsonb_build_array(NEW.email),
    'subject', 'Welcome to 100% Answered Prayer!',
    'html', '<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); font-family: sans-serif; text-align: center; color: #0a1128;"><div style="margin-bottom: 30px;"><img src="https://answered-prayer-hub.web.app/logo.png" alt="100% Answered Prayer" style="max-height: 100px; width: auto; border-radius: 12px; margin: 0 auto; display: block;" onerror="this.src=''https://placehold.co/100x100/0a1128/bf953f?text=AP''" /></div><h1 style="color: #bf953f; font-size: 28px;">Welcome, ' || NEW.full_name || '!</h1><p style="font-size: 16px; color: #334155; line-height: 1.6; margin-bottom: 10px;">We are absolutely thrilled to have you with us.</p><p style="font-size: 16px; color: #334155; line-height: 1.6; margin-bottom: 30px;">Stay tuned for life-transforming services and powerful community updates!</p><a href="https://answered-prayer-hub.web.app/live" style="display: inline-block; background-color: #bf953f; color: #0a1128; font-weight: bold; text-decoration: none; padding: 14px 32px; border-radius: 8px; margin-bottom: 30px; border: 2px solid #bf953f;">Join the Next Service</a><hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" /><p style="color: #64748b; font-size: 13px; margin: 0;"><strong>The Answered Prayer Hub</strong><br>A Place of Divine Encounters</p></div>'
  );

  -- Perform the secure POST natively from Postgres to Resend
  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || resend_api_key,
      'Content-Type', 'application/json'
    ),
    body := payload
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Attach the Trigger to the members table
DROP TRIGGER IF EXISTS on_member_created ON public.members;
CREATE TRIGGER on_member_created
  AFTER INSERT ON public.members
  FOR EACH ROW
  WHEN (NEW.email IS NOT NULL AND NEW.email != '')
  EXECUTE FUNCTION public.send_welcome_email();
