export interface LiveChatMessage {
  id: string;
  user_name: string;
  message: string;
  created_at: string;
  is_deleted?: boolean;
  optimistic?: boolean;
}

function compareChatTimestamps(a: LiveChatMessage, b: LiveChatMessage): number {
  const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  if (!Number.isNaN(diff) && diff !== 0) return diff;
  return a.id.localeCompare(b.id);
}

export function upsertChatMessage(
  current: LiveChatMessage[],
  incoming: LiveChatMessage,
  optimisticId?: string,
): LiveChatMessage[] {
  if (incoming.is_deleted) {
    return removeChatMessage(current, incoming.id);
  }

  let replacedOptimistic = false;
  const next: LiveChatMessage[] = [];

  for (const item of current) {
    if (item.id === incoming.id) {
      continue;
    }
    if (optimisticId && item.id === optimisticId) {
      replacedOptimistic = true;
      continue;
    }
    if (
      !optimisticId &&
      !replacedOptimistic &&
      item.optimistic &&
      item.user_name === incoming.user_name &&
      item.message === incoming.message
    ) {
      replacedOptimistic = true;
      continue;
    }
    next.push(item);
  }

  next.push({ ...incoming, optimistic: incoming.optimistic ?? false });
  return next.sort(compareChatTimestamps);
}

export function removeChatMessage(
  current: LiveChatMessage[],
  id: string,
): LiveChatMessage[] {
  return current.filter((item) => item.id !== id);
}

export function mergeChatMessages(
  current: LiveChatMessage[],
  incoming: LiveChatMessage[],
): LiveChatMessage[] {
  const confirmed = incoming.filter((msg) => !msg.is_deleted);
  const optimisticOnly = current.filter(
    (item) =>
      item.optimistic &&
      !confirmed.some(
        (srv) => srv.user_name === item.user_name && srv.message === item.message,
      ),
  );

  const byId = new Map<string, LiveChatMessage>();
  for (const msg of confirmed) {
    byId.set(msg.id, { ...msg, optimistic: false });
  }
  for (const temp of optimisticOnly) {
    byId.set(temp.id, temp);
  }

  return Array.from(byId.values()).sort(compareChatTimestamps);
}
