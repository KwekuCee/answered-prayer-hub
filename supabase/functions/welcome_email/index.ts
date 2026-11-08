import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Postgres webhooks send payload under 'record'
    const payload = await req.json()
    const record = payload.record

    if (!record || !record.email) {
      // Some records might not have an email
      return new Response(JSON.stringify({ message: 'No email found in record, skipping.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const isInviter = payload.table === 'inviters';
    const name = record.full_name || 'Valued Member';
    const roleString = isInviter ? 'an Inviter' : 'a Member';

    const subject = `Welcome to Korle Bu Stands in Worship!`;

    const html = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Inter', Helvetica, Arial, sans-serif;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
                <tr>
                  <td align="center">
                    <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);" border="0" cellspacing="0" cellpadding="0">
                      <!-- Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); padding: 40px 30px; text-align: center;">
                          <h1 style="color: #D4AF37; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 0.5px;">Korle Bu Stands in Worship</h1>
                        </td>
                      </tr>
                      <!-- Body -->
                      <tr>
                        <td style="padding: 40px 30px;">
                          <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">Welcome, ${name}!</h2>
                          <div style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                            <p>You have been successfully registered as <strong>${roleString}</strong> in our system.</p>
                            <p>We are thrilled to have you with us. If you have any questions, please reach out to your church administrator.</p>
                            <p>Stay blessed!</p>
                          </div>
                        </td>
                      </tr>
                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                          <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                            This is an automated message from the Korle Bu Stands in Worship Administration.
                          </p>
                          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                            &copy; ${new Date().getFullYear()} Korle Bu Stands in Worship. All rights reserved.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
        `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Korle Bu Stands in Worship <onboarding@resend.dev>',
        reply_to: 'korlebuchristembassy@gmail.com',
        to: [record.email],
        subject: subject,
        html: html,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(JSON.stringify(data));
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
