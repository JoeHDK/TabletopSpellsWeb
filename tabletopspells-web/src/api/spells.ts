import api from './client'
import type { Spell, PreparedSpell, SpellsPerDay, SpellCastLog, CharacterTheme } from '../types'
import type { Game } from '../types'

export const spellsApi = {
  getAll: (game: Game, params?: { search?: string; level?: number }) =>
    api.get<Spell[]>(`/spells/${game}`, { params }).then((r) => r.data),
}

export const preparedSpellsApi = {
  getAll: (characterId: string) =>
    api.get<PreparedSpell[]>(`/characters/${characterId}/preparedspells`).then((r) => r.data),
  upsert: (characterId: string, spellId: string, data: Partial<PreparedSpell>) =>
    api.put<PreparedSpell>(`/characters/${characterId}/preparedspells/${spellId}`, { spellId, ...data }).then((r) => r.data),
  delete: (characterId: string, spellId: string) =>
    api.delete(`/characters/${characterId}/preparedspells/${spellId}`),
}

export const spellsPerDayApi = {
  getToday: (characterId: string) =>
    api.get<SpellsPerDay[]>(`/characters/${characterId}/spellsperday`).then((r) => r.data),
  upsert: (characterId: string, spellLevel: number, data: Omit<SpellsPerDay, 'id' | 'date'>) =>
    api.put<SpellsPerDay>(`/characters/${characterId}/spellsperday/${spellLevel}`, data).then((r) => r.data),
}

export const spellLogsApi = {
  getAll: (characterId: string, sessionId?: number) =>
    api.get<SpellCastLog[]>(`/characters/${characterId}/spelllogs`, { params: { sessionId } }).then((r) => r.data),
  create: (characterId: string, data: Omit<SpellCastLog, 'id' | 'castTime'>) =>
    api.post<SpellCastLog>(`/characters/${characterId}/spelllogs`, data).then((r) => r.data),
  delete: (characterId: string, id: string) =>
    api.delete(`/characters/${characterId}/spelllogs/${id}`),
}

export const themesApi = {
  getAll: (characterId: string) =>
    api.get<CharacterTheme[]>(`/characters/${characterId}/themes`).then((r) => r.data),
  upsert: (characterId: string, themeName: string, data: Partial<CharacterTheme>) =>
    api.put<CharacterTheme>(`/characters/${characterId}/themes/${themeName}`, { themeName, ...data }).then((r) => r.data),
}
