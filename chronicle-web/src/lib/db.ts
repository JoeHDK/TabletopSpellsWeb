import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'tabletopspells-db';
const DB_VERSION = 1;

export interface MutationQueueEntry {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  queryKeysToInvalidate: string[][];
  timestamp: number;
  retryCount: number;
}

export interface QueryCacheEntry {
  key: string;
  data: string;
}

type TabletopSpellsDB = {
  mutationQueue: {
    key: string;
    value: MutationQueueEntry;
    indexes: { 'by-timestamp': number };
  };
  queryCache: {
    key: string;
    value: QueryCacheEntry;
  };
};

let dbPromise: Promise<IDBPDatabase<TabletopSpellsDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<TabletopSpellsDB>> {
  if (!dbPromise) {
    dbPromise = openDB<TabletopSpellsDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('mutationQueue')) {
          const store = db.createObjectStore('mutationQueue', { keyPath: 'id' });
          store.createIndex('by-timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('queryCache')) {
          db.createObjectStore('queryCache', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}
