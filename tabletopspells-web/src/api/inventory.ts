import api from './client'
import type { InventoryItem, AddInventoryItemRequest, EquipItemRequest, SendItemRequest } from '../types'

export const inventoryApi = {
  getAll: (characterId: string) =>
    api.get<InventoryItem[]>(`/characters/${characterId}/inventory`).then((r) => r.data),

  add: (characterId: string, data: AddInventoryItemRequest) =>
    api.post<InventoryItem>(`/characters/${characterId}/inventory`, data).then((r) => r.data),

  equip: (characterId: string, itemId: string, data: EquipItemRequest) =>
    api.patch<InventoryItem>(`/characters/${characterId}/inventory/${itemId}/equip`, data).then((r) => r.data),

  remove: (characterId: string, itemId: string) =>
    api.delete(`/characters/${characterId}/inventory/${itemId}`),

  send: (characterId: string, itemId: string, data: SendItemRequest) =>
    api.post(`/characters/${characterId}/inventory/${itemId}/send`, data),
}
