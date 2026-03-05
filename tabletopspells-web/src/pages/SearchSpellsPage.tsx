import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { spellsApi, preparedSpellsApi } from '../api/spells'
import { charactersApi } from '../api/characters'
import type { Spell } from '../types'
import SpellDetailModal from '../components/SpellDetailModal'
import { getLevelForClass, parseFirstLevel, resolveClassName } from '../utils/spellUtils'

export default function SearchSpellsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<number | undefined>()
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null)

  const { data: character } = useQuery({ queryKey: ['character', id], queryFn: () => charactersApi.get(id!), enabled: !!id })
  const { data: allSpells = [], isLoading } = useQuery({
    queryKey: ['spells', character?.gameType],
    queryFn: () => spellsApi.getAll(character!.gameType),
    enabled: !!character,
  })
  const { data: preparedList = [] } = useQuery({
    queryKey: ['preparedSpells', id],
    queryFn: () => preparedSpellsApi.getAll(id!),
    enabled: !!id,
  })

  const knownIds = new Set(preparedList.map((p) => p.spellId))

  const addMutation = useMutation({
    mutationFn: (spell: Spell) =>
      preparedSpellsApi.upsert(id!, spell.id ?? spell.name!, {
        spellId: spell.id ?? spell.name!,
        isPrepared: false,
        isAlwaysPrepared: false,
        isFavorite: false,
        isDomainSpell: false,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['preparedSpells', id] }),
  })

  const removeMutation = useMutation({
    mutationFn: (spell: Spell) => preparedSpellsApi.delete(id!, spell.id ?? spell.name!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['preparedSpells', id] }),
  })

  const filtered = useMemo(() => {
    const charClass = resolveClassName(character?.characterClass)
    return allSpells
      .filter((s) => {
        if (getLevelForClass(s.spell_level, charClass) === null) return false
        if (search && !s.name?.toLowerCase().includes(search.toLowerCase())) return false
        if (levelFilter !== undefined) return getLevelForClass(s.spell_level, charClass) === levelFilter
        return true
      })
      .sort((a, b) => {
        const aLvl = getLevelForClass(a.spell_level, charClass) ?? parseFirstLevel(a.spell_level)
        const bLvl = getLevelForClass(b.spell_level, charClass) ?? parseFirstLevel(b.spell_level)
        if (aLvl !== bLvl) return aLvl - bLvl
        return (a.name ?? '').localeCompare(b.name ?? '')
      })
  }, [allSpells, search, levelFilter, character])

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(`/characters/${id}`)} aria-label="Go back" className="text-gray-400 hover:text-white">←</button>
        <h1 className="text-lg font-bold flex-1">Search Spells</h1>
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
          filtered.map((spell) => {
            const key = spell.id ?? spell.name!
            const isInList = knownIds.has(key)
            const charClass = resolveClassName(character?.characterClass)
            const lvl = getLevelForClass(spell.spell_level, charClass) ?? parseFirstLevel(spell.spell_level)
            return (
              <div key={key} className="bg-gray-900 rounded-xl px-4 py-3 flex items-center gap-3">
                <button className="flex-1 text-left" onClick={() => setSelectedSpell(spell)}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{spell.name}</span>
                    <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">
                      {lvl === 0 ? 'Cantrip' : `L${lvl}`}
                    </span>
                  </div>
                  {spell.school && <p className="text-xs text-indigo-400 mt-0.5">{spell.school}</p>}
                </button>
                <button
                  onClick={() => isInList ? removeMutation.mutate(spell) : addMutation.mutate(spell)}
                  aria-label={isInList ? 'Remove from spell list' : 'Add to spell list'}
                  className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base font-bold transition-colors ${
                    isInList
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  {isInList ? '✓' : '+'}
                </button>
              </div>
            )
          })
        )}
      </div>

      {selectedSpell && <SpellDetailModal spell={selectedSpell} onClose={() => setSelectedSpell(null)} />}
    </div>
  )
}
