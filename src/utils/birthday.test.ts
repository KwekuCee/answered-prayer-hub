import test from "node:test";
import assert from "node:assert/strict";
import { buildBirthdayDateString, getDaysInBirthdayMonth } from "./birthday";

test("returns correct maximum days per month including leap day for February", () => {
  assert.equal(getDaysInBirthdayMonth("02"), 29);
  assert.equal(getDaysInBirthdayMonth("04"), 30);
  assert.equal(getDaysInBirthdayMonth("09"), 30);
  assert.equal(getDaysInBirthdayMonth("12"), 31);
});

test("builds valid past Postgres date string from month and day without a user-supplied year", () => {
  assert.equal(buildBirthdayDateString("12", "18"), "2000-12-18");
  assert.equal(buildBirthdayDateString("02", "29"), "2000-02-29");
  assert.equal(buildBirthdayDateString("2", "5"), "2000-02-05");
});

test("returns null for incomplete or invalid month/day combinations", () => {
  assert.equal(buildBirthdayDateString("", "15"), null);
  assert.equal(buildBirthdayDateString("05", ""), null);
  assert.equal(buildBirthdayDateString("02", "30"), null);
  assert.equal(buildBirthdayDateString("04", "31"), null);
  assert.equal(buildBirthdayDateString("13", "01"), null);
});
