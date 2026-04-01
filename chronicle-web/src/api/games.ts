import api from './client'
import type { GameRoom, GameSummary, GameMember, CreateGameRequest, JoinGameRequest, AddMemberRequest, LinkCharacterRequest, PartyMember, GiveItemRequest, CreateLootItemRequest, LootItem } from '../types'

export const gamesApi = {
  getAll: () =>
    api.get<GameSummary[]>('/games').then((r) => r.data),

  get: (id: string) =>
    api.get<GameRoom>(`/games/${id}`).then((r) => r.data),

  create: (data: CreateGameRequest) =>
    api.post<GameRoom>('/games', data).then((r) => r.data),

  joinByCode: (data: JoinGameRequest) =>
    api.post<GameRoom>('/games/join', data).then((r) => r.data),

  addMember: (gameId: string, data: AddMemberRequest) =>
    api.post<GameMember>(`/games/${gameId}/members`, data).then((r) => r.data),

  removeMember: (gameId: string, userId: string) =>
    api.delete(`/games/${gameId}/members/${userId}`),

  linkCharacter: (gameId: string, data: LinkCharacterRequest) =>
    api.post(`/games/${gameId}/characters`, data),

  unlinkCharacter: (gameId: string, characterId: string) =>
    api.delete(`/games/${gameId}/characters/${characterId}`),

  getParty: (gameId: string) =>
    api.get<PartyMember[]>(`/games/${gameId}/party`).then((r) => r.data),

  giveItem: (gameId: string, data: GiveItemRequest) =>
    api.post(`/games/${gameId}/give-item`, data),

  getLoot: (gameId: string) =>
    api.get<LootItem[]>(`/games/${gameId}/loot`).then((r) => r.data),

  createLootItem: (gameId: string, data: CreateLootItemRequest) =>
    api.post<LootItem>(`/games/${gameId}/loot`, data).then((r) => r.data),

  deleteLootItem: (gameId: string, itemId: string) =>
    api.delete(`/games/${gameId}/loot/${itemId}`),
}
