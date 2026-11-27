export function formatMemberRegistrationError(err: unknown): string {
  const message =
    err && typeof err === "object" && "message" in err && typeof (err as { message?: unknown }).message === "string"
      ? (err as { message: string }).message.trim()
      : typeof err === "string"
        ? err.trim()
        : "";

  if (!message) {
    return "Registration failed. Please try again.";
  }

  if (message.includes("members_category_check")) {
    return "Database registration schema needs the latest category update. Please run supabase/migrations/20261127000000_fix_members_category_check.sql (or my_all.sql) in Supabase SQL Editor.";
  }

  return message;
}
