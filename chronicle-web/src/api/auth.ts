import api from './client'
import type { AuthResponse } from '../types'

export interface MeResponse {
  hasEmail: boolean
  username: string
  email: string | null
}

export const authApi = {
  register: (username: string, email: string, password: string) =>
    api.post<AuthResponse>('/auth/register', { username, email, password }).then((r) => r.data),
  login: (identifier: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { identifier, password }).then((r) => r.data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get<MeResponse>('/auth/me').then((r) => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
  changeEmail: (newEmail: string, currentPassword: string) =>
    api.patch<{ email: string }>('/auth/email', { newEmail, currentPassword }).then((r) => r.data),
  changeUsername: (newUsername: string) =>
    api.patch<{ username: string }>('/auth/username', { newUsername }).then((r) => r.data),
}
