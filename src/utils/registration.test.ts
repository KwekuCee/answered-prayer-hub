import test from "node:test";
import assert from "node:assert/strict";
import { formatMemberRegistrationError } from "./registration";

test("formatMemberRegistrationError clarifies members_category_check constraint failure", () => {
  const formatted = formatMemberRegistrationError({
    message: 'new row for relation "members" violates check constraint "members_category_check"',
  });
  assert.match(formatted, /20261127000000_fix_members_category_check\.sql/);
  assert.match(formatted, /my_all\.sql/);
});

test("formatMemberRegistrationError preserves regular error messages and handles empty values", () => {
  assert.equal(formatMemberRegistrationError(new Error("Name and phone are required")), "Name and phone are required");
  assert.equal(formatMemberRegistrationError(null), "Registration failed. Please try again.");
});
