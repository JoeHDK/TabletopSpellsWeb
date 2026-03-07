import api from './client'
import type { Character, CreateCharacterRequest, UpdateCharacterRequest } from '../types'

export const charactersApi = {
  getAll: () => api.get<Character[]>('/characters').then((r) => r.data),
  get: (id: string) => api.get<Character>(`/characters/${id}`).then((r) => r.data),
  create: (req: CreateCharacterRequest) => api.post<Character>('/characters', req).then((r) => r.data),
  update: (id: string, req: UpdateCharacterRequest) =>
    api.put<Character>(`/characters/${id}`, req).then((r) => r.data),
  delete: (id: string) => api.delete(`/characters/${id}`),
  updateHp: (id: string, currentHp: number, maxHp?: number) =>
    api.patch<Character>(`/characters/${id}/hp`, { currentHp, maxHp }).then((r) => r.data),
  uploadAvatar: (id: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<Character>(`/characters/${id}/avatar`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },
}
