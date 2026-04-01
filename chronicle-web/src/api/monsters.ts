import api from './client'
import type { MonsterSummary, Monster, CustomMonster, SaveCustomMonsterRequest } from '../types'

export const monstersApi = {
  getAll: (params?: { search?: string; type?: string; minCr?: number; maxCr?: number }) =>
    api.get<MonsterSummary[]>('/monsters', { params }).then((r) => r.data),
  getTypes: () =>
    api.get<string[]>('/monsters/types').then((r) => r.data),
  getByName: (name: string) =>
    api.get<Monster>(`/monsters/${encodeURIComponent(name)}`).then((r) => r.data),
}

export const customMonstersApi = {
  getAll: () => api.get<CustomMonster[]>('/custom-monsters').then((r) => r.data),
  create: (data: SaveCustomMonsterRequest) => api.post<CustomMonster>('/custom-monsters', data).then((r) => r.data),
  update: (id: string, data: SaveCustomMonsterRequest) => api.put<CustomMonster>(`/custom-monsters/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/custom-monsters/${id}`),
}
