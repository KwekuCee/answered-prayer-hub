export const BIRTHDAY_MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

// Leap year placeholder kept strictly in the past so any month/day (including Feb 29)
// satisfies Postgres date columns and non-future birth-date checks.
const BIRTHDAY_SENTINEL_YEAR = "2000";

export function getDaysInBirthdayMonth(month: string): number {
  if (month === "02") return 29;
  if (month === "04" || month === "06" || month === "09" || month === "11") {
    return 30;
  }
  return 31;
}

export function buildBirthdayDateString(month: string, day: string): string | null {
  const cleanMonth = month.trim().padStart(2, "0");
  if (!BIRTHDAY_MONTHS.some((entry) => entry.value === cleanMonth)) {
    return null;
  }

  const dayNumber = Number.parseInt(day.trim(), 10);
  const maxDay = getDaysInBirthdayMonth(cleanMonth);
  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > maxDay) {
    return null;
  }

  return `${BIRTHDAY_SENTINEL_YEAR}-${cleanMonth}-${String(dayNumber).padStart(2, "0")}`;
}
