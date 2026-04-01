import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Character } from '../types'

interface CharacterState {
  activeCharacter: Character | null
  setActiveCharacter: (c: Character | null) => void
}

export const useCharacterStore = create<CharacterState>()(
  persist(
    (set) => ({
      activeCharacter: null,
      setActiveCharacter: (c) => set({ activeCharacter: c }),
    }),
    { name: 'active-character' }
  )
)
