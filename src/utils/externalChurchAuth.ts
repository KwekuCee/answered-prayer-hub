export type ExternalPrivacyMode = "masked" | "open";

export function validateExternalChurchPassword(password: string): string | null {
  const trimmed = password.trim();
  if (!trimmed) {
    return "Please create an Admin Portal Password (minimum 6 characters).";
  }
  if (trimmed.length < 6) {
    return "Admin Portal Password must be at least 6 characters so your church admin login stays secure.";
  }
  return null;
}

export function normalizePrivacyMode(mode?: string | null): ExternalPrivacyMode {
  return mode === "open" ? "open" : "masked";
}

export function isInvalidLoginCredentialError(message?: string | null): boolean {
  const lower = String(message ?? "").toLowerCase();
  return lower.includes("invalid login credentials") || lower.includes("invalid grant");
}

export function sanitizeChurchExportRow(church: Record<string, unknown>) {
  const { auth_code: _omittedAuthCode, auth_code_hash: _omittedHash, ...safeFields } = church;
  return {
    name: String(safeFields.name ?? ""),
    network_type: safeFields.is_external ? "External Church" : "Christ Embassy",
    privacy_mode: safeFields.is_external ? normalizePrivacyMode(safeFields.privacy_mode as string | null) : "open",
    pastor_name: String(safeFields.pastor_name ?? ""),
    pastor_email: String(safeFields.pastor_email ?? ""),
    pastor_phone: String(safeFields.pastor_phone ?? ""),
    location: String(safeFields.location ?? ""),
    confirmed: Number(safeFields.confirmed ?? 0),
    target: Number(safeFields.target ?? 100),
    delegation_notes: String(safeFields.delegation_notes ?? ""),
  };
}
