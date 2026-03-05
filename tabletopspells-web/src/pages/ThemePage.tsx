import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { themesApi } from '../api/spells'

const PRESET_THEMES = [
  { name: 'Dark Indigo', colors: { primary: '#6366f1', background: '#0f0f23', surface: '#1e1b4b' } },
  { name: 'Crimson', colors: { primary: '#ef4444', background: '#0f0a0a', surface: '#2d1010' } },
  { name: 'Forest', colors: { primary: '#22c55e', background: '#0a0f0a', surface: '#0d2010' } },
  { name: 'Gold', colors: { primary: '#eab308', background: '#0f0e00', surface: '#2a2000' } },
]

export default function ThemePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: themes = [] } = useQuery({
    queryKey: ['themes', id],
    queryFn: () => themesApi.getAll(id!),
    enabled: !!id,
  })

  const saveMutation = useMutation({
    mutationFn: ({ name, colors }: { name: string; colors: Record<string, string> }) =>
      themesApi.upsert(id!, name, { themeName: name, customColors: colors }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['themes', id] }),
  })

  const active = themes[0]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(`/characters/${id}`)} className="text-gray-400 hover:text-white">←</button>
        <h1 className="text-lg font-bold">Theme</h1>
      </header>

      <main className="max-w-lg mx-auto p-6">
        {active && (
          <div className="bg-gray-900 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-400">Active theme</p>
            <p className="font-semibold">{active.themeName}</p>
          </div>
        )}

        <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-3">Presets</h2>
        <div className="grid grid-cols-2 gap-3">
          {PRESET_THEMES.map((theme) => (
            <button
              key={theme.name}
              onClick={() => saveMutation.mutate({ name: theme.name, colors: theme.colors })}
              className={`rounded-xl p-4 text-left transition-all border-2 ${
                active?.themeName === theme.name ? 'border-indigo-500' : 'border-transparent'
              }`}
              style={{ backgroundColor: theme.colors.surface }}
            >
              <div className="flex gap-2 mb-2">
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.colors.primary }} />
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.colors.background }} />
              </div>
              <p className="text-sm font-medium text-white">{theme.name}</p>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
