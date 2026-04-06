import { describe, it, expect } from 'vitest'
import {
  computeMulticlassSpellSlots,
  getCantripCount,
  checkMulticlassPrereqs,
  unmetPrereqsText,
  WARLOCK_PACT_SLOTS,
} from '../multiclassTables'
import type { CharacterClassEntry } from '../../types/character'

function cls(
  characterClass: CharacterClassEntry['characterClass'],
  level: number,
  subclass = ''
): CharacterClassEntry {
  return { characterClass, level, subclass, cantripsKnown: 0 }
}

// ---------------------------------------------------------------------------
// computeMulticlassSpellSlots
// ---------------------------------------------------------------------------

describe('computeMulticlassSpellSlots', () => {
  it('single Wizard 5 → shared slots for caster level 5', () => {
    const { shared, pact } = computeMulticlassSpellSlots([cls('Wizard', 5)])
    expect(shared[1]).toBe(4)
    expect(shared[2]).toBe(3)
    expect(shared[3]).toBe(2)
    expect(shared[4]).toBeUndefined()
    expect(pact).toBeNull()
  })

  it('Wizard 5 + Cleric 5 → caster level 10', () => {
    const { shared, pact } = computeMulticlassSpellSlots([cls('Wizard', 5), cls('Cleric', 5)])
    expect(shared[1]).toBe(4)
    expect(shared[2]).toBe(3)
    expect(shared[3]).toBe(3)
    expect(shared[4]).toBe(3)
    expect(shared[5]).toBe(2)
    expect(shared[6]).toBeUndefined()
    expect(pact).toBeNull()
  })

  it('Paladin 6 + Bard 6 → caster level 3+6=9', () => {
    // Paladin is half: floor(6/2)=3; Bard is full: 6 → total 9
    const { shared } = computeMulticlassSpellSlots([cls('Paladin', 6), cls('Bard', 6)])
    expect(shared[1]).toBe(4)
    expect(shared[2]).toBe(3)
    expect(shared[3]).toBe(3)
    expect(shared[4]).toBe(3)
    expect(shared[5]).toBe(1)
    expect(shared[6]).toBeUndefined()
  })

  it('Warlock 5 + Wizard 5 → shared slots from Wizard only + pact slots', () => {
    const { shared, pact } = computeMulticlassSpellSlots([cls('Warlock', 5), cls('Wizard', 5)])
    // Warlock goes to pact; Wizard = caster level 5 → {1:4, 2:3, 3:2}
    expect(shared[1]).toBe(4)
    expect(shared[2]).toBe(3)
    expect(shared[3]).toBe(2)
    expect(pact).not.toBeNull()
    expect(pact!.count).toBe(2)
    expect(pact!.level).toBe(3) // Warlock level 5 → 2 slots at level 3
  })

  it('Barbarian 10 + Fighter 10 (no subclass) → no spell slots', () => {
    const { shared, pact } = computeMulticlassSpellSlots([cls('Barbarian', 10), cls('Fighter', 10)])
    expect(Object.keys(shared)).toHaveLength(0)
    expect(pact).toBeNull()
  })

  it('Artificer 4 + Wizard 4 → caster level ceil(2)+4=6', () => {
    // Artificer: ceil(4/2)=2; Wizard: 4 → total 6
    const { shared } = computeMulticlassSpellSlots([cls('Artificer', 4), cls('Wizard', 4)])
    expect(shared[1]).toBe(4)
    expect(shared[2]).toBe(3)
    expect(shared[3]).toBe(3)
    expect(shared[4]).toBeUndefined()
  })

  it('Fighter 6 (EldritchKnight) + Wizard 4 → caster level floor(6/3)+4=6', () => {
    // EK third caster: floor(6/3)=2; Wizard: 4 → total 6
    const { shared } = computeMulticlassSpellSlots([
      cls('Fighter', 6, 'FighterEldritchKnight'),
      cls('Wizard', 4),
    ])
    expect(shared[1]).toBe(4)
    expect(shared[2]).toBe(3)
    expect(shared[3]).toBe(3)
    expect(shared[4]).toBeUndefined()
  })

  it('Rogue 9 (ArcaneTrickster) + Cleric 9 → caster level floor(9/3)+9=12', () => {
    // AT: floor(9/3)=3; Cleric: 9 → total 12
    const { shared } = computeMulticlassSpellSlots([
      cls('Rogue', 9, 'RogueArcaneTrickster'),
      cls('Cleric', 9),
    ])
    expect(shared[1]).toBe(4)
    expect(shared[2]).toBe(3)
    expect(shared[3]).toBe(3)
    expect(shared[4]).toBe(3)
    expect(shared[5]).toBe(2)
    expect(shared[6]).toBe(1)
    expect(shared[7]).toBeUndefined()
  })

  it('Paladin 2 + Ranger 2 → caster level 1+1=2', () => {
    // Paladin: floor(2/2)=1; Ranger: floor(2/2)=1 → total 2
    const { shared } = computeMulticlassSpellSlots([cls('Paladin', 2), cls('Ranger', 2)])
    expect(shared[1]).toBe(3)
    expect(shared[2]).toBeUndefined()
  })

  it('Warlock 11 alone → pact magic only, no shared slots', () => {
    const { shared, pact } = computeMulticlassSpellSlots([cls('Warlock', 11)])
    expect(Object.keys(shared)).toHaveLength(0)
    expect(pact).not.toBeNull()
    expect(pact!.count).toBe(3)
    expect(pact!.level).toBe(5)
  })

  it('Artificer level 1 contributes 1 (ceil rounds up)', () => {
    // ceil(1/2) = 1
    const { shared } = computeMulticlassSpellSlots([cls('Artificer', 1)])
    expect(shared[1]).toBe(2) // caster level 1 → [2,0,0,...]
  })
})

// ---------------------------------------------------------------------------
// getCantripCount
// ---------------------------------------------------------------------------

describe('getCantripCount', () => {
  it('Wizard level 1 → 3 cantrips', () => {
    expect(getCantripCount('Wizard', 1)).toBe(3)
  })

  it('Wizard level 9 → 4 cantrips (jumps at level 10)', () => {
    expect(getCantripCount('Wizard', 9)).toBe(4)
  })

  it('Wizard level 10 → 5 cantrips', () => {
    expect(getCantripCount('Wizard', 10)).toBe(5)
  })

  it('Wizard level 20 → 5 cantrips', () => {
    expect(getCantripCount('Wizard', 20)).toBe(5)
  })

  it('Bard level 4 → 3 cantrips', () => {
    expect(getCantripCount('Bard', 4)).toBe(3)
  })

  it('Sorcerer level 1 → 4 cantrips', () => {
    expect(getCantripCount('Sorcerer', 1)).toBe(4)
  })

  it('Barbarian (no cantrips) → 0', () => {
    expect(getCantripCount('Barbarian', 5)).toBe(0)
  })

  it('Fighter (no cantrips) → 0', () => {
    expect(getCantripCount('Fighter', 10)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// checkMulticlassPrereqs + unmetPrereqsText
// ---------------------------------------------------------------------------

describe('checkMulticlassPrereqs', () => {
  it('Wizard with INT 13 → meets prereq', () => {
    expect(checkMulticlassPrereqs('Wizard', { Intelligence: 13 })).toBe(true)
  })

  it('Wizard with INT 12 → does not meet prereq', () => {
    expect(checkMulticlassPrereqs('Wizard', { Intelligence: 12 })).toBe(false)
  })

  it('Monk requires DEX 13 AND WIS 13 — both met', () => {
    expect(checkMulticlassPrereqs('Monk', { Dexterity: 13, Wisdom: 13 })).toBe(true)
  })

  it('Monk requires DEX 13 AND WIS 13 — only DEX met', () => {
    expect(checkMulticlassPrereqs('Monk', { Dexterity: 13, Wisdom: 12 })).toBe(false)
  })

  it('Paladin requires STR 13 AND CHA 13 — neither met', () => {
    expect(checkMulticlassPrereqs('Paladin', { Strength: 10, Charisma: 10 })).toBe(false)
  })

  it('Barbarian with STR 15 → meets prereq', () => {
    expect(checkMulticlassPrereqs('Barbarian', { Strength: 15 })).toBe(true)
  })
})

describe('unmetPrereqsText', () => {
  it('Wizard INT 13 → empty string (all met)', () => {
    expect(unmetPrereqsText('Wizard', { Intelligence: 13 })).toBe('')
  })

  it('Wizard INT 10 → "Intelligence 13+"', () => {
    expect(unmetPrereqsText('Wizard', { Intelligence: 10 })).toBe('Intelligence 13+')
  })

  it('Monk DEX 10 WIS 10 → "Dexterity 13+ and Wisdom 13+"', () => {
    expect(unmetPrereqsText('Monk', { Dexterity: 10, Wisdom: 10 })).toBe(
      'Dexterity 13+ and Wisdom 13+'
    )
  })
})

// ---------------------------------------------------------------------------
// WARLOCK_PACT_SLOTS table
// ---------------------------------------------------------------------------

describe('WARLOCK_PACT_SLOTS', () => {
  it('level 1 → [1, 1] (1 slot of level 1)', () => {
    expect(WARLOCK_PACT_SLOTS[0]).toEqual([1, 1])
  })

  it('level 2 → [2, 1] (2 slots of level 1)', () => {
    expect(WARLOCK_PACT_SLOTS[1]).toEqual([2, 1])
  })

  it('level 5 → [2, 3] (2 slots of level 3)', () => {
    expect(WARLOCK_PACT_SLOTS[4]).toEqual([2, 3])
  })

  it('level 11 → [3, 5] (3 slots of level 5)', () => {
    expect(WARLOCK_PACT_SLOTS[10]).toEqual([3, 5])
  })

  it('level 17 → [4, 5] (4 slots of level 5)', () => {
    expect(WARLOCK_PACT_SLOTS[16]).toEqual([4, 5])
  })

  it('table has exactly 20 entries', () => {
    expect(WARLOCK_PACT_SLOTS).toHaveLength(20)
  })
})
