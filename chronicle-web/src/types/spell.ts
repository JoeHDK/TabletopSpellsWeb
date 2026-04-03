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
