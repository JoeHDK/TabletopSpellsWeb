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
