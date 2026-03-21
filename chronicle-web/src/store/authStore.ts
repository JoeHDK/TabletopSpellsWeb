import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  username: string | null
  userId: string | null
  isDm: boolean
  login: (token: string, username: string, userId: string, isDm: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      username: null,
      userId: null,
      isDm: false,
      login: (token, username, userId, isDm) => set({ token, username, userId, isDm }),
      logout: () => set({ token: null, username: null, userId: null, isDm: false }),
    }),
    { name: 'auth' }
  )
)
