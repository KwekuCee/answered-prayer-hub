import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { renderChurchAlert } from "../_shared/church-alerts.ts";

const BodySchema = z.union([
  z.object({ action: z.enum(["drain", "daily"]) }).strict(),
  z.object({
    type: z.literal("INSERT"), table: z.literal("church_email_alerts"), schema: z.literal("public"),
    record: z.object({ id: z.string().uuid() }).passthrough(), old_record: z.null().optional(),
  }).strict(),
]);
const PayloadSchema = z.object({
  churchName: z.string().min(1), adminName: z.string(), inviterName: z.string().optional(),
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  attendeeCount: z.number().int().nonnegative().optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function sameSecret(a: string, b: string) {
  const digest = async (value: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  const [left, right] = await Promise.all([digest(a), digest(b)]);
  return left.reduce((difference, byte, index) => difference | (byte ^ right[index]), 0) === 0;
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const backendUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!backendUrl || !serviceKey) return json({ error: "Backend configuration missing" }, 503);

    // Server-to-server only. Never expose this credential to the browser or accept recipient input.
    const authorization = req.headers.get("authorization") ?? "";
    if (!await sameSecret(authorization, `Bearer ${serviceKey}`)) return json({ error: "Unauthorized" }, 401);
    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const sender = Deno.env.get("RESEND_FROM_EMAIL");
    const siteUrl = (Deno.env.get("APP_SITE_URL") ?? "https://cekbu.lovable.app").replace(/\/$/, "");
    const logoUrl = Deno.env.get("EMAIL_LOGO_URL") ?? `${siteUrl}/images/email-logo.webp`;
    if (!resendKey || !sender || sender.includes("@resend.dev")) {
      return json({ error: "Configure RESEND_API_KEY and a Resend-verified RESEND_FROM_EMAIL before activating church alerts" }, 503);
    }
    if (!z.string().url().safeParse(siteUrl).success || !siteUrl.startsWith("https://") ||
        !z.string().url().safeParse(logoUrl).success || !logoUrl.startsWith("https://")) {
      return json({ error: "APP_SITE_URL and EMAIL_LOGO_URL must use HTTPS" }, 503);
    }

    const db = createClient(backendUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    if ("action" in parsed.data && parsed.data.action === "daily") {
      const { error } = await db.rpc("queue_church_daily_alerts");
      if (error) throw error;
    }
    const { data: jobs, error: claimError } = await db.rpc("claim_church_email_alerts");
    if (claimError) throw claimError;

    let sent = 0;
    let skipped = 0;
    let deferred = 0;
    for (const job of jobs ?? []) {
      const finish = async (values: Record<string, unknown>) => {
        const { data, error } = await db.from("church_email_alerts").update({
          ...values, locked_until: null, claim_token: null,
        }).eq("id", job.id).eq("claim_token", job.claim_token).select("id");
        if (error || !data?.length) throw error ?? new Error("Email delivery lease expired");
      };
      try {
        const { data: current, error: recipientError } = await db.rpc("church_alert_recipient_is_current", { alert_id: job.id });
        if (recipientError) throw recipientError;
        if (!current) {
          await finish({ status: "skipped", last_error: "Recipient no longer administers this church or email changed" });
          skipped++;
          continue;
        }
        const payload = PayloadSchema.parse(job.payload);
        if (job.kind === "daily_attendees" && (payload.attendeeCount === undefined || !payload.reportDate)) {
          throw new Error("Daily summary data missing");
        }
        const email = renderChurchAlert({ ...payload, kind: job.kind }, siteUrl, logoUrl);
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST", headers: {
            Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json",
            "Idempotency-Key": job.event_key,
          },
          body: JSON.stringify({ from: sender, to: [job.recipient_email], ...email }),
          signal: AbortSignal.timeout(12_000),
        });
        if (!response.ok) {
          const body = await response.text();
          console.error(`Resend church alert failed [${response.status}]: ${body}`);
          // Persist provider details in server-only records; never expose recipient data in responses.
          const retryable = response.status === 429 || response.status >= 500;
          const retryAfter = response.headers.get("Retry-After");
          const retrySeconds = Number(retryAfter);
          const retryAt = retryAfter && !Number.isFinite(retrySeconds) ? Date.parse(retryAfter) : NaN;
          const delay = Number.isFinite(retryAt) ? Math.max(60_000, retryAt - Date.now())
            : Number.isFinite(retrySeconds) && retrySeconds > 0 ? Math.max(60_000, retrySeconds * 1000)
            : 60_000 * Math.pow(2, job.attempts);
          await finish({
            status: retryable && job.attempts < 5 ? "pending" : "failed",
            last_error: `[${response.status}]: ${body}`.slice(0, 2000),
            available_at: new Date(Date.now() + delay).toISOString(),
          });
          deferred++;
          continue;
        }
        const result = await response.json();
        await finish({ status: "sent", provider_id: result.id, sent_at: new Date().toISOString(), last_error: null });
        sent++;
      } catch (error) {
        console.error("Church alert processing failed:", error instanceof Error ? error.message : "Unknown failure");
        await finish({
          status: job.attempts < 5 ? "pending" : "failed",
          last_error: error instanceof Error ? error.message.slice(0, 2000) : "Processing failed",
          available_at: new Date(Date.now() + 60_000 * Math.pow(2, job.attempts)).toISOString(),
        });
        deferred++;
      }
    }
    const { count, error: remainingError } = await db.from("church_email_alerts")
      .select("id", { count: "exact", head: true }).in("status", ["pending", "processing"]);
    if (remainingError) throw remainingError;
    return json({ sent, skipped, deferred, remaining: count ?? 0 });
  } catch (error) {
    console.error("Church email worker:", error instanceof Error ? error.message : "Unknown failure");
    return json({ error: "Church alert processing failed; check protected delivery records and function logs" }, 500);
  }
});