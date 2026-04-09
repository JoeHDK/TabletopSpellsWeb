import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  username: string | null
  userId: string | null
  isDm: boolean
  email: string | null
  hasEmail: boolean
  login: (token: string, username: string, userId: string, isDm: boolean, email?: string) => void
  setUsername: (username: string) => void
  setEmail: (email: string) => void
  setHasEmail: (hasEmail: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      username: null,
      userId: null,
      isDm: false,
      email: null,
      hasEmail: false,
      login: (token, username, userId, isDm, email) => set({ token, username, userId, isDm, email: email ?? null, hasEmail: !!email }),
      setUsername: (username) => set({ username }),
      setEmail: (email) => set({ email, hasEmail: true }),
      setHasEmail: (hasEmail) => set({ hasEmail }),
      logout: () => set({ token: null, username: null, userId: null, isDm: false, email: null, hasEmail: false }),
    }),
    { name: 'auth' }
  )
)
