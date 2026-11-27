export interface AttendeeExportInput {
  id: string;
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  occupation?: string | null;
  location?: string | null;
  date_of_birth?: string | null;
  category?: string | null;
  confirmed?: boolean | null;
  created_at?: string | null;
  churches?: {
    id?: string;
    name?: string | null;
    is_external?: boolean | null;
    privacy_mode?: string | null;
  } | null;
  inviters?: {
    full_name?: string | null;
  } | null;
}

export interface AttendeeExportRow {
  "Full Name": string;
  Phone: string;
  Email: string;
  Occupation: string;
  Location: string;
  Birthday: string;
  Category: string;
  "Church Center": string;
  "Church Type": string;
  "Privacy Mode": string;
  "Invited By": string;
  Status: string;
  "Registered At": string;
}

export function sanitizeCsvCell(value: unknown): string {
  let str = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export function formatBirthdayDisplay(dateOfBirth?: string | null): string {
  if (!dateOfBirth) return "";
  const match = String(dateOfBirth).match(/^\d{4}-(\d{2})-(\d{2})/);
  if (!match) return String(dateOfBirth);
  return `${match[1]}-${match[2]}`;
}

export function prepareAttendeeExportRows(attendees: AttendeeExportInput[]): AttendeeExportRow[] {
  return attendees.map((m) => {
    const church = m.churches;
    const isExternal = Boolean(church?.is_external);
    const privacyMode = isExternal ? (church?.privacy_mode || "masked") : "open";
    const categoryLabel =
      m.category === "dignitary"
        ? "VIP Dignitary"
        : m.category === "choir_member"
          ? "Special Choir"
          : "General";

    return {
      "Full Name": m.full_name || "",
      Phone: m.phone || "",
      Email: m.email || "",
      Occupation: m.occupation || "",
      Location: m.location || "",
      Birthday: formatBirthdayDisplay(m.date_of_birth),
      Category: categoryLabel,
      "Church Center": church?.name || "Direct Self-Registration",
      "Church Type": isExternal ? "External Church" : church?.name ? "Christ Embassy" : "Direct",
      "Privacy Mode": privacyMode,
      "Invited By": m.inviters?.full_name || "",
      Status: m.confirmed ? "Confirmed" : "Pending",
      "Registered At": m.created_at || "",
    };
  });
}

export function filterExternalChurchAttendees<T extends AttendeeExportInput>(attendees: T[]): T[] {
  return attendees.filter((m) => Boolean(m.churches?.is_external));
}

export function buildCsvContent(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]).filter((k) => typeof rows[0][k] !== "object" || rows[0][k] === null);
  const headerLine = headers.map((h) => (/^[=+\-@\t\r]/.test(h) ? `'${h}` : h)).join(",");
  const dataLines = rows.map((row) => headers.map((h) => sanitizeCsvCell(row[h])).join(","));
  return [headerLine, ...dataLines].join("\n");
}
