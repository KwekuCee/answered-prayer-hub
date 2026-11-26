import { describe, expect, it } from "vitest";
import {
  alertEventKey,
  inReportingDay,
  isChurchRecipient,
  previousGhanaDay,
  renderChurchAlert,
} from "../../supabase/functions/_shared/church-alerts";

describe("church administrator alert rules", () => {
  it("only targets church administrators linked to the registering church", () => {
    expect(isChurchRecipient("church-a", { church_id: "church-a" }, ["church_admin"])).toBe(true);
    expect(isChurchRecipient("church-a", { church_id: "church-b" }, ["church_admin"])).toBe(false);
    expect(isChurchRecipient("church-a", { church_id: null }, ["church_admin"])).toBe(false);
    expect(isChurchRecipient("church-a", { church_id: "church-a" }, ["super_admin"])).toBe(false);
  });
  it("summarizes the completed Ghana day, not today's partial count", () => {
    expect(previousGhanaDay(new Date("2026-11-27T00:05:00Z"))).toEqual({
      date: "2026-11-26", start: "2026-11-26T00:00:00.000Z", end: "2026-11-27T00:00:00.000Z",
    });
  });
  it("counts registrations from midnight inclusive to the next midnight exclusive", () => {
    const { start, end } = previousGhanaDay(new Date("2026-11-27T00:05:00Z"));
    expect(inReportingDay("2026-11-26T00:00:00Z", start, end)).toBe(true);
    expect(inReportingDay("2026-11-26T23:59:59Z", start, end)).toBe(true);
    expect(inReportingDay("2026-11-25T23:59:59Z", start, end)).toBe(false);
    expect(inReportingDay("2026-11-27T00:00:00Z", start, end)).toBe(false);
  });
  it("deduplicates each registration alert per administrator without merging other events", () => {
    const key = alertEventKey("inviter_registered", "inviter-1", "admin-1");
    expect(key).toBe(alertEventKey("inviter_registered", "inviter-1", "admin-1"));
    expect(key).not.toBe(alertEventKey("inviter_registered", "inviter-2", "admin-1"));
    expect(key).not.toBe(alertEventKey("inviter_registered", "inviter-1", "admin-2"));
  });
  it("allows one daily summary per church, day and administrator", () => {
    const key = alertEventKey("daily_attendees", "church-a:2026-11-26", "admin-1");
    expect(key).toBe(alertEventKey("daily_attendees", "church-a:2026-11-26", "admin-1"));
    expect(key).not.toBe(alertEventKey("daily_attendees", "church-a:2026-11-27", "admin-1"));
    expect(key).not.toBe(alertEventKey("daily_attendees", "church-b:2026-11-26", "admin-1"));
  });
  it("renders Korle Bu Stands in Worship branded inviter alert HTML and text without legacy strings", () => {
    const { subject, html, text } = renderChurchAlert(
      {
        kind: "inviter_registered",
        churchName: "Grace Sanctuary <Central>",
        adminName: "Pastor Daniel",
        inviterName: "Esi <script>alert(1)</script>",
      },
      "https://korlebustandsinworship.org",
      "https://korlebustandsinworship.org/images/email-logo.webp",
    );
    expect(subject).toContain("Grace Sanctuary");
    expect(html).toContain("Korle Bu Stands in Worship 2026");
    expect(html).toContain("https://korlebustandsinworship.org/images/email-logo.webp");
    expect(html).toContain("https://korlebustandsinworship.org/church-admin");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toMatch(/100% Answered Prayer|Isaac Musah|cekbu/i);
    expect(text).toContain("Korle Bu Stands in Worship 2026");
    expect(text).not.toMatch(/100% Answered Prayer|Isaac Musah|cekbu/i);
  });
  it("renders end-of-day attendee count summary with Korle Bu branding", () => {
    const { subject, html, text } = renderChurchAlert(
      {
        kind: "daily_attendees",
        churchName: "Zion Assemblies",
        adminName: "Rev. Mensah",
        reportDate: "2026-11-26",
        attendeeCount: 42,
      },
      "https://korlebustandsinworship.org/",
      "https://korlebustandsinworship.org/images/email-logo.webp",
    );
    expect(subject).toContain("42 attendee registrations");
    expect(html).toContain(">42<");
    expect(html).toContain("2026-11-26");
    expect(html).toContain("https://korlebustandsinworship.org/church-admin");
    expect(text).toContain("42 attendees registered under Zion Assemblies on 2026-11-26");
  });
});