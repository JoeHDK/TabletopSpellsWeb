import api from './client'
import type { GameRoom, GameSummary, GameMember, CreateGameRequest, JoinGameRequest, AddMemberRequest, LinkCharacterRequest } from '../types'

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
}
