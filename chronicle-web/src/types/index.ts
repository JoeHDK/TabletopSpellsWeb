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
  isDm: boolean
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

export type GameRole = 'DM' | 'Player'

export interface GameMember {
  userId: string
  username: string
  role: GameRole
  joinedAt: string
}

export interface GameCharacter {
  characterId: string
  characterName: string
  ownerUsername: string
  characterClass: string
  level: number
}

export interface GameRoom {
  id: string
  name: string
  dmUserId: string
  dmUsername: string
  inviteCode: string
  myRole: GameRole
  members: GameMember[]
  characters: GameCharacter[]
  createdAt: string
}

export interface GameSummary {
  id: string
  name: string
  dmUsername: string
  myRole: GameRole
  memberCount: number
  createdAt: string
}

export interface CreateGameRequest {
  name: string
}

export interface JoinGameRequest {
  inviteCode: string
}

export interface AddMemberRequest {
  username: string
}

export interface LinkCharacterRequest {
  characterId: string
}

export type InventorySlot = 'Armor' | 'Weapon' | 'Offhand' | 'Accessory'
export type ItemSource = 'SRD' | 'Custom'
export type ArmorType = 'None' | 'Light' | 'Medium' | 'Heavy'

export interface InventoryItem {
  id: string
  itemSource: ItemSource
  srdItemIndex?: string
  customItemId?: string
  name: string
  quantity: number
  isEquipped: boolean
  equippedSlot?: InventorySlot
  acBonus?: number
  armorType?: ArmorType
  damageOverride?: string
  notes?: string
  grantedByUsername?: string
  acquiredAt: string
}

export interface AddInventoryItemRequest {
  itemSource: ItemSource
  srdItemIndex?: string
  customItemId?: string
  name: string
  quantity: number
  acBonus?: number
  armorType?: ArmorType
  damageOverride?: string
  notes?: string
}

export interface EquipItemRequest {
  isEquipped: boolean
  slot?: InventorySlot
  armorType?: ArmorType
}

export interface PartyMember {
  characterId: string
  characterName: string
  ownerUsername: string
  ownerUserId: string
  characterClass: string
  level: number
  currentHp: number
  maxHp: number
  baseArmorClass: number
  equipmentAcBonus: number
  passivePerception: number
  spellSlotsRemaining: Record<number, number>
}

export interface GiveItemRequest {
  recipientCharacterId: string
  itemSource: ItemSource
  srdItemIndex?: string
  customItemId?: string
  name: string
  quantity: number
  acBonus?: number
  damageOverride?: string
  notes?: string
}

export interface SendItemRequest {
  recipientCharacterId: string
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

export type NotificationType = 'GameInvite' | 'ItemReceived' | 'ItemSent'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  link?: string
  isRead: boolean
  createdAt: string
}

// ── Chat ─────────────────────────────────────────────────────────────────────

export type ChatConversationType = 'Direct' | 'GameRoom' | 'Group'

export interface ChatParticipant {
  userId: string
  username: string
  isAdmin: boolean
  joinedAt: string
}

export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  senderUsername: string
  content: string | null
  sentAt: string
  isDeleted: boolean
}

export interface Conversation {
  id: string
  type: ChatConversationType
  name: string | null
  gameRoomId: string | null
  participants: ChatParticipant[]
  lastMessage: ChatMessage | null
  unreadCount: number
  createdAt: string
}

export interface MessagesPage {
  messages: ChatMessage[]
  hasMore: boolean
  nextCursor: string | null
}

export interface SendMessageRequest {
  content: string
}

export interface CreateDirectConversationRequest {
  targetUserId: string
}

export interface CreateGroupConversationRequest {
  name: string
  participantUserIds: string[]
}

export interface AddChatParticipantRequest {
  userId: string
}

// ── Friends ──────────────────────────────────────────────────────────────────

export type FriendshipStatus = 'Pending' | 'Accepted' | 'Blocked'

export interface Friend {
  userId: string
  username: string
}

export interface FriendRequest {
  id: string
  requesterId: string
  requesterUsername: string
  createdAt: string
}

export interface UserSearchResult {
  userId: string
  username: string
  friendshipStatus: FriendshipStatus | null
}

// ── Wild Shape ────────────────────────────────────────────────────────────────

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

// ── Monsters ──────────────────────────────────────────────────────────────────

export interface MonsterTrait {
  name: string
  description: string
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

// ── Encounters ────────────────────────────────────────────────────────────────

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

// ── Session Planner ───────────────────────────────────────────────────────────

export interface SessionNote {
  id: string
  gameRoomId: string
  title: string
  content: string
  sortOrder: number
  createdAt: string
  updatedAt: string
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

// ── Feats ─────────────────────────────────────────────────────────────────────

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
