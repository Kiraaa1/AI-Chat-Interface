import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { StoredConversation } from '../types/chat';

interface ChatDB extends DBSchema {
  conversations: {
    key: string;
    value: StoredConversation;
    indexes: { 'by-updated': number };
  };
}

const DB_NAME = 'ai-chat-app';
const DB_VERSION = 1;
const STORE = 'conversations';

let dbPromise: Promise<IDBPDatabase<ChatDB>> | null = null;

function getDb(): Promise<IDBPDatabase<ChatDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ChatDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('by-updated', 'updatedAt');
        }
      },
    });
  }
  return dbPromise;
}

export async function listConversations(): Promise<StoredConversation[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex(STORE, 'by-updated');
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveConversation(
  conv: StoredConversation,
): Promise<void> {
  const db = await getDb();
  await db.put(STORE, conv);
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, id);
}

export async function getConversation(
  id: string,
): Promise<StoredConversation | undefined> {
  const db = await getDb();
  return db.get(STORE, id);
}
