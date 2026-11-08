// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
    try {
        // Webhook payload from Supabase
        const payload = await req.json()
        const record = payload.record

        if (!record || !record.email) {
            return new Response(JSON.stringify({ message: "No email provided. Skipping." }), {
                headers: { "Content-Type": "application/json" },
                status: 200, // Return 200 so webhook doesn't retry indefinitely
            })
        }

        const { email, full_name } = record

        // Call Resend API to send the Welcome Email
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                // IMPORTANT: Replace with the actual verified domain you set up in Resend
                from: 'Korle Bu Stands in Worship <onboarding@resend.dev>',
                to: [email],
                subject: 'Welcome to Korle Bu Stands in Worship!',
                html: `
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); font-family: sans-serif; text-align: center; color: #0a1128;">
            <div style="margin-bottom: 30px;">
                <img src="https://answered-prayer-hub.web.app/logo.png" alt="Korle Bu Stands in Worship" style="max-height: 100px; width: auto; border-radius: 12px; margin: 0 auto; display: block;" onerror="this.src='https://placehold.co/100x100/0a1128/bf953f?text=AP'" />
            </div>
            <h1 style="color: #bf953f; font-size: 28px;">Welcome, ${full_name}!</h1>
            <p style="font-size: 16px; color: #334155; line-height: 1.6; margin-bottom: 10px;">We are absolutely thrilled to have you with us.</p>
            <p style="font-size: 16px; color: #334155; line-height: 1.6; margin-bottom: 30px;">Stay tuned for life-transforming services and powerful community updates!</p>
            <a href="https://answered-prayer-hub.web.app/live" style="display: inline-block; background-color: #bf953f; color: #0a1128; font-weight: bold; text-decoration: none; padding: 14px 32px; border-radius: 8px; margin-bottom: 30px; border: 2px solid #bf953f;">
                Join the Next Service
            </a>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
            <p style="color: #64748b; font-size: 13px; margin: 0;"><strong>The Korle Bu Stands in Worship</strong><br>A Place of Divine Encounters</p>
          </div>
        `,
            }),
        })

        const data = await res.json()
        return new Response(JSON.stringify(data), {
            headers: { "Content-Type": "application/json" },
            status: res.ok ? 200 : 400,
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { "Content-Type": "application/json" },
            status: 500,
        })
    }
})
