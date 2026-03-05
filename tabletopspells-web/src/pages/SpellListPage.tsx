import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { spellsApi } from '../api/spells'
import { charactersApi } from '../api/characters'
import type { Spell } from '../types'
import SpellDetailModal from '../components/SpellDetailModal'

export default function SpellListPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<number | undefined>()
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null)

  const { data: character } = useQuery({ queryKey: ['character', id], queryFn: () => charactersApi.get(id!), enabled: !!id })
  const { data: spells = [], isLoading } = useQuery({
    queryKey: ['spells', character?.gameType],
    queryFn: () => spellsApi.getAll(character!.gameType),
    enabled: !!character,
  })

  const filtered = useMemo(() => {
    const charClass = resolveClassName(character?.characterClass)
    const result = spells.filter((s) => {
      if (search && !s.name?.toLowerCase().includes(search.toLowerCase())) return false
      if (levelFilter !== undefined) {
        return getLevelForClass(s.spell_level, charClass) === levelFilter
      }
      return true
    })
    result.sort((a, b) => {
      const aLevel = levelFilter !== undefined
        ? (getLevelForClass(a.spell_level, charClass) ?? parseFirstLevel(a.spell_level))
        : parseFirstLevel(a.spell_level)
      const bLevel = levelFilter !== undefined
        ? (getLevelForClass(b.spell_level, charClass) ?? parseFirstLevel(b.spell_level))
        : parseFirstLevel(b.spell_level)
      if (aLevel !== bLevel) return aLevel - bLevel
      return (a.name ?? '').localeCompare(b.name ?? '')
    })
    return result
  }, [spells, search, levelFilter, character])

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(`/characters/${id}`)} aria-label="Go back" className="text-gray-400 hover:text-white">←</button>
        <h1 className="text-lg font-bold flex-1">Spell Browser</h1>
      </header>

      <div className="p-4 space-y-3">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search spells…"
          className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none"
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[undefined, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
            <button
              key={l ?? 'all'}
              onClick={() => setLevelFilter(l)}
              aria-pressed={levelFilter === l}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                levelFilter === l ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {l === undefined ? 'All' : l === 0 ? 'Cantrip' : `Level ${l}`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {isLoading ? (
          <div className="text-center text-gray-400 py-12">Loading spells…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-12">No spells found</div>
        ) : (
          filtered.map((spell) => (
            <button
              key={spell.id ?? spell.name}
              onClick={() => setSelectedSpell(spell)}
              className="w-full text-left bg-gray-900 hover:bg-gray-800 rounded-xl px-4 py-3 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{spell.name}</span>
                <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">
                  {(() => {
                    const lvl = getLevelForClass(spell.spell_level, character?.characterClass) ?? parseFirstLevel(spell.spell_level)
                    return lvl === 0 ? 'Cantrip' : `L${lvl}`
                  })()}
                </span>
              </div>
              {spell.school && <p className="text-xs text-indigo-400 mt-0.5">{spell.school}</p>}
            </button>
          ))
        )}
      </div>

      {selectedSpell && <SpellDetailModal spell={selectedSpell} onClose={() => setSelectedSpell(null)} />}
    </div>
  )
}

// Mirrors the backend Class enum order exactly, for handling legacy numeric values in cache
const CLASS_NAMES_BY_INDEX = [
  'barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue',
  'sorcerer', 'wizard', 'inquisitor', 'summoner', 'witch', 'alchemist', 'magus', 'oracle',
  'shaman', 'spiritualist', 'occultist', 'psychic', 'mesmerist', 'warlock', 'artificer',
]

/** Resolves characterClass to a lowercase string regardless of whether it's a string or legacy numeric enum value. */
function resolveClassName(characterClass: unknown): string {
  if (typeof characterClass === 'string') return characterClass.toLowerCase()
  if (typeof characterClass === 'number') return CLASS_NAMES_BY_INDEX[characterClass] ?? ''
  return ''
}

/** Returns the spell level for a specific class, or null if the spell doesn't belong to that class.
 *  Handles formats like "sorcerer 1, wizard 1" and "sorcerer/wizard 3, witch 3". */
function getLevelForClass(spellLevel: string | undefined, characterClass: unknown): number | null {
  if (!spellLevel) return null
  const lc = spellLevel.toLowerCase()
  const cls = resolveClassName(characterClass)
  if (!cls) return null
  for (const entry of lc.split(',')) {
    const trimmed = entry.trim()
    // Match "cleric/oracle 5" or "sorcerer 1" — class name anywhere in the slash-separated token
    if (trimmed.split(/\s+/)[0].split('/').some((part) => part === cls)) {
      const match = trimmed.match(/(\d+)\s*$/)
      if (match) return parseInt(match[1])
      if (trimmed.includes('cantrip')) return 0
    }
  }
  return null
}

/** Parses the first numeric level found in the string, used for sorting "All" results. */
function parseFirstLevel(spellLevel?: string): number {
  if (!spellLevel) return 0
  if (spellLevel.toLowerCase().includes('cantrip') && !/\d/.test(spellLevel)) return 0
  const match = spellLevel.match(/(\d+)/)
  return match ? parseInt(match[1]) : 0
}
