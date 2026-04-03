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
  savingThrowProficiencies: string[]
  skillProficiencies: string[]
  classSkillProficiencies: string[]
  createdAt: string
  updatedAt: string
  maxHp: number
  currentHp: number
  baseArmorClass: number
  gameRoomId?: string
  avatarBase64?: string
  isNpc: boolean
  wildShapeUsesRemaining: number
  wildShapeBeastName: string | null
  wildShapeBeastCurrentHp: number | null
  wildShapeBeastMaxHp: number | null
  race?: string
  background?: string
  // Roleplay / Characteristics
  personalityTraits?: string
  ideals?: string
  bonds?: string
  flaws?: string
  backstory?: string
  appearance?: string
  age?: string
  height?: string
  weight?: string
  eyes?: string
  hair?: string
  skin?: string
  alliesAndOrganizations?: string
}

export interface UpdateCharacteristicsRequest {
  background?: string
  personalityTraits?: string
  ideals?: string
  bonds?: string
  flaws?: string
  backstory?: string
  appearance?: string
  age?: string
  height?: string
  weight?: string
  eyes?: string
  hair?: string
  skin?: string
  alliesAndOrganizations?: string
}

export interface CreateCharacterRequest {
  name: string
  characterClass: CharacterClass
  subclass?: string
  gameType: Game
  level?: number
  abilityScores?: Record<string, number>
  isNpc?: boolean
  race?: string
}

export interface UpdateCharacterRequest {
  name?: string
  level?: number
  subclass?: string
  race?: string
  abilityScores?: Record<string, number>
  maxSpellsPerDay?: Record<number, number>
  spellsUsedToday?: Record<number, number>
  baseArmorClass?: number
  savingThrowProficiencies?: string[]
  skillProficiencies?: string[]
  classSkillProficiencies?: string[]
}

export interface CharacterTheme {
  id: string
  themeName: string
  customColors: Record<string, string>
}

export type AbilityModKey = 'Strength' | 'Dexterity' | 'Constitution' | 'Intelligence' | 'Wisdom' | 'Charisma' | 'None'

export interface CharacterAttack {
  id: string
  name: string
  damageFormula?: string
  damageType?: string
  abilityMod: AbilityModKey
  useProficiency: boolean
  magicBonus: number
  notes?: string
  sortOrder: number
}

export interface AddAttackRequest {
  name: string
  damageFormula?: string
  damageType?: string
  abilityMod: AbilityModKey
  useProficiency: boolean
  magicBonus: number
  notes?: string
  sortOrder?: number
}

export type UpdateAttackRequest = AddAttackRequest

export type FeatModifierType =
  | 'initiative' | 'ac' | 'hp_per_level' | 'passive_perception'
  | 'passive_investigation' | 'movement' | 'medium_armor_max_dex' | 'damage_reduction'
  | 'unarmored_ac_base' | 'saving_throw_cha_mod' | 'sneak_attack_dice' | 'martial_arts_die'

export interface FeatModifier {
  type: FeatModifierType
  value: number
  condition?: string
  damageTypes?: string[]
}

export interface FeatPrerequisite {
  type: string
  ability?: string
  minimum_score?: number
  proficiency?: string
}

export interface Feat {
  index: string
  name: string
  desc: string[]
  prerequisites: FeatPrerequisite[]
  modifiers: FeatModifier[]
}

export interface CharacterFeat {
  id: string
  featIndex: string
  name: string
  desc: string[]
  prerequisites: FeatPrerequisite[]
  modifiers: FeatModifier[]
  notes?: string
  takenAtLevel?: number
  createdAt: string
}

export interface AddCharacterFeatRequest {
  featIndex: string
  notes?: string
  takenAtLevel?: number
}

export interface ClassFeatureModifier {
  type: FeatModifierType
  value: number
  condition?: string
}

export interface ClassFeature {
  index: string
  name: string
  class: string
  subclass: string | null
  min_level: number
  desc: string[]
  is_passive: boolean
  modifiers: ClassFeatureModifier[]
  resource_key?: string
}

export interface ClassResource {
  id: string
  resourceKey: string
  name: string
  maxUses: number
  usesRemaining: number
  resetOn: 'short_rest' | 'long_rest' | 'daily' | 'weekly'
  isHpPool: boolean
}

export interface RaceModifier {
  type: 'ability_score' | 'hp_per_level' | 'passive_perception' | 'movement' | 'damage_resistance' | 'darkvision' | 'ability_score_choice'
  ability?: string
  value: number
  condition?: string
}

export interface RaceTrait {
  name: string
  desc: string
}

export interface Race {
  index: string
  name: string
  parent_race: string | null
  speed: number
  size: string
  desc: string[]
  traits: RaceTrait[]
  modifiers: RaceModifier[]
}

export interface Beast {
  name: string
  cr: number
  size: string
  ac: number
  hp: number
  str: number
  dex: number
  con: number
  walkSpeed: number
  flySpeed: number
  swimSpeed: number
  climbSpeed: number
  source: string
  attacks: { name: string; dice: string; type: string; stat: 'str' | 'dex' }[]
}
