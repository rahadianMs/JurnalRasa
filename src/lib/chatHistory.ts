import type { ChatConversationMeta, ChatMessage } from '../types';

type ChatStorage = Pick<Storage, 'getItem' | 'setItem'>;

function readArray<T>(storage: ChatStorage, key: string): T[] {
  try {
    const value = JSON.parse(storage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function readActiveConversation(storage: ChatStorage, uid: string): string | null {
  try { return storage.getItem(`jr_active_conv_${uid}`); } catch { return null; }
}

export function readConversationList(storage: ChatStorage, uid: string): ChatConversationMeta[] {
  return readArray<ChatConversationMeta>(storage, `jr_conv_list_${uid}`)
    .filter(c => c && typeof c.id === 'string' && typeof c.updatedAt === 'string');
}

export const messageCacheKey = (uid: string, id: string) => `jr_msgs_${uid}_${id}`;

export function readMessages(storage: ChatStorage, uid: string, id: string): ChatMessage[] {
  let messages = readArray<ChatMessage>(storage, messageCacheKey(uid, id));
  // Older versions used unscoped keys. Only read them with evidence of ownership.
  if (!messages.length && (readActiveConversation(storage, uid) === id ||
      readConversationList(storage, uid).some(c => c.id === id))) {
    messages = readArray<ChatMessage>(storage, `jr_msgs_${id}`);
  }
  return messages.filter(m => m && typeof m.id === 'string' && typeof m.content === 'string' &&
    (m.role === 'user' || m.role === 'model'));
}

export function mergeConversations(remote: ChatConversationMeta[], local: ChatConversationMeta[]) {
  const byId = new Map(remote.map(c => [c.id, c]));
  for (const item of local) {
    const existing = byId.get(item.id);
    if (!existing || item.updatedAt >= existing.updatedAt) byId.set(item.id, item);
  }
  return [...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function mergeMessages(remote: ChatMessage[], local: ChatMessage[]): ChatMessage[] {
  const byId = new Map([...remote, ...local].map(m => [m.id, m]));
  return [...byId.values()].sort((a, b) => {
    if (a.id.startsWith('welcome')) return -1;
    if (b.id.startsWith('welcome')) return 1;
    return a.id.localeCompare(b.id, undefined, { numeric: true });
  });
}

// Commit all local pointers before attempting cloud I/O, including the first user message.
export function saveLocalConversation(
  storage: ChatStorage, uid: string, id: string, messages: ChatMessage[], summary: string,
  now = new Date().toISOString(), activate = true,
) {
  const previous = readConversationList(storage, uid);
  const meta: ChatConversationMeta = {
    id, summary, createdAt: previous.find(c => c.id === id)?.createdAt || now,
    updatedAt: now, messageCount: messages.filter(m => !m.id.startsWith('welcome')).length,
  };
  const list = mergeConversations(previous, [meta]);
  storage.setItem(messageCacheKey(uid, id), JSON.stringify(messages));
  storage.setItem(`jr_conv_list_${uid}`, JSON.stringify(list));
  if (activate) storage.setItem(`jr_active_conv_${uid}`, id);
  return { meta, list };
}
