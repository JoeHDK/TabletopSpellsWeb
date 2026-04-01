import { getDB } from './db';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { useAuthStore } from '../store/authStore';

const BASE_KEY = 'react-query-cache';

function getCacheKey(): string {
  const userId = useAuthStore.getState().userId;
  return userId ? `${BASE_KEY}-${userId}` : BASE_KEY;
}

export function createIDBPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      const db = await getDB();
      await db.put('queryCache', {
        key: getCacheKey(),
        data: JSON.stringify(client),
      });
    },
    restoreClient: async () => {
      const db = await getDB();
      const entry = await db.get('queryCache', getCacheKey());
      if (!entry) return undefined;
      return JSON.parse(entry.data) as PersistedClient;
    },
    removeClient: async () => {
      const db = await getDB();
      await db.delete('queryCache', getCacheKey());
    },
  };
}
