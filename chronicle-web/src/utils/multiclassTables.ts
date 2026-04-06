import type { CharacterClass } from '../types/character'

// Hit die size per class
export const HIT_DIE: Record<CharacterClass, number> = {
  Barbarian: 12,
  Fighter: 10, Paladin: 10, Ranger: 10,
  Artificer: 8, Bard: 8, Cleric: 8, Druid: 8, Monk: 8, Rogue: 8, Warlock: 8,
  Sorcerer: 6, Wizard: 6,
}

// Levels at which each class gets ASI (or feat choice)
export const ASI_LEVELS: Record<CharacterClass, number[]> = {
  Barbarian: [4, 8, 12, 16, 19],
  Bard:      [4, 8, 12, 16, 19],
  Cleric:    [4, 8, 12, 16, 19],
  Druid:     [4, 8, 12, 16, 19],
  Fighter:   [4, 6, 8, 12, 14, 16, 19],
  Monk:      [4, 8, 12, 16, 19],
  Paladin:   [4, 8, 12, 16, 19],
  Ranger:    [4, 8, 12, 16, 19],
  Rogue:     [4, 8, 10, 12, 16, 19],
  Sorcerer:  [4, 8, 12, 16, 19],
  Warlock:   [4, 8, 12, 16, 19],
  Wizard:    [4, 8, 12, 16, 19],
  Artificer: [4, 8, 12, 16, 19],
}

// Level at which the subclass is chosen (first subclass feature)
export const SUBCLASS_LEVEL: Record<CharacterClass, number> = {
  Barbarian: 3,
  Bard: 3,
  Cleric: 1,
  Druid: 2,
  Fighter: 3,
  Monk: 3,
  Paladin: 3,
  Ranger: 3,
  Rogue: 3,
  Sorcerer: 1,
  Warlock: 1,
  Wizard: 2,
  Artificer: 3,
}

// Prepared casters — wizard prompts "spell slots updated" info only, no pick-spells step
export const PREPARED_CASTERS = new Set<CharacterClass>(['Wizard', 'Cleric', 'Druid', 'Paladin'])

// Known casters — wizard prompts to pick N new spells
export const KNOWN_CASTERS = new Set<CharacterClass>(['Bard', 'Ranger', 'Sorcerer', 'Warlock'])

// Cantrip count by class and level (0 = no cantrips for that class)
// [level 1..20]
export const CANTRIP_COUNT_TABLE: Partial<Record<CharacterClass, number[]>> = {
  //                         1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20
  Artificer: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  Bard:      [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  Cleric:    [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  Druid:     [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  Sorcerer:  [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  Warlock:   [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  Wizard:    [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
}

// Spells known at each level for known-casters (index 0 = level 1)
export const SPELLS_KNOWN_TABLE: Partial<Record<CharacterClass, number[]>> = {
  //              1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20
  Bard:    [4, 5, 6, 7, 8, 9,10,11,12,14,15,15,16,18,19,19,20,22,22,22],
  Ranger:  [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9,10,10,11,11],
  Sorcerer:[2, 3, 4, 5, 6, 7, 8, 9,10,11,12,12,13,13,14,14,15,15,15,15],
  Warlock: [2, 3, 4, 5, 6, 7, 8, 9,10,10,11,11,12,12,13,13,14,14,15,15],
}

// Max spell level accessible at each character level for the class
export const MAX_SPELL_LEVEL_TABLE: Partial<Record<CharacterClass, number[]>> = {
  //              1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20
  Artificer:  [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  Bard:       [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 9, 9],
  Cleric:     [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 9, 9],
  Druid:      [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 9, 9],
  Paladin:    [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  Ranger:     [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  Sorcerer:   [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 9, 9],
  Warlock:    [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  Wizard:     [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 9, 9],
}

// Multiclass prerequisite ability scores (dnd5e only, soft warning)
export const MULTICLASS_PREREQS: Partial<Record<CharacterClass, Array<{ ability: string; min: number }>>> = {
  Barbarian: [{ ability: 'Strength', min: 13 }],
  Bard:      [{ ability: 'Charisma', min: 13 }],
  Cleric:    [{ ability: 'Wisdom', min: 13 }],
  Druid:     [{ ability: 'Wisdom', min: 13 }],
  Fighter:   [{ ability: 'Strength', min: 13 }],
  Monk:      [{ ability: 'Dexterity', min: 13 }, { ability: 'Wisdom', min: 13 }],
  Paladin:   [{ ability: 'Strength', min: 13 }, { ability: 'Charisma', min: 13 }],
  Ranger:    [{ ability: 'Dexterity', min: 13 }, { ability: 'Wisdom', min: 13 }],
  Rogue:     [{ ability: 'Dexterity', min: 13 }],
  Sorcerer:  [{ ability: 'Charisma', min: 13 }],
  Warlock:   [{ ability: 'Charisma', min: 13 }],
  Wizard:    [{ ability: 'Intelligence', min: 13 }],
  Artificer: [{ ability: 'Intelligence', min: 13 }],
}

/** Returns true if the character's ability scores meet prerequisites for the given class */
export function checkMulticlassPrereqs(
  cls: CharacterClass,
  abilityScores: Record<string, number>
): boolean {
  const prereqs = MULTICLASS_PREREQS[cls]
  if (!prereqs) return true
  return prereqs.every(p => (abilityScores[p.ability] ?? 0) >= p.min)
}

/** Returns a human-readable string of unmet prerequisites */
export function unmetPrereqsText(
  cls: CharacterClass,
  abilityScores: Record<string, number>
): string {
  const prereqs = MULTICLASS_PREREQS[cls]
  if (!prereqs) return ''
  const unmet = prereqs.filter(p => (abilityScores[p.ability] ?? 0) < p.min)
  return unmet.map(p => `${p.ability} ${p.min}+`).join(' and ')
}

/** Get cantrip count for a class at a given level (0 if the class doesn't have cantrips) */
export function getCantripCount(cls: CharacterClass, level: number): number {
  const table = CANTRIP_COUNT_TABLE[cls]
  if (!table) return 0
  return table[Math.min(level, table.length) - 1] ?? 0
}

/** Get spells known for a known-caster at a given level */
export function getSpellsKnown(cls: CharacterClass, level: number): number | null {
  const table = SPELLS_KNOWN_TABLE[cls]
  if (!table) return null
  return table[Math.min(level, table.length) - 1] ?? null
}
