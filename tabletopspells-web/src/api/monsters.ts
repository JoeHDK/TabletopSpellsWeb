import api from './client'
import type { MonsterSummary, Monster } from '../types'

export const monstersApi = {
  getAll: (params?: { search?: string; type?: string; minCr?: number; maxCr?: number }) =>
    api.get<MonsterSummary[]>('/monsters', { params }).then((r) => r.data),
  getTypes: () =>
    api.get<string[]>('/monsters/types').then((r) => r.data),
  getByName: (name: string) =>
    api.get<Monster>(`/monsters/${encodeURIComponent(name)}`).then((r) => r.data),
}
