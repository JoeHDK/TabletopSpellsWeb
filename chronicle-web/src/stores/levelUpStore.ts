import { create } from 'zustand'
import type { CharacterClass } from '../types/character'

export interface PendingLevelUp {
  characterId: string
  /** The class receiving the level */
  targetClass: CharacterClass
  /** New level for that class after leveling up */
  newClassLevel: number
  /** Total character level after leveling up */
  newTotalLevel: number
  /** HP gained this level (raw roll / average, before CON) */
  hpGained: number
  /** New maxHp after this level */
  newMaxHp: number
  /** Spell indices newly added to the character spell list */
  newSpells: string[]
  /** Cantrip indices newly added */
  newCantrips: string[]
  /** Feat index newly added (if any) */
  newFeat: string | null
  /** ASI choices: { Strength: 1, Constitution: 1 } etc */
  asiChoices: Record<string, number> | null
  /** New subclass chosen this level (if any) */
  newSubclass: string | null
  /** New MaxSpellsPerDay after level-up */
  newMaxSpellsPerDay: Record<number, number> | null
}

interface LevelUpStore {
  isActive: boolean
  pending: PendingLevelUp | null
  /** Which navigation step user is on (for back button) */
  wizardStep: number
  /** Items that still need selection before confirming */
  remainingSpellPicks: number
  remainingCantripPicks: number

  startWizard: (initial: PendingLevelUp) => void
  updatePending: (patch: Partial<PendingLevelUp>) => void
  addSpell: (spellIndex: string) => void
  removeSpell: (spellIndex: string) => void
  addCantrip: (spellIndex: string) => void
  removeCantrip: (spellIndex: string) => void
  setRemainingSpellPicks: (n: number) => void
  setRemainingCantripPicks: (n: number) => void
  setWizardStep: (step: number) => void
  cancelWizard: () => void
}

export const useLevelUpStore = create<LevelUpStore>((set) => ({
  isActive: false,
  pending: null,
  wizardStep: 0,
  remainingSpellPicks: 0,
  remainingCantripPicks: 0,

  startWizard: (initial) => set({
    isActive: true,
    pending: initial,
    wizardStep: 0,
    remainingSpellPicks: 0,
    remainingCantripPicks: 0,
  }),

  updatePending: (patch) => set(state => ({
    pending: state.pending ? { ...state.pending, ...patch } : null,
  })),

  addSpell: (spellIndex) => set(state => {
    if (!state.pending) return {}
    return {
      pending: { ...state.pending, newSpells: [...state.pending.newSpells, spellIndex] },
      remainingSpellPicks: Math.max(0, state.remainingSpellPicks - 1),
    }
  }),

  removeSpell: (spellIndex) => set(state => {
    if (!state.pending) return {}
    const removed = state.pending.newSpells.includes(spellIndex)
    return {
      pending: { ...state.pending, newSpells: state.pending.newSpells.filter(s => s !== spellIndex) },
      remainingSpellPicks: removed ? state.remainingSpellPicks + 1 : state.remainingSpellPicks,
    }
  }),

  addCantrip: (spellIndex) => set(state => {
    if (!state.pending) return {}
    return {
      pending: { ...state.pending, newCantrips: [...state.pending.newCantrips, spellIndex] },
      remainingCantripPicks: Math.max(0, state.remainingCantripPicks - 1),
    }
  }),

  removeCantrip: (spellIndex) => set(state => {
    if (!state.pending) return {}
    const removed = state.pending.newCantrips.includes(spellIndex)
    return {
      pending: { ...state.pending, newCantrips: state.pending.newCantrips.filter(s => s !== spellIndex) },
      remainingCantripPicks: removed ? state.remainingCantripPicks + 1 : state.remainingCantripPicks,
    }
  }),

  setRemainingSpellPicks: (n) => set({ remainingSpellPicks: n }),
  setRemainingCantripPicks: (n) => set({ remainingCantripPicks: n }),
  setWizardStep: (step) => set({ wizardStep: step }),

  cancelWizard: () => set({
    isActive: false,
    pending: null,
    wizardStep: 0,
    remainingSpellPicks: 0,
    remainingCantripPicks: 0,
  }),
}))
