import api from './client'
import type { CampaignLogEntry } from '../types'

export const campaignLogApi = {
  getAll: (gameRoomId: string) =>
    api.get<CampaignLogEntry[]>(`/game-rooms/${gameRoomId}/log`).then((r) => r.data),

  create: (gameRoomId: string, payload: { title?: string; content: string }) =>
    api.post<CampaignLogEntry>(`/game-rooms/${gameRoomId}/log`, payload).then((r) => r.data),

  update: (gameRoomId: string, entryId: string, payload: { title?: string; content: string }) =>
    api.put<CampaignLogEntry>(`/game-rooms/${gameRoomId}/log/${entryId}`, payload).then((r) => r.data),

  delete: (gameRoomId: string, entryId: string) =>
    api.delete(`/game-rooms/${gameRoomId}/log/${entryId}`),
}
