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

export interface AuthResponse {
  token: string
  username: string
  userId: string
  isDm: boolean
  email?: string
  requiresEmail?: boolean
}

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
