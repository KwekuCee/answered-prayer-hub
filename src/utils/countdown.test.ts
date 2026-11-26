import test from "node:test";
import assert from "node:assert/strict";
import { EVENT_TARGET_ISO, getCountdownParts, splitDigits } from "./countdown";

test("calculates exact days, hours, and minutes before December 18 target", () => {
  const sampleNow = Date.parse("2026-11-26T14:15:00Z");
  const result = getCountdownParts(sampleNow, EVENT_TARGET_ISO);
  // Nov 26 14:15 -> Dec 18 17:00 = 22 days, 2 hours, 45 minutes
  assert.deepEqual(result, {
    days: "22",
    hours: "02",
    minutes: "45",
    isComplete: false,
  });
});

test("pads single-digit values cleanly and splits individual digits", () => {
  const sampleNow = Date.parse("2026-12-17T08:51:00Z");
  const result = getCountdownParts(sampleNow, EVENT_TARGET_ISO);
  assert.deepEqual(result, {
    days: "01",
    hours: "08",
    minutes: "09",
    isComplete: false,
  });
  assert.deepEqual(splitDigits(result.days), ["0", "1"]);
  assert.deepEqual(splitDigits(result.hours), ["0", "8"]);
  assert.deepEqual(splitDigits(result.minutes), ["0", "9"]);
});

test("returns 00:00:00 when current time reaches or passes target date", () => {
  const atTarget = Date.parse(EVENT_TARGET_ISO);
  assert.deepEqual(getCountdownParts(atTarget, EVENT_TARGET_ISO), {
    days: "00",
    hours: "00",
    minutes: "00",
    isComplete: true,
  });

  const pastTarget = Date.parse("2026-12-25T10:00:00Z");
  assert.deepEqual(getCountdownParts(pastTarget, EVENT_TARGET_ISO), {
    days: "00",
    hours: "00",
    minutes: "00",
    isComplete: true,
  });
});
