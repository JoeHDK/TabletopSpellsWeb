import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { enqueue } from '../lib/mutationQueue'

const WRITE_METHODS = new Set(['post', 'put', 'patch', 'delete'])

export class OfflineQueuedError extends Error {
  constructor() {
    super('Request queued for offline sync')
    this.name = 'OfflineQueuedError'
  }
}

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(async (config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`

  const method = config.method?.toLowerCase() ?? ''
  const isReplay = config.headers['X-Offline-Replay'] === 'true'

  if (!navigator.onLine && WRITE_METHODS.has(method) && !isReplay) {
    const endpoint = config.url ?? ''
    await enqueue({
      endpoint,
      method: method.toUpperCase() as 'POST' | 'PUT' | 'PATCH' | 'DELETE',
      body: config.data,
      queryKeysToInvalidate: [],
    })
    return Promise.reject(new OfflineQueuedError())
  }

  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err instanceof OfflineQueuedError) return Promise.reject(err)

    const method = err.config?.method?.toLowerCase() ?? ''
    const isReplay = err.config?.headers?.['X-Offline-Replay'] === 'true'

    // Queue the mutation if the request never reached the server (no err.response means
    // a network-level failure: server down, no connection, proxy closed, etc.)
    if (!err.response && WRITE_METHODS.has(method) && !isReplay) {
      let body: unknown = err.config?.data
      if (typeof body === 'string') {
        try { body = JSON.parse(body) } catch { /* leave as string */ }
      }
      await enqueue({
        endpoint: err.config?.url ?? '',
        method: method.toUpperCase() as 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        body,
        queryKeysToInvalidate: [],
      })
      return Promise.reject(new OfflineQueuedError())
    }

    if (err.response?.status === 401) useAuthStore.getState().logout()
    return Promise.reject(err)
  }
)

export default api
