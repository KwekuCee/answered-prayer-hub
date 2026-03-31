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
                from: 'Answered Prayer Hub <onboarding@resend.dev>',
                to: [email],
                subject: 'Welcome to the Answered Prayer Hub!',
                html: `
          <div style="font-family: sans-serif; text-align: center; color: #0a1128;">
            <h1 style="color: #bf953f;">Welcome, ${full_name}!</h1>
            <p style="font-size: 16px;">We are absolutely thrilled to have you with us.</p>
            <p style="font-size: 16px;">Stay tuned for life-transforming services!</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="color: #666; font-size: 12px;">The Answered Prayer Hub</p>
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
