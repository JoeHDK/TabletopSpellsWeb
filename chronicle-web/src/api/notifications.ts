import api from './client'
import type { Notification } from '../types'

export const notificationsApi = {
  getAll: () => api.get<Notification[]>('/notifications').then((r) => r.data),
  markRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
  delete: (id: string) => api.delete(`/notifications/${id}`),
}
