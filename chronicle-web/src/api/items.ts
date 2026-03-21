import api from './client'
import type { Item } from '../types'

export const itemsApi = {
  getAll: (params?: { search?: string; category?: string; rarity?: string; itemType?: string }) =>
    api.get<Item[]>('/items', { params }).then((r) => r.data),
  getCategories: () =>
    api.get<string[]>('/items/categories').then((r) => r.data),
}
