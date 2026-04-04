import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 5, // 5 seconds — prevents immediate re-fetch of just-mutated data
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days (IDB offline fallback)
    },
  },
})
