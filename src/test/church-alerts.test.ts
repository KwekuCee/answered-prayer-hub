import { describe, expect, it } from "vitest";
import { alertEventKey, inReportingDay, isChurchRecipient, previousGhanaDay } from "../../supabase/functions/_shared/church-alerts";

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
});