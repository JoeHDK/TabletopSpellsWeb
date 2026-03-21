import api from './client'
import type { CharacterAttack, AddAttackRequest, UpdateAttackRequest } from '../types'

export const attacksApi = {
  getAll: (characterId: string) =>
    api.get<CharacterAttack[]>(`/characters/${characterId}/attacks`).then((r) => r.data),

  add: (characterId: string, data: AddAttackRequest) =>
    api.post<CharacterAttack>(`/characters/${characterId}/attacks`, data).then((r) => r.data),

  update: (characterId: string, attackId: string, data: UpdateAttackRequest) =>
    api.put<CharacterAttack>(`/characters/${characterId}/attacks/${attackId}`, data).then((r) => r.data),

  remove: (characterId: string, attackId: string) =>
    api.delete(`/characters/${characterId}/attacks/${attackId}`),
}
