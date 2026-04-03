export interface MonsterTrait {
  name: string
  description: string
}

export interface MonsterAttack {
  id: string
  name: string
  attackBonus?: number
  range?: string
  hitDamage?: string
  damageType?: string
  description?: string
}

export interface MonsterSpell {
  id: string
  name: string
  usageNote?: string
}

export interface MonsterSummary {
  name: string
  type: string
  subtype: string | null
  cr: number
  size: string
  ac: number
  hp: number
  source: string
}

export interface Monster extends MonsterSummary {
  acNote: string | null
  hitDice: string
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
  walkSpeed: number
  flySpeed: number
  swimSpeed: number
  climbSpeed: number
  burrowSpeed: number
  savingThrows: string[]
  skills: string[]
  damageImmunities: string[]
  damageResistances: string[]
  damageVulnerabilities: string[]
  conditionImmunities: string[]
  senses: string
  languages: string
  traits: MonsterTrait[]
  actions: MonsterTrait[]
  legendaryActions: MonsterTrait[]
}

export interface CustomMonster {
  id: string
  name: string
  type: string
  challengeRating: number
  hitPoints: number
  armorClass: number
  speed: string
  size: string
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  description?: string
  attacks: MonsterAttack[]
  spells: MonsterSpell[]
  createdAt: string
  updatedAt: string
}

export interface SaveCustomMonsterRequest {
  name: string
  type: string
  challengeRating: number
  hitPoints: number
  armorClass: number
  speed: string
  size: string
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  description?: string
  attacks: MonsterAttack[]
  spells: MonsterSpell[]
}

export interface EncounterCreature {
  id: string
  displayName: string
  monsterName: string | null
  maxHp: number
  currentHp: number
  armorClass: number
  initiative: number | null
  sortOrder: number
  isPlayerCharacter: boolean
  characterId: string | null
  notes: string | null
}

export interface Encounter {
  id: string
  gameRoomId: string
  name: string | null
  isActive: boolean
  roundNumber: number
  activeCreatureIndex: number
  createdAt: string
  updatedAt: string
  creatures: EncounterCreature[]
}

export interface EncounterTemplateCreature {
  id: string
  displayName: string
  monsterName: string | null
  maxHp: number
  armorClass: number
  sortOrder: number
  notes: string | null
}

export interface EncounterTemplate {
  id: string
  gameRoomId: string
  name: string
  sessionId: string | null
  createdAt: string
  updatedAt: string
  creatures: EncounterTemplateCreature[]
}
