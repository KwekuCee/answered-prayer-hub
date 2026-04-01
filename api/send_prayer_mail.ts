export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    try {
        const { to, subject, html } = await req.json();

        if (!to || !subject || !html) {
            return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });
        }

        const resendApiKey = process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY;

        if (!resendApiKey) {
            return new Response(JSON.stringify({ error: 'Server is missing Resend API Key.' }), { status: 500 });
        }

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
                from: '100% Answered Prayer <onboarding@resend.dev>',
                to: Array.isArray(to) ? to : [to],
                subject: subject,
                html: html,
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            return new Response(JSON.stringify(data), { status: 400 });
        }

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
