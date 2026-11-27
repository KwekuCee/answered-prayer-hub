import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const backendUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const sender = Deno.env.get("RESEND_FROM_EMAIL");
  if (!backendUrl || !serviceKey || !resendKey || !sender) {
    return json({ error: "Email configuration is incomplete" }, 503);
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Unauthorized" }, 401);
  const db = createClient(backendUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await db.auth.getUser(token);
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  const siteUrl = "https://www.korlebustandsinworship.online";
  const logoUrl = `${siteUrl}/images/email-logo.webp`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(12_000),
    body: JSON.stringify({
      from: sender,
      to: ["essilfiem3@gmail.com"],
      subject: "Test email alert — Korle Bu Stands in Worship",
      text: `This is a test of your church administrator email alerts.\n\nYour Resend sender is working with the Korle Bu Stands in Worship email template.\n\n${siteUrl}/church-admin`,
      html: `<!doctype html>
<html><body style="margin:0;padding:0;background:#000000;color:#f1efe9;font-family:Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#000000;"><tr><td align="center" style="padding:36px 16px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#0d121d;border:1px solid #232d42;border-top:3px solid #d4af37;border-radius:16px;overflow:hidden;">
<tr><td align="center" style="padding:32px 24px 20px;background:#000000;border-bottom:1px solid #232d42;"><img src="${logoUrl}" alt="Korle Bu Stands in Worship 2026" width="190" style="display:block;width:190px;max-width:100%;height:auto;margin:0 auto;"></td></tr>
<tr><td style="padding:32px 28px;">
<p style="margin:0 0 8px;color:#d4af37;font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;">Administrator Alert Test</p>
<h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:28px;line-height:1.25;color:#f1efe9;">Your email alerts are connected</h1>
<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#f1efe9;">Hello Church Administrator,</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#b5afa3;">This is a test of your church administrator email alerts. Your verified Resend sender is working with the Korle Bu Stands in Worship email template.</p>
<table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="background:#d4af37;border-radius:10px;"><a href="${siteUrl}/church-admin" style="display:inline-block;padding:13px 24px;color:#000000;font-size:14px;font-weight:700;text-decoration:none;">Open Church Dashboard</a></td></tr></table>
</td></tr>
<tr><td style="padding:22px 28px;background:#000000;border-top:1px solid #232d42;color:#b5afa3;font-size:12px;line-height:1.65;"><strong style="color:#e5c96e;">Korle Bu Stands in Worship 2026</strong><br>Test administrator alert</td></tr>
</table></td></tr></table></body></html>`,
    }),
  });
  const result = await response.text();
  if (!response.ok) {
    console.error(`Resend test alert failed [${response.status}]: ${result}`);
    return json({ error: "Resend rejected the test alert", status: response.status, details: result }, response.status);
  }
  const delivered = JSON.parse(result);
  return json({ success: true, id: delivered.id });
});
