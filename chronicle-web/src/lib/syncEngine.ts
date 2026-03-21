import type { QueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { getAll, remove, incrementRetry } from './mutationQueue';

const MAX_RETRIES = 3;

/**
 * Extracts the base resource URL for LWW conflict checking.
 * E.g. "/characters/abc123/hp" → "/characters/abc123"
 */
function extractBaseResourceUrl(endpoint: string): string | null {
  const patterns = [
    /^(\/characters\/[^/]+)/,
    /^(\/game-rooms\/[^/]+\/encounter(?:\/creatures)?(?:\/[^/]+)?)/,
    /^(\/chat\/conversations\/[^/]+)/,
    /^(\/games\/[^/]+)/,
  ];
  for (const pattern of patterns) {
    const match = endpoint.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Checks last-write-wins: returns true if we should apply the queued mutation,
 * false if the server already has a newer version.
 */
async function shouldApplyMutation(endpoint: string, mutationTimestamp: number): Promise<boolean> {
  const baseUrl = extractBaseResourceUrl(endpoint);
  if (!baseUrl) return true; // can't determine — apply optimistically

  try {
    const response = await api.get<{ updatedAt?: string }>(baseUrl);
    const serverUpdatedAt = response.data?.updatedAt;
    if (!serverUpdatedAt) return true;

    const serverTs = new Date(serverUpdatedAt).getTime();
    return mutationTimestamp >= serverTs; // apply if our change is newer or equal
  } catch {
    return true; // can't check — apply optimistically
  }
}

export async function processMutationQueue(queryClient: QueryClient): Promise<void> {
  const queue = await getAll();
  if (queue.length === 0) return;

  let anySynced = false;

  for (const entry of queue) {
    try {
      const isUpdate = entry.method === 'PATCH' || entry.method === 'PUT';
      if (isUpdate) {
        const apply = await shouldApplyMutation(entry.endpoint, entry.timestamp);
        if (!apply) {
          // Server has newer data — discard our stale mutation
          await remove(entry.id);
          continue;
        }
      }

      await api.request({
        method: entry.method,
        url: entry.endpoint,
        data: entry.body,
        // Signal to the request interceptor to bypass offline queueing
        headers: { 'X-Offline-Replay': 'true' },
      });

      await remove(entry.id);
      anySynced = true;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;

      if (entry.retryCount >= MAX_RETRIES || (status && status >= 400 && status < 500)) {
        // Permanent failure or too many retries — discard
        await remove(entry.id);
      } else {
        await incrementRetry(entry);
      }
    }
  }

  if (anySynced) {
    // Refresh all cached data to reflect server state after sync
    await queryClient.invalidateQueries();
  }
}
