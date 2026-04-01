import api from './client'
import type { Encounter, EncounterCreature } from '../types'

export const encountersApi = {
  get: (gameRoomId: string) =>
    api.get<Encounter | null>(`/game-rooms/${gameRoomId}/encounter`).then((r) => r.data),

  create: (gameRoomId: string, name?: string) =>
    api.post<Encounter>(`/game-rooms/${gameRoomId}/encounter`, { name }).then((r) => r.data),

  delete: (gameRoomId: string) =>
    api.delete(`/game-rooms/${gameRoomId}/encounter`),

  addCreature: (gameRoomId: string, data: {
    displayName: string
    monsterName?: string
    maxHp: number
    armorClass: number
    initiative?: number
    isPlayerCharacter?: boolean
    characterId?: string
    notes?: string
  }) =>
    api.post<EncounterCreature>(`/game-rooms/${gameRoomId}/encounter/creatures`, data).then((r) => r.data),

  removeCreature: (gameRoomId: string, creatureId: string) =>
    api.delete(`/game-rooms/${gameRoomId}/encounter/creatures/${creatureId}`),

  updateCreature: (gameRoomId: string, creatureId: string, data: {
    currentHp?: number
    maxHp?: number
    initiative?: number
    sortOrder?: number
    notes?: string
  }) =>
    api.patch<EncounterCreature>(`/game-rooms/${gameRoomId}/encounter/creatures/${creatureId}`, data).then((r) => r.data),

  nextTurn: (gameRoomId: string) =>
    api.put<Encounter>(`/game-rooms/${gameRoomId}/encounter/next-turn`).then((r) => r.data),

  addPlayers: (gameRoomId: string, characterIds: string[]) =>
    api.post<Encounter>(`/game-rooms/${gameRoomId}/encounter/add-players`, { characterIds }).then((r) => r.data),

  rollInitiative: (gameRoomId: string) =>
    api.post<Encounter>(`/game-rooms/${gameRoomId}/encounter/roll-initiative`).then((r) => r.data),

  sortByInitiative: (gameRoomId: string) =>
    api.post<Encounter>(`/game-rooms/${gameRoomId}/encounter/sort-by-initiative`).then((r) => r.data),
}
