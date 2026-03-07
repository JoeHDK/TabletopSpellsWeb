export type Game = 'pathfinder1e' | 'dnd5e'

export type CharacterClass =
  | 'Barbarian' | 'Bard' | 'Cleric' | 'Druid' | 'Fighter' | 'Monk'
  | 'Paladin' | 'Ranger' | 'Rogue' | 'Sorcerer' | 'Wizard' | 'Inquisitor'
  | 'Summoner' | 'Witch' | 'Alchemist' | 'Magus' | 'Oracle' | 'Shaman'
  | 'Spiritualist' | 'Occultist' | 'Psychic' | 'Mesmerist' | 'Warlock' | 'Artificer'

export interface Character {
  id: string
  name: string
  characterClass: CharacterClass
  subclass: string
  gameType: Game
  level: number
  isDivineCaster: boolean
  abilityScores: Record<string, number>
  maxSpellsPerDay: Record<number, number>
  spellsUsedToday: Record<number, number>
  alwaysPreparedSpells: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateCharacterRequest {
  name: string
  characterClass: CharacterClass
  subclass?: string
  gameType: Game
  level?: number
  abilityScores?: Record<string, number>
}

export interface UpdateCharacterRequest {
  name?: string
  level?: number
  subclass?: string
  abilityScores?: Record<string, number>
  maxSpellsPerDay?: Record<number, number>
  spellsUsedToday?: Record<number, number>
}

export interface Spell {
  id: string
  name: string
  spell_level: string
  school?: string
  description?: string
  duration?: string
  components?: string
  saving_throw?: string
  range?: string
  source?: string
  targets?: string
  casting_time?: string
  ritual: boolean
  isNativeSpell: boolean
  isAlwaysPrepared: boolean
  isPrepared: boolean
  isDomainSpell: boolean
  isFavoriteSpell: boolean
}

export interface PreparedSpell {
  id: string
  spellId: string
  isPrepared: boolean
  isAlwaysPrepared: boolean
  isFavorite: boolean
  isDomainSpell: boolean
}

export interface SpellsPerDay {
  id: string
  spellLevel: number
  maxSlots: number
  usedSlots: number
  date: string
}

export interface SpellCastLog {
  id: string
  spellName?: string
  spellLevel: number
  castTime: string
  castAsRitual: boolean
  success: boolean
  reason?: string
  failedReason?: string
  sessionId: number
}

export interface CharacterTheme {
  id: string
  themeName: string
  customColors: Record<string, string>
}

export interface Item {
  index: string
  name: string
  item_type: 'magic' | 'equipment'
  category: string
  rarity: string
  description: string
  requires_attunement: boolean
  attunement_note?: string
  cost?: string
  weight?: number
  damage?: string
  properties: string[]
  source: string
}

export interface AuthResponse {
  token: string
  username: string
  userId: string
}

export interface CustomItem {
  id: string
  name: string
  item_type: 'magic' | 'equipment'
  category?: string
  rarity?: string
  description?: string
  requires_attunement: boolean
  attunement_note?: string
  cost?: string
  weight?: number
  damage?: string
  properties: string[]
  createdAt: string
}

export interface SaveCustomItemRequest {
  name: string
  item_type: 'magic' | 'equipment'
  category?: string
  rarity?: string
  description?: string
  requires_attunement: boolean
  attunement_note?: string
  cost?: string
  weight?: number
  damage?: string
  properties: string[]
}
