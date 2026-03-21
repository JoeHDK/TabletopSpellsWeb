import { create } from 'zustand'

interface ThemeState {
  isDark: boolean
  toggle: () => void
}

const storedDark = localStorage.getItem('theme') !== 'light'
document.documentElement.classList.toggle('light', !storedDark)

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: storedDark,
  toggle: () =>
    set((state) => {
      const next = !state.isDark
      document.documentElement.classList.toggle('light', !next)
      localStorage.setItem('theme', next ? 'dark' : 'light')
      return { isDark: next }
    }),
}))
