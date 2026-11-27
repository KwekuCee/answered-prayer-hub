import test from "node:test";
import assert from "node:assert/strict";
import { mergeChatMessages, removeChatMessage, upsertChatMessage, type LiveChatMessage } from "./liveChat";

test("upsertChatMessage adds an optimistic message immediately and replaces it on server confirmation", () => {
  const initial: LiveChatMessage[] = [
    { id: "1", user_name: "Ama", message: "Amen!", created_at: "2026-11-27T10:00:00.000Z" },
  ];

  const afterOptimistic = upsertChatMessage(initial, {
    id: "temp-123",
    user_name: "Kofi",
    message: "Hallelujah!",
    created_at: "2026-11-27T10:00:05.000Z",
    optimistic: true,
  });

  assert.equal(afterOptimistic.length, 2);
  assert.equal(afterOptimistic[1].optimistic, true);

  const afterRealtime = upsertChatMessage(afterOptimistic, {
    id: "uuid-server-1",
    user_name: "Kofi",
    message: "Hallelujah!",
    created_at: "2026-11-27T10:00:05.100Z",
  });

  assert.equal(afterRealtime.length, 2);
  assert.equal(afterRealtime[1].id, "uuid-server-1");
  assert.equal(afterRealtime[1].optimistic, false);
});

test("upsertChatMessage removes deleted messages and deduplicates repeats", () => {
  const current: LiveChatMessage[] = [
    { id: "1", user_name: "Ama", message: "Praise God", created_at: "2026-11-27T10:00:00.000Z" },
  ];

  const deduped = upsertChatMessage(current, current[0]);
  assert.equal(deduped.length, 1);

  const deleted = upsertChatMessage(deduped, { ...current[0], is_deleted: true });
  assert.equal(deleted.length, 0);

  assert.equal(removeChatMessage(current, "1").length, 0);
});

test("mergeChatMessages reconciles server snapshots with pending optimistic messages", () => {
  const current: LiveChatMessage[] = [
    { id: "temp-1", user_name: "Kofi", message: "Pending", created_at: "2026-11-27T10:01:00.000Z", optimistic: true },
    { id: "temp-2", user_name: "Ama", message: "Confirmed", created_at: "2026-11-27T10:00:30.000Z", optimistic: true },
  ];

  const merged = mergeChatMessages(current, [
    { id: "srv-1", user_name: "Ama", message: "Confirmed", created_at: "2026-11-27T10:00:30.000Z" },
    { id: "srv-2", user_name: "Hidden", message: "Spam", created_at: "2026-11-27T10:00:10.000Z", is_deleted: true },
  ]);

  assert.deepEqual(merged.map((m) => m.id), ["srv-1", "temp-1"]);
});
