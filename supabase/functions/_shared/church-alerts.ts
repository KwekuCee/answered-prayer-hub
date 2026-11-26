export type AlertKind = "inviter_registered" | "daily_attendees";

export interface ChurchAlert {
  kind: AlertKind;
  churchName: string;
  adminName: string;
  inviterName?: string;
  reportDate?: string;
  attendeeCount?: number;
}

// Email-safe equivalents of the site's navy, gold and typography tokens.
export const emailTheme = {
  background: "#000000", surface: "#141d2e", gold: "#d9a626",
  text: "#f1efe9", muted: "#b5afa3", border: "#232d42",
  bodyFont: "'DM Sans', Arial, sans-serif", headingFont: "'Playfair Display', Georgia, serif",
};

export function escapeHtml(value: unknown): string {
  const entities: Record<string, string> = {
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  };
  return String(value ?? "").replace(/[&<>"']/g, character => entities[character] ?? character);
}

export function alertEventKey(kind: AlertKind, event: string, recipientUserId: string): string {
  return `church-alert:${kind}:${event}:${recipientUserId}`;
}

export function isChurchRecipient(
  churchId: string,
  profile: { church_id: string | null },
  roles: string[],
): boolean {
  return profile.church_id === churchId && roles.includes("church_admin");
}

// Ghana does not use daylight saving; both boundaries are midnight Ghana/UTC.
export function previousGhanaDay(now: Date): { date: string; start: string; end: string } {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end.getTime() - 86_400_000);
  return { date: start.toISOString().slice(0, 10), start: start.toISOString(), end: end.toISOString() };
}

export function inReportingDay(createdAt: string, start: string, end: string): boolean {
  const timestamp = new Date(createdAt).getTime();
  return timestamp >= new Date(start).getTime() && timestamp < new Date(end).getTime();
}

export function renderChurchAlert(alert: ChurchAlert, siteUrl: string, logoUrl: string) {
  const e = escapeHtml;
  const daily = alert.kind === "daily_attendees";
  const title = daily ? "Your daily attendee summary" : "A new inviter has registered";
  const subject = (daily
    ? `${alert.churchName}: attendee registrations for ${alert.reportDate}`
    : `${alert.churchName}: new inviter registered`).replace(/[\r\n]/g, " ").slice(0, 200);
  const detail = daily
    ? `${alert.attendeeCount ?? 0} attendees registered under your church on ${alert.reportDate}.`
    : `${alert.inviterName ?? "An inviter"} has registered under your church.`;
  const t = emailTheme;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:${t.background};color:${t.text};font-family:${t.bodyFont}">
<div style="display:none;max-height:0;overflow:hidden">${e(detail)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${t.background}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;border-top:3px solid ${t.gold}">
<tr><td align="center" style="padding:30px 24px"><img src="${e(logoUrl)}" alt="100% Answered Prayer" width="210" style="display:block;width:210px;max-width:100%;height:auto"></td></tr>
<tr><td style="background:${t.surface};padding:32px 24px">
<p style="margin:0 0 12px;color:${t.gold};font-size:14px">${e(alert.churchName)}</p>
<h1 style="margin:0 0 24px;font-family:${t.headingFont};font-size:28px;line-height:1.3;color:${t.text}">${title}</h1>
<p style="line-height:1.7">Hello ${e(alert.adminName || "Church Administrator")},</p>
<p style="line-height:1.7">${e(detail)}</p>
${daily ? `<p style="margin:24px 0;font-size:48px;line-height:1.2;color:${t.gold}">${e(alert.attendeeCount ?? 0)}</p><p style="color:${t.muted};font-size:14px">New registrations · ${e(alert.reportDate)} · Ghana time</p>` : ""}
<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:28px"><tr><td style="background:${t.gold};border-radius:6px"><a href="${e(siteUrl)}/church-admin" style="display:inline-block;padding:14px 22px;color:${t.background};font-weight:bold;text-decoration:none">Open church dashboard</a></td></tr></table>
</td></tr>
<tr><td style="padding:24px;color:${t.muted};font-size:12px;line-height:1.7;border-bottom:1px solid ${t.border}">100% Answered Prayer · With Pastor Dr. Isaac Musah<br>This registration alert is for your church administrator account.</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, html, text: `100% Answered Prayer\n${alert.churchName}\nHello ${alert.adminName || "Church Administrator"},\n${detail}\n${siteUrl}/church-admin` };
}