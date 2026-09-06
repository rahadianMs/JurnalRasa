import test from "node:test";
import assert from "node:assert/strict";
import { readActiveConversation, readConversationList, readMessages, saveLocalConversation, mergeConversations, mergeMessages } from "./chatHistory.ts";

function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
}
const message = { id: "100", role: "user" as const, content: "Find noodles", timestamp: "10:00" };
const meta = { id: "conv_one", summary: "Noodles", createdAt: "2026-09-06T10:00:00Z", updatedAt: "2026-09-06T10:00:00Z", messageCount: 1 };

test("first message restores the active session and History without cloud or an AI reply", () => {
  const storage = memoryStorage();
  saveLocalConversation(storage, "alice", meta.id, [message], meta.summary, meta.createdAt);
  assert.equal(readActiveConversation(storage, "alice"), meta.id);
  assert.deepEqual(readConversationList(storage, "alice"), [meta]);
  assert.deepEqual(readMessages(storage, "alice", meta.id), [message]);
});

test("message caches are isolated by user", () => {
  const storage = memoryStorage();
  saveLocalConversation(storage, "alice", meta.id, [message], meta.summary);
  assert.deepEqual(readMessages(storage, "bob", meta.id), []);
  assert.equal(readActiveConversation(storage, "bob"), null);
});

test("legacy messages are readable only through the owner's saved conversation index", () => {
  const storage = memoryStorage();
  storage.setItem(`jr_msgs_${meta.id}`, JSON.stringify([message]));
  storage.setItem("jr_conv_list_alice", JSON.stringify([meta]));
  assert.deepEqual(readMessages(storage, "alice", meta.id), [message]);
  assert.deepEqual(readMessages(storage, "bob", meta.id), []);
});

test("old cloud results preserve newer local metadata and unsynced messages", () => {
  const newer = { ...meta, summary: "New topic", updatedAt: "2026-09-06T11:00:00Z" };
  assert.deepEqual(mergeConversations([meta], [newer]), [newer]);
  const reply = { ...message, id: "101", role: "model" as const, content: "Try ramen" };
  assert.deepEqual(mergeMessages([message], [message, reply]), [message, reply]);
});

test("corrupt caches do not crash the chat", () => {
  const storage = memoryStorage();
  storage.setItem("jr_conv_list_alice", "{}");
  storage.setItem(`jr_msgs_alice_${meta.id}`, "{broken");
  assert.deepEqual(readConversationList(storage, "alice"), []);
  assert.deepEqual(readMessages(storage, "alice", meta.id), []);
});

test("storage failures are surfaced to the caller", () => {
  const storage = { ...memoryStorage(), setItem: () => { throw new Error("Quota exceeded"); } };
  assert.throws(() => saveLocalConversation(storage, "alice", meta.id, [message], meta.summary), /Quota exceeded/);
});

test("a later reply preserves creation time and does not reactivate a session left by the user", () => {
  const storage = memoryStorage();
  saveLocalConversation(storage, "alice", meta.id, [message], meta.summary, meta.createdAt);
  storage.setItem("jr_active_conv_alice", "new_session");
  const reply = { ...message, id: "101", role: "model" as const, content: "Try ramen" };
  const saved = saveLocalConversation(storage, "alice", meta.id, [message, reply], "Ramen", "2026-09-06T11:00:00Z", false);
  assert.equal(saved.meta.createdAt, meta.createdAt);
  assert.equal(saved.meta.messageCount, 2);
  assert.equal(readActiveConversation(storage, "alice"), "new_session");
  assert.deepEqual(readMessages(storage, "alice", meta.id), [message, reply]);
});
