import api from './client'
import type { CampaignLogEntry } from '../types'

export const campaignLogApi = {
  getAll: (gameRoomId: string) =>
    api.get<CampaignLogEntry[]>(`/game-rooms/${gameRoomId}/log`).then((r) => r.data),

  create: (gameRoomId: string, content: string) =>
    api.post<CampaignLogEntry>(`/game-rooms/${gameRoomId}/log`, { content }).then((r) => r.data),

  update: (gameRoomId: string, entryId: string, content: string) =>
    api.put<CampaignLogEntry>(`/game-rooms/${gameRoomId}/log/${entryId}`, { content }).then((r) => r.data),

  delete: (gameRoomId: string, entryId: string) =>
    api.delete(`/game-rooms/${gameRoomId}/log/${entryId}`),
}
