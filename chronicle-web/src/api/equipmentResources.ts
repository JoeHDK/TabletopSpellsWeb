import api from './client'
import type { EquipmentResource } from '../types'

export const equipmentResourcesApi = {
  getAll: (characterId: string) =>
    api.get<EquipmentResource[]>(`/characters/${characterId}/equipment-resources`).then(r => r.data),

  use: (characterId: string, usageId: string) =>
    api.post<{ usesRemaining: number }>(`/characters/${characterId}/equipment-resources/${usageId}/use`).then(r => r.data),

  restore: (characterId: string, usageId: string) =>
    api.post<{ usesRemaining: number }>(`/characters/${characterId}/equipment-resources/${usageId}/restore`).then(r => r.data),

  rest: (characterId: string, type: 'short' | 'long') =>
    api.post(`/characters/${characterId}/equipment-resources/rest`, null, { params: { type } }),
}
