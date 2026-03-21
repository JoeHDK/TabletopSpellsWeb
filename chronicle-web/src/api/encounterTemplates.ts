import api from './client'
import type { EncounterTemplate, Encounter } from '../types'

export const encounterTemplatesApi = {
  getAll: (gameRoomId: string) =>
    api.get<EncounterTemplate[]>(`/game-rooms/${gameRoomId}/planner/templates`).then((r) => r.data),

  create: (gameRoomId: string, name: string, sessionId?: string) =>
    api.post<EncounterTemplate>(`/game-rooms/${gameRoomId}/planner/templates`, { name, sessionId }).then((r) => r.data),

  update: (gameRoomId: string, templateId: string, data: { name: string; sessionId?: string | null; unlinkSession?: boolean }) =>
    api.put<EncounterTemplate>(`/game-rooms/${gameRoomId}/planner/templates/${templateId}`, data).then((r) => r.data),

  delete: (gameRoomId: string, templateId: string) =>
    api.delete(`/game-rooms/${gameRoomId}/planner/templates/${templateId}`),

  addCreature: (gameRoomId: string, templateId: string, data: {
    displayName: string
    monsterName?: string
    maxHp: number
    armorClass: number
    notes?: string
  }) =>
    api.post<EncounterTemplate>(`/game-rooms/${gameRoomId}/planner/templates/${templateId}/creatures`, data).then((r) => r.data),

  removeCreature: (gameRoomId: string, templateId: string, creatureId: string) =>
    api.delete<EncounterTemplate>(`/game-rooms/${gameRoomId}/planner/templates/${templateId}/creatures/${creatureId}`).then((r) => r.data),

  updateCreature: (gameRoomId: string, templateId: string, creatureId: string, data: {
    displayName: string
    maxHp: number
    armorClass: number
    notes?: string
  }) =>
    api.put<EncounterTemplate>(`/game-rooms/${gameRoomId}/planner/templates/${templateId}/creatures/${creatureId}`, data).then((r) => r.data),

  launch: (gameRoomId: string, templateId: string) =>
    api.post<Encounter>(`/game-rooms/${gameRoomId}/planner/templates/${templateId}/launch`).then((r) => r.data),
}
