import api from './client'
import type {
  Conversation,
  ChatMessage,
  MessagesPage,
  CreateDirectConversationRequest,
  CreateGroupConversationRequest,
  AddChatParticipantRequest,
  SendMessageRequest,
  ChatParticipant,
} from '../types'

export const chatApi = {
  // Conversations
  getConversations: () =>
    api.get<Conversation[]>('/chat/conversations').then((r) => r.data),

  getConversation: (id: string) =>
    api.get<Conversation>(`/chat/conversations/${id}`).then((r) => r.data),

  getOrCreateDirect: (req: CreateDirectConversationRequest) =>
    api.post<Conversation>('/chat/conversations/direct', req).then((r) => r.data),

  createGroup: (req: CreateGroupConversationRequest) =>
    api.post<Conversation>('/chat/conversations/group', req).then((r) => r.data),

  // Participants
  addParticipant: (conversationId: string, req: AddChatParticipantRequest) =>
    api.post<ChatParticipant>(`/chat/conversations/${conversationId}/participants`, req).then((r) => r.data),

  removeParticipant: (conversationId: string, userId: string) =>
    api.delete(`/chat/conversations/${conversationId}/participants/${userId}`),

  // Messages
  getMessages: (conversationId: string, before?: string, limit = 50) =>
    api.get<MessagesPage>(`/chat/conversations/${conversationId}/messages`, {
      params: { before, limit },
    }).then((r) => r.data),

  sendMessage: (conversationId: string, req: SendMessageRequest) =>
    api.post<ChatMessage>(`/chat/conversations/${conversationId}/messages`, req).then((r) => r.data),

  deleteMessage: (conversationId: string, messageId: string) =>
    api.delete(`/chat/conversations/${conversationId}/messages/${messageId}`),

  markRead: (conversationId: string) =>
    api.post(`/chat/conversations/${conversationId}/read`),
}
