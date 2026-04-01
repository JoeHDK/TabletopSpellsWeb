import api from './client'
import type { Feat } from '../types'

export const featsApi = {
  getAll: (search?: string) =>
    api.get<Feat[]>('/feats', { params: search ? { search } : {} }).then((r) => r.data),
  getOne: (index: string) =>
    api.get<Feat>(`/feats/${index}`).then((r) => r.data),
}
