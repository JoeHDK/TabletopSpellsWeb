import { getDB, type MutationQueueEntry } from './db';

export async function enqueue(entry: Omit<MutationQueueEntry, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
  const db = await getDB();
  const queueEntry: MutationQueueEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    retryCount: 0,
  };
  await db.put('mutationQueue', queueEntry);
}

export async function getAll(): Promise<MutationQueueEntry[]> {
  const db = await getDB();
  return db.getAllFromIndex('mutationQueue', 'by-timestamp');
}

export async function remove(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('mutationQueue', id);
}

export async function incrementRetry(entry: MutationQueueEntry): Promise<void> {
  const db = await getDB();
  await db.put('mutationQueue', { ...entry, retryCount: entry.retryCount + 1 });
}

export async function clearAll(): Promise<void> {
  const db = await getDB();
  await db.clear('mutationQueue');
}
