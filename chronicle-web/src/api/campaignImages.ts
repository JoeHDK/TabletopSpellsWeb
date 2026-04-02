import api from './client'
import type { CampaignImage } from '../types'

export const campaignImagesApi = {
  getAll: (gameRoomId: string) =>
    api.get<CampaignImage[]>(`/game-rooms/${gameRoomId}/images`).then((r) => r.data),

  upload: (gameRoomId: string, file: File, caption?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (caption) form.append('caption', caption)
    return api.post<CampaignImage>(`/game-rooms/${gameRoomId}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },

  getFileUrl: (gameRoomId: string, imageId: string) =>
    `/api/game-rooms/${gameRoomId}/images/${imageId}/file`,

  update: (gameRoomId: string, imageId: string, data: {
    caption?: string
    isPublished?: boolean
    publishedToUserIds?: string[]
  }) =>
    api.patch<CampaignImage>(`/game-rooms/${gameRoomId}/images/${imageId}`, data).then((r) => r.data),

  delete: (gameRoomId: string, imageId: string) =>
    api.delete(`/game-rooms/${gameRoomId}/images/${imageId}`),
}
