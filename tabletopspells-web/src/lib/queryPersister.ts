import { getDB } from './db';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

const CACHE_KEY = 'react-query-cache';

export function createIDBPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      const db = await getDB();
      await db.put('queryCache', {
        key: CACHE_KEY,
        data: JSON.stringify(client),
      });
    },
    restoreClient: async () => {
      const db = await getDB();
      const entry = await db.get('queryCache', CACHE_KEY);
      if (!entry) return undefined;
      return JSON.parse(entry.data) as PersistedClient;
    },
    removeClient: async () => {
      const db = await getDB();
      await db.delete('queryCache', CACHE_KEY);
    },
  };
}
