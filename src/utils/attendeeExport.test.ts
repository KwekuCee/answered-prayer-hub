import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCsvContent,
  filterExternalChurchAttendees,
  formatBirthdayDisplay,
  prepareAttendeeExportRows,
} from "./attendeeExport";

test("prepareAttendeeExportRows preserves unmasked contact details and church privacy metadata for follow-up", () => {
  const rows = prepareAttendeeExportRows([
    {
      id: "m-1",
      full_name: "Abena Osei",
      phone: "+233240998877",
      email: "abena@example.com",
      occupation: "Nurse",
      location: "Korle Bu",
      date_of_birth: "2000-05-14",
      category: "general",
      confirmed: false,
      created_at: "2026-11-27T08:00:00Z",
      churches: {
        id: "c-1",
        name: "Grace Covenant Chapel",
        is_external: true,
        privacy_mode: "masked",
      },
      inviters: { full_name: "Pastor Mensah" },
    },
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0]["Full Name"], "Abena Osei");
  assert.equal(rows[0].Phone, "+233240998877");
  assert.equal(rows[0].Email, "abena@example.com");
  assert.equal(rows[0].Birthday, "05-14");
  assert.equal(rows[0]["Church Center"], "Grace Covenant Chapel");
  assert.equal(rows[0]["Church Type"], "External Church");
  assert.equal(rows[0]["Privacy Mode"], "masked");
  assert.equal(rows[0]["Invited By"], "Pastor Mensah");
  assert.equal(rows[0].Status, "Pending");
});

test("filterExternalChurchAttendees returns only external partner church attendees", () => {
  const list = [
    { id: "1", churches: { is_external: true } },
    { id: "2", churches: { is_external: false } },
    { id: "3", churches: null },
  ];
  const filtered = filterExternalChurchAttendees(list);
  assert.deepEqual(
    filtered.map((i) => i.id),
    ["1"]
  );
});

test("buildCsvContent neutralizes formula injection prefixes", () => {
  const csv = buildCsvContent([{ Name: "=CMD()", Phone: "+233240000000" }]);
  assert.match(csv, /"'=CMD\(\)"/);
  assert.match(csv, /"'\+233240000000"/);
  assert.equal(formatBirthdayDisplay("2000-12-09"), "12-09");
});
