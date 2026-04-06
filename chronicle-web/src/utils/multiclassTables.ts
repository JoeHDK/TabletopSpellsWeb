import type { CharacterClass, CharacterClassEntry } from '../types/character'

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

/**
 * Saving throw proficiencies gained when multiclassing INTO a class (PHB p.164).
 * Empty array = the class grants no saving throws on multiclass entry.
 */
export const MULTICLASS_SAVING_THROWS: Record<CharacterClass, string[]> = {
  Artificer: ['Intelligence'],
  Barbarian: ['Strength', 'Constitution'],
  Bard:      [],
  Cleric:    [],
  Druid:     [],
  Fighter:   ['Strength', 'Constitution'],
  Monk:      ['Strength', 'Dexterity'],
  Paladin:   ['Wisdom', 'Charisma'],
  Ranger:    ['Strength', 'Dexterity'],
  Rogue:     ['Dexterity'],
  Sorcerer:  ['Constitution'],
  Warlock:   ['Wisdom'],
  Wizard:    ['Intelligence'],
}

/**
 * Skill proficiency picks gained when multiclassing INTO a class (PHB p.164).
 * count = number of skills to pick; anySkill = true means pick from ANY skill (Bard).
 */
export const MULTICLASS_SKILL_PICKS: Record<CharacterClass, { count: number; anySkill: boolean }> = {
  Artificer: { count: 1, anySkill: false },
  Barbarian: { count: 1, anySkill: false },
  Bard:      { count: 1, anySkill: true  },
  Cleric:    { count: 0, anySkill: false },
  Druid:     { count: 0, anySkill: false },
  Fighter:   { count: 1, anySkill: false },
  Monk:      { count: 1, anySkill: false },
  Paladin:   { count: 0, anySkill: false },
  Ranger:    { count: 1, anySkill: false },
  Rogue:     { count: 1, anySkill: false },
  Sorcerer:  { count: 0, anySkill: false },
  Warlock:   { count: 1, anySkill: false },
  Wizard:    { count: 0, anySkill: false },
}

/** Skill options available to each class (used for both initial build and multiclass skill picks) */
export const CLASS_SKILL_LIST: Record<CharacterClass, string[]> = {
  Artificer: ['Arcana', 'History', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Sleight of Hand'],
  Barbarian: ['Animal Handling', 'Athletics', 'Intimidation', 'Nature', 'Perception', 'Survival'],
  Bard:      ['Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival'],
  Cleric:    ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'],
  Druid:     ['Arcana', 'Animal Handling', 'Insight', 'Medicine', 'Nature', 'Perception', 'Religion', 'Survival'],
  Fighter:   ['Acrobatics', 'Animal Handling', 'Athletics', 'History', 'Insight', 'Intimidation', 'Perception', 'Survival'],
  Monk:      ['Acrobatics', 'Athletics', 'History', 'Insight', 'Religion', 'Stealth'],
  Paladin:   ['Athletics', 'Insight', 'Intimidation', 'Medicine', 'Persuasion', 'Religion'],
  Ranger:    ['Animal Handling', 'Athletics', 'Insight', 'Investigation', 'Nature', 'Perception', 'Stealth', 'Survival'],
  Rogue:     ['Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation', 'Perception', 'Performance', 'Persuasion', 'Sleight of Hand', 'Stealth'],
  Sorcerer:  ['Arcana', 'Deception', 'Insight', 'Intimidation', 'Persuasion', 'Religion'],
  Warlock:   ['Arcana', 'Deception', 'History', 'Intimidation', 'Investigation', 'Nature', 'Religion'],
  Wizard:    ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Religion'],
}

/** All D&D 5e skills (used when anySkill = true, e.g. Bard multiclass) */
export const ALL_DND5E_SKILLS = [
  'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception',
  'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine',
  'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion',
  'Sleight of Hand', 'Stealth', 'Survival',
]

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

// ==============================================================
// Multiclass Spell Slot Computation (PHB rules)
// ==============================================================

/**
 * Multiclass spell slot table — indexed by combined caster level [1..20]
 * Each row: [1st, 2nd, 3rd, 4th, 5th, 6th, 7th, 8th, 9th]
 */
const MULTICLASS_SLOT_TABLE: number[][] = [
  /* 1  */ [2, 0, 0, 0, 0, 0, 0, 0, 0],
  /* 2  */ [3, 0, 0, 0, 0, 0, 0, 0, 0],
  /* 3  */ [4, 2, 0, 0, 0, 0, 0, 0, 0],
  /* 4  */ [4, 3, 0, 0, 0, 0, 0, 0, 0],
  /* 5  */ [4, 3, 2, 0, 0, 0, 0, 0, 0],
  /* 6  */ [4, 3, 3, 0, 0, 0, 0, 0, 0],
  /* 7  */ [4, 3, 3, 1, 0, 0, 0, 0, 0],
  /* 8  */ [4, 3, 3, 2, 0, 0, 0, 0, 0],
  /* 9  */ [4, 3, 3, 3, 1, 0, 0, 0, 0],
  /* 10 */ [4, 3, 3, 3, 2, 0, 0, 0, 0],
  /* 11 */ [4, 3, 3, 3, 2, 1, 0, 0, 0],
  /* 12 */ [4, 3, 3, 3, 2, 1, 0, 0, 0],
  /* 13 */ [4, 3, 3, 3, 2, 1, 1, 0, 0],
  /* 14 */ [4, 3, 3, 3, 2, 1, 1, 0, 0],
  /* 15 */ [4, 3, 3, 3, 2, 1, 1, 1, 0],
  /* 16 */ [4, 3, 3, 3, 2, 1, 1, 1, 0],
  /* 17 */ [4, 3, 3, 3, 2, 1, 1, 1, 1],
  /* 18 */ [4, 3, 3, 3, 3, 1, 1, 1, 1],
  /* 19 */ [4, 3, 3, 3, 3, 2, 1, 1, 1],
  /* 20 */ [4, 3, 3, 3, 3, 2, 2, 1, 1],
]

/**
 * Warlock Pact Magic slots — indexed by Warlock class level [1..20]
 * Each row: [slotCount, slotLevel]
 */
export const WARLOCK_PACT_SLOTS: [number, number][] = [
  /* 1  */ [1, 1],
  /* 2  */ [2, 1],
  /* 3  */ [2, 2],
  /* 4  */ [2, 2],
  /* 5  */ [2, 3],
  /* 6  */ [2, 3],
  /* 7  */ [2, 4],
  /* 8  */ [2, 4],
  /* 9  */ [2, 5],
  /* 10 */ [2, 5],
  /* 11 */ [3, 5],
  /* 12 */ [3, 5],
  /* 13 */ [3, 5],
  /* 14 */ [3, 5],
  /* 15 */ [3, 5],
  /* 16 */ [3, 5],
  /* 17 */ [4, 5],
  /* 18 */ [4, 5],
  /* 19 */ [4, 5],
  /* 20 */ [4, 5],
]

type SpellSlotResult = {
  /** Shared multiclass spell slots keyed by spell level (1-9). 0 means no slots. */
  shared: Record<number, number>
  /** Warlock Pact Magic: { count, level } or null if not a Warlock */
  pact: { count: number; level: number } | null
}

/** Caster type determines fraction of class level that contributes to shared spell slots */
type CasterType = 'full' | 'half' | 'artificer' | 'third' | 'none' | 'pact'

function getCasterType(cls: CharacterClass, subclass?: string): CasterType {
  const sub = subclass?.toLowerCase() ?? ''
  switch (cls) {
    case 'Bard': case 'Cleric': case 'Druid': case 'Sorcerer': case 'Wizard':
      return 'full'
    case 'Paladin': case 'Ranger':
      return 'half'
    case 'Artificer':
      return 'artificer'
    case 'Fighter':
      return sub.includes('eldritchknight') || sub.includes('eldritch_knight') ? 'third' : 'none'
    case 'Rogue':
      return sub.includes('arcane') || sub.includes('arcanetrickster') ? 'third' : 'none'
    case 'Warlock':
      return 'pact'
    default:
      return 'none'
  }
}

/**
 * Compute spell slots for a multiclass character following PHB rules.
 * Returns shared slot counts (summed caster levels → full-caster table)
 * and separate Pact Magic slots if the character has Warlock levels.
 */
export function computeMulticlassSpellSlots(classes: CharacterClassEntry[]): SpellSlotResult {
  let totalCasterLevel = 0
  let pact: SpellSlotResult['pact'] = null

  for (const entry of classes) {
    const type = getCasterType(entry.characterClass, entry.subclass)
    switch (type) {
      case 'full':
        totalCasterLevel += entry.level
        break
      case 'half':
        totalCasterLevel += Math.floor(entry.level / 2)
        break
      case 'artificer':
        // Artificer rounds up starting at level 1 (effectively ceil(level/2))
        totalCasterLevel += Math.ceil(entry.level / 2)
        break
      case 'third':
        totalCasterLevel += Math.floor(entry.level / 3)
        break
      case 'pact': {
        const row = WARLOCK_PACT_SLOTS[Math.min(entry.level, 20) - 1]
        if (row) pact = { count: row[0], level: row[1] }
        break
      }
      case 'none':
      default:
        break
    }
  }

  const casterLvl = Math.min(Math.max(totalCasterLevel, 0), 20)
  const shared: Record<number, number> = {}
  if (casterLvl > 0) {
    const row = MULTICLASS_SLOT_TABLE[casterLvl - 1]
    row.forEach((count, idx) => {
      if (count > 0) shared[idx + 1] = count
    })
  }

  return { shared, pact }
}
