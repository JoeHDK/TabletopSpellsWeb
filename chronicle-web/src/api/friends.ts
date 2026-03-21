import api from './client'
import type { Friend, FriendRequest, UserSearchResult } from '../types'

export const friendsApi = {
  getFriends: () =>
    api.get<Friend[]>('/friends').then((r) => r.data),

  getIncomingRequests: () =>
    api.get<FriendRequest[]>('/friends/requests').then((r) => r.data),

  sendRequest: (username: string) =>
    api.post<{ id: string }>('/friends/request', { username }).then((r) => r.data),

  acceptRequest: (id: string) =>
    api.post(`/friends/requests/${id}/accept`),

  declineRequest: (id: string) =>
    api.post(`/friends/requests/${id}/decline`),

  removeFriend: (friendUserId: string) =>
    api.delete(`/friends/${friendUserId}`),

  searchUsers: (q: string) =>
    api.get<UserSearchResult[]>('/users/search', { params: { q } }).then((r) => r.data),
}
