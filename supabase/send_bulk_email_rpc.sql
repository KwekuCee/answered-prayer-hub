-- =========================================================================================
-- Answered Prayer Hub: Secure Bulk Email RPC (No Edge Functions Required)
-- =========================================================================================

-- Since the Edge Function cannot be deployed without the Supabase CLI, we will use a 
-- secure Remote Procedure Call (RPC) directly on your Postgres Database to execute the mail!

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.send_bulk_resend_email(
  recipients JSONB,
  email_subject TEXT,
  email_html TEXT
)
RETURNS JSONB AS $$
DECLARE
  -- IMPORTANT: Paste your actual Resend API Key here between the quotes
  resend_api_key TEXT := 'REPLACE_WITH_RESEND_API_KEY';
  payload JSONB;
  request_id BIGINT;
BEGIN
  -- Build the JSON body for the Resend API
  payload := jsonb_build_object(
    'from', '100% Answered Prayer <onboarding@resend.dev>',
    'to', recipients,
    'subject', email_subject,
    'html', email_html
  );

  -- Perform the secure POST natively from Postgres to Resend
  -- Note: net.http_post returns a request_id, but the network request executes asynchronously
  SELECT net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || resend_api_key,
      'Content-Type', 'application/json'
    ),
    body := payload
  ) INTO request_id;
  
  RETURN jsonb_build_object('status', 'success', 'request_id', request_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
