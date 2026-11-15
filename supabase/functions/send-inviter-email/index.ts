import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const escapeHtml = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    if (!SUPABASE_URL) throw new Error("SUPABASE_URL is not configured");

    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

    const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

    const body = await req.json();
    const memberId = body?.memberId as string | undefined;

    if (!memberId || !/^[0-9a-f-]{36}$/i.test(memberId)) {
      return new Response(JSON.stringify({ error: "memberId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: member, error: memberError } = await adminClient
      .from("members")
      .select("id, full_name, inviter_id, created_at, inviter_notified_at")
      .eq("id", memberId)
      .single();

    if (memberError || !member) {
      return new Response(JSON.stringify({ error: "Member not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only notify once, and only for a registration that just happened.
    const ageMs = Date.now() - new Date(member.created_at).getTime();
    if (member.inviter_notified_at || ageMs > 10 * 60 * 1000) {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: claimed } = await adminClient
      .from("members")
      .update({ inviter_notified_at: new Date().toISOString() })
      .eq("id", member.id)
      .is("inviter_notified_at", null)
      .select("id");
    if (!claimed || claimed.length === 0) {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!member.inviter_id) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "No inviter linked" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inviter, error: inviterError } = await adminClient
      .from("inviters")
      .select("full_name, email")
      .eq("id", member.inviter_id)
      .single();

    if (inviterError || !inviter?.email) {
      return new Response(JSON.stringify({ error: "Inviter email not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeMember = escapeHtml(member.full_name);
    const safeInviter = escapeHtml(inviter.full_name);
    const subject = `New member registration: ${String(member.full_name).replace(/[\r\n]/g, " ").slice(0, 100)}`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
        <h2 style="margin: 0 0 12px;">New member registered</h2>
        <p style="margin: 0 0 12px;">Hello ${safeInviter},</p>
        <p style="margin: 0 0 12px;"><strong>${safeMember}</strong> just registered through your invitation.</p>
        <p style="margin: 0;">Thank you for helping grow the Korle Bu Stands in Worship movement.</p>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [inviter.email],
        subject,
        html,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend API failed", resendResponse.status, resendData);
      throw new Error("Email delivery failed");
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
