import test from "node:test";
import assert from "node:assert/strict";
import {
  isInvalidLoginCredentialError,
  normalizePrivacyMode,
  sanitizeChurchExportRow,
  validateExternalChurchPassword,
} from "./externalChurchAuth";

test("validateExternalChurchPassword enforces at least 6 non-whitespace characters", () => {
  assert.ok(validateExternalChurchPassword(""));
  assert.ok(validateExternalChurchPassword("   abc   "));
  assert.ok(validateExternalChurchPassword("12345"));
  assert.equal(validateExternalChurchPassword("secret1"), null);
});

test("normalizePrivacyMode treats legacy anonymized or unknown values as masked and preserves open", () => {
  assert.equal(normalizePrivacyMode("open"), "open");
  assert.equal(normalizePrivacyMode("masked"), "masked");
  assert.equal(normalizePrivacyMode("anonymized"), "masked");
  assert.equal(normalizePrivacyMode(null), "masked");
});

test("isInvalidLoginCredentialError matches Supabase Auth error strings", () => {
  assert.equal(isInvalidLoginCredentialError("Invalid login credentials"), true);
  assert.equal(isInvalidLoginCredentialError("Email not confirmed"), false);
});

test("sanitizeChurchExportRow strips any auth credential properties and formats church metadata", () => {
  const row = sanitizeChurchExportRow({
    id: "ch-1",
    name: "Grace Chapel",
    is_external: true,
    privacy_mode: "open",
    pastor_name: "Rev. Mensah",
    pastor_email: "mensah@grace.org",
    pastor_phone: "0241112222",
    location: "Dansoman",
    confirmed: 12,
    target: 150,
    auth_code: "should-never-appear",
    auth_code_hash: "$2a$06$hash",
  });

  assert.equal("auth_code" in row, false);
  assert.equal("auth_code_hash" in row, false);
  assert.equal(row.network_type, "External Church");
  assert.equal(row.privacy_mode, "open");
  assert.equal(row.pastor_email, "mensah@grace.org");
});
