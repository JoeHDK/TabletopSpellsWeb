import { useThemeStore } from '../store/themeStore'

export default function DarkModeToggle() {
  const { isDark, toggle } = useThemeStore()

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 text-lg transition-colors"
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  )
}
