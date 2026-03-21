import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { processMutationQueue } from '../lib/syncEngine';

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const queryClient = useQueryClient();
  const syncedOnReconnect = useRef(false);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      if (!syncedOnReconnect.current) {
        syncedOnReconnect.current = true;
        processMutationQueue(queryClient).finally(() => {
          syncedOnReconnect.current = false;
        });
      }
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient]);

  return isOnline;
}
