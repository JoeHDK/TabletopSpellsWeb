import api from './client'
import type { ClassResource } from '../types'

export const classResourcesApi = {
  getAll: (characterId: string) =>
    api.get<ClassResource[]>(`/characters/${characterId}/resources`).then(r => r.data),

  upsert: (characterId: string, key: string, req: {
    resourceKey: string
    name: string
    maxUses: number
    resetOn: string
    isHpPool?: boolean
  }) => api.put<ClassResource>(`/characters/${characterId}/resources/${key}`, req).then(r => r.data),

  use: (characterId: string, key: string, amount = 1) =>
    api.post<ClassResource>(`/characters/${characterId}/resources/${key}/use`, { amount }).then(r => r.data),

  restore: (characterId: string, key: string, amount = 1) =>
    api.post<ClassResource>(`/characters/${characterId}/resources/${key}/restore`, { amount }).then(r => r.data),

  longRest: (characterId: string) =>
    api.post<ClassResource[]>(`/characters/${characterId}/resources/long-rest`).then(r => r.data),

  shortRest: (characterId: string) =>
    api.post<ClassResource[]>(`/characters/${characterId}/resources/short-rest`).then(r => r.data),

  sync: (characterId: string) =>
    api.post<ClassResource[]>(`/characters/${characterId}/resources/sync`).then(r => r.data),
}
