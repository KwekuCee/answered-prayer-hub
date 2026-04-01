import nodemailer from 'nodemailer';

export default async function handler(req: any, res: any) {
    // CORS Headers for secure cross-origin invocation
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { to, subject, html } = req.body;

        if (!to || !subject || !html) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        const user = process.env.VITE_GMAIL_USER || process.env.GMAIL_USER;
        const pass = process.env.VITE_GMAIL_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD;

        if (!user || !pass) {
            return res.status(500).json({ error: 'Server is missing Gmail SMTP Credentials. Please add VITE_GMAIL_USER and VITE_GMAIL_APP_PASSWORD to your .env or Vercel Environment Variables.' });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user, pass }
        });

        const mailOptions = {
            from: `"100% Answered Prayer" <${user}>`,
            to: Array.isArray(to) ? to : [to],
            subject: subject,
            html: html,
        };

        const info = await transporter.sendMail(mailOptions);

        return res.status(200).json({ status: 'success', info });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
