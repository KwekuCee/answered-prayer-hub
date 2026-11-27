export type AlertKind = "inviter_registered" | "daily_attendees";

export interface ChurchAlert {
  kind: AlertKind;
  churchName: string;
  adminName: string;
  inviterName?: string;
  reportDate?: string;
  attendeeCount?: number;
}

// Email-safe equivalents of the Korle Bu Stands in Worship dark, navy, and gold design tokens.
export const emailTheme = {
  background: "#000000",
  surface: "#0d121d",
  panel: "#141d2e",
  gold: "#d4af37",
  goldLight: "#e5c96e",
  text: "#f1efe9",
  muted: "#b5afa3",
  border: "#232d42",
  bodyFont: "'DM Sans', Arial, sans-serif",
  headingFont: "'Playfair Display', Georgia, serif",
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
  const cleanSiteUrl = siteUrl.replace(/\/$/, "");
  const daily = alert.kind === "daily_attendees";
  const kicker = daily ? "End-of-Day Attendance Report" : "New Inviter Registration";
  const title = daily ? "Daily Attendee Summary" : "A New Inviter Has Registered";
  const subject = (daily
    ? `${alert.churchName}: ${alert.attendeeCount ?? 0} attendee registrations for ${alert.reportDate}`
    : `${alert.churchName}: New inviter registered (${alert.inviterName ?? "Inviter"})`
  ).replace(/[\r\n]/g, " ").slice(0, 200);
  const detail = daily
    ? `${alert.attendeeCount ?? 0} attendees registered under ${alert.churchName} on ${alert.reportDate}.`
    : `${alert.inviterName ?? "An inviter"} has registered under ${alert.churchName}.`;
  const t = emailTheme;
  const count = alert.attendeeCount ?? 0;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${e(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${t.background};color:${t.text};font-family:${t.bodyFont};-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${e(detail)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${t.background};">
    <tr>
      <td align="center" style="padding:36px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:${t.surface};border:1px solid ${t.border};border-top:3px solid ${t.gold};border-radius:16px;overflow:hidden;">
          <tr>
            <td align="center" bgcolor="${t.background}" style="padding:32px 24px 20px;background-color:${t.background};background:${t.background};border-bottom:1px solid ${t.border};">
              <img src="${e(logoUrl)}" alt="Korle Bu Stands in Worship 2026" width="190" style="display:block;width:190px;max-width:100%;height:auto;margin:0 auto;">
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px;">
              <p style="margin:0 0 8px;color:${t.gold};font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;">${e(kicker)} &middot; ${e(alert.churchName)}</p>
              <h1 style="margin:0 0 20px;font-family:${t.headingFont};font-size:28px;line-height:1.25;color:${t.text};">${title}</h1>
              <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:${t.text};">Hello ${e(alert.adminName || "Church Administrator")},</p>
              <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:${t.muted};">${e(detail)}</p>
              ${daily
                ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0 24px;background:${t.panel};border:1px solid ${t.border};border-radius:12px;">
                    <tr>
                      <td style="padding:22px 24px;text-align:center;">
                        <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${t.goldLight};">Total Attendees Registered</p>
                        <p style="margin:0;font-family:${t.headingFont};font-size:48px;line-height:1.1;font-weight:700;color:${t.gold};">${e(count)}</p>
                        <p style="margin:10px 0 0;font-size:13px;color:${t.muted};">${e(alert.reportDate)} &middot; Ghana Time (Africa/Accra)</p>
                      </td>
                    </tr>
                  </table>`
                : `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0 24px;background:${t.panel};border:1px solid ${t.border};border-radius:12px;">
                    <tr>
                      <td style="padding:18px 22px;">
                        <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${t.goldLight};">Registered Inviter</p>
                        <p style="margin:0;font-size:18px;font-weight:700;color:${t.text};">${e(alert.inviterName ?? "Inviter")}</p>
                        <p style="margin:6px 0 0;font-size:13px;color:${t.muted};">Assigned to ${e(alert.churchName)}</p>
                      </td>
                    </tr>
                  </table>`}
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:8px;">
                <tr>
                  <td style="background:${t.gold};border-radius:10px;">
                    <a href="${e(cleanSiteUrl)}/church-admin" style="display:inline-block;padding:13px 24px;color:${t.background};font-size:14px;font-weight:700;text-decoration:none;">Open Church Dashboard</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 28px;background:${t.background};border-top:1px solid ${t.border};color:${t.muted};font-size:12px;line-height:1.65;">
              <strong style="color:${t.goldLight};">Korle Bu Stands in Worship 2026</strong><br>
              Automated administrator alert sent to verified church administrator accounts.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject,
    html,
    text: `Korle Bu Stands in Worship 2026\n${alert.churchName}\nHello ${alert.adminName || "Church Administrator"},\n${detail}\n${cleanSiteUrl}/church-admin`,
  };
}