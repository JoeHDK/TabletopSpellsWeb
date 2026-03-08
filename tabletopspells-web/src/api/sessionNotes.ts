import api from './client'
import type { SessionNote } from '../types'

export const sessionNotesApi = {
  getAll: (gameRoomId: string) =>
    api.get<SessionNote[]>(`/game-rooms/${gameRoomId}/planner/notes`).then((r) => r.data),

  create: (gameRoomId: string, data: { title: string; content?: string }) =>
    api.post<SessionNote>(`/game-rooms/${gameRoomId}/planner/notes`, data).then((r) => r.data),

  update: (gameRoomId: string, noteId: string, data: { title?: string; content?: string; sortOrder?: number }) =>
    api.put<SessionNote>(`/game-rooms/${gameRoomId}/planner/notes/${noteId}`, data).then((r) => r.data),

  delete: (gameRoomId: string, noteId: string) =>
    api.delete(`/game-rooms/${gameRoomId}/planner/notes/${noteId}`),
}
