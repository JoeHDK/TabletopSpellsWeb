import { create } from 'zustand'
import type { Character } from '../types'

interface CharacterState {
  activeCharacter: Character | null
  setActiveCharacter: (c: Character | null) => void
}

export const useCharacterStore = create<CharacterState>((set) => ({
  activeCharacter: null,
  setActiveCharacter: (c) => set({ activeCharacter: c }),
}))
