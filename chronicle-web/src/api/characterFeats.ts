import api from './client'
import type { CharacterFeat, AddCharacterFeatRequest } from '../types'

export const characterFeatsApi = {
  getAll: (characterId: string) =>
    api.get<CharacterFeat[]>(`/characters/${characterId}/feats`).then((r) => r.data),
  add: (characterId: string, req: AddCharacterFeatRequest) =>
    api.post<CharacterFeat>(`/characters/${characterId}/feats`, req).then((r) => r.data),
  remove: (characterId: string, featId: string) =>
    api.delete(`/characters/${characterId}/feats/${featId}`),
}
