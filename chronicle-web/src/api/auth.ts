import api from './client'
import type { AuthResponse } from '../types'

export const authApi = {
  register: (username: string, password: string) =>
    api.post<AuthResponse>('/auth/register', { username, password }).then((r) => r.data),
  login: (username: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { username, password }).then((r) => r.data),
}
