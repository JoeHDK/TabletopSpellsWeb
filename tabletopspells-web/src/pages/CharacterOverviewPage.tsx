import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { charactersApi } from '../api/characters'

export default function CharacterOverviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: character, isLoading } = useQuery({
    queryKey: ['character', id],
    queryFn: () => charactersApi.get(id!),
    enabled: !!id,
  })

  if (isLoading) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Loading…</div>
  if (!character) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Not found</div>

  const navItems = character.isDivineCaster
    ? [
        { label: '📖 Spell List', path: 'spells' },
        { label: '🔮 Spells per day', path: 'spells-per-day' },
        { label: '📜 Log', path: 'spell-log' },
        { label: '📊 Stats', path: 'stats' },
        { label: '🎒 Inventory', path: 'inventory' },
      ]
    : [
        { label: '📖 Spell List', path: 'spells' },
        { label: '🔍 Search Spells', path: 'search-spells' },
        { label: '🔮 Spells per day', path: 'spells-per-day' },
        { label: '📜 Log', path: 'spell-log' },
        { label: '📊 Stats', path: 'stats' },
        { label: '🎒 Inventory', path: 'inventory' },
      ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/characters')} aria-label="Go back" className="text-gray-400 hover:text-white">← Back</button>
        <div>
          <h1 className="text-xl font-bold">{character.name}</h1>
          <p className="text-sm text-gray-400">{character.characterClass} • Level {character.level}</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        <div className="grid grid-cols-2 gap-4">
          {navItems.map((item, idx) => (
            <Link
              key={item.path}
              to={`/characters/${id}/${item.path}`}
              className={`bg-gray-900 hover:bg-gray-800 rounded-xl p-6 text-center transition-colors ${
                navItems.length % 2 !== 0 && idx === navItems.length - 1 ? 'col-span-2' : ''
              }`}
            >
              <span className="text-2xl block mb-2">{item.label.split(' ')[0]}</span>
              <span className="text-sm font-medium">{item.label.split(' ').slice(1).join(' ')}</span>
            </Link>
          ))}
        </div>
        <Link
          to="/items"
          className="mt-4 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 rounded-xl p-4 text-center transition-colors w-full"
        >
          <span className="text-2xl">🗡️</span>
          <span className="text-sm font-medium">Search Items</span>
        </Link>
      </main>
    </div>
  )
}
