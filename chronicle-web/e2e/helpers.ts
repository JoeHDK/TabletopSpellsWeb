/**
 * Shared helpers for Playwright E2E tests.
 * Each test creates its own character via the API, uses it, then deletes it in afterEach.
 */
import type { APIRequestContext } from '@playwright/test'

export interface TestCharacter {
  id: string
  name: string
}

export async function createCharacter(
  request: APIRequestContext,
  overrides: {
    name?: string
    characterClass?: string
    level?: number
    subclass?: string
    abilityScores?: Record<string, number>
  } = {}
): Promise<TestCharacter> {
  const body = {
    name: overrides.name ?? `E2E-${Date.now()}`,
    characterClass: overrides.characterClass ?? 'Wizard',
    gameType: 'dnd5e',
    level: overrides.level ?? 1,
    subclass: overrides.subclass ?? 'None',
    abilityScores: overrides.abilityScores ?? {
      Strength: 10, Dexterity: 14, Constitution: 12,
      Intelligence: 16, Wisdom: 12, Charisma: 10,
    },
  }

  const res = await request.post('/api/characters', { data: body })
  if (!res.ok()) {
    const text = await res.text()
    throw new Error(`Failed to create character (${res.status()}): ${text}`)
  }
  const data = await res.json()
  return { id: data.id, name: data.name }
}

export async function deleteCharacter(request: APIRequestContext, id: string) {
  await request.delete(`/api/characters/${id}`)
}
