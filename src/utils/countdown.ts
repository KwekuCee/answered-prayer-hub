export const EVENT_TARGET_ISO = "2026-12-18T17:00:00Z";

export interface CountdownParts {
  days: string;
  hours: string;
  minutes: string;
  isComplete: boolean;
}

export function getCountdownParts(
  now: Date | number = Date.now(),
  targetIso: string = EVENT_TARGET_ISO,
): CountdownParts {
  const nowMs = now instanceof Date ? now.getTime() : now;
  const targetMs = Date.parse(targetIso);

  if (!Number.isFinite(nowMs) || !Number.isFinite(targetMs)) {
    return { days: "00", hours: "00", minutes: "00", isComplete: true };
  }

  const diffMs = targetMs - nowMs;
  if (diffMs <= 0) {
    return { days: "00", hours: "00", minutes: "00", isComplete: true };
  }

  const totalMinutes = Math.floor(diffMs / 60_000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  return {
    days: String(days).padStart(2, "0"),
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    isComplete: false,
  };
}

export function splitDigits(value: string): string[] {
  return value.padStart(2, "0").split("");
}
