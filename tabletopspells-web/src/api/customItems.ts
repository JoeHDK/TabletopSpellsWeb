import api from './client'
import type { CustomItem, SaveCustomItemRequest } from '../types'

export const customItemsApi = {
  getAll: () =>
    api.get<CustomItem[]>('/custom-items').then((r) => r.data),
  create: (data: SaveCustomItemRequest) =>
    api.post<CustomItem>('/custom-items', data).then((r) => r.data),
  update: (id: string, data: SaveCustomItemRequest) =>
    api.put<CustomItem>(`/custom-items/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    api.delete(`/custom-items/${id}`),
}
