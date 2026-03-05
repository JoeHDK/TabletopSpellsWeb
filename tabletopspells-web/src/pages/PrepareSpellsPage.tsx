import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { spellsApi, preparedSpellsApi } from '../api/spells'
import { charactersApi } from '../api/characters'
import type { Spell } from '../types'

export default function PrepareSpellsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: character } = useQuery({ queryKey: ['character', id], queryFn: () => charactersApi.get(id!), enabled: !!id })
  const { data: allSpells = [] } = useQuery({
    queryKey: ['spells', character?.gameType],
    queryFn: () => spellsApi.getAll(character!.gameType),
    enabled: !!character,
  })
  const { data: preparedList = [] } = useQuery({
    queryKey: ['preparedSpells', id],
    queryFn: () => preparedSpellsApi.getAll(id!),
    enabled: !!id,
  })

  const preparedIds = new Set(preparedList.filter((p) => p.isPrepared).map((p) => p.spellId))

  const toggleMutation = useMutation({
    mutationFn: (spell: Spell) =>
      preparedSpellsApi.upsert(id!, spell.id ?? spell.name!, {
        spellId: spell.id ?? spell.name!,
        isPrepared: !preparedIds.has(spell.id ?? spell.name!),
        isAlwaysPrepared: false,
        isFavorite: false,
        isDomainSpell: false,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['preparedSpells', id] }),
  })

  const filtered = allSpells.filter((s) =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase())
  )

  const preparedCount = preparedIds.size
  const maxPrepared = character ? character.level + getModifier(character.abilityScores, character.characterClass) : 0

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(`/characters/${id}`)} aria-label="Go back" className="text-gray-400 hover:text-white">←</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Prepare Spells</h1>
          <p className="text-xs text-gray-400">{preparedCount} / {maxPrepared} prepared</p>
        </div>
      </header>

      <div className="p-4">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search spells…"
          className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {filtered.map((spell) => {
          const key = spell.id ?? spell.name!
          const isPrepared = preparedIds.has(key)
          return (
            <button
              key={key}
              onClick={() => toggleMutation.mutate(spell)}
              aria-pressed={isPrepared}
              className={`w-full text-left rounded-xl px-4 py-3 transition-colors flex items-center gap-3 ${
                isPrepared ? 'bg-indigo-900/60 border border-indigo-700' : 'bg-gray-900 hover:bg-gray-800'
              }`}
            >
              <span className={`text-lg ${isPrepared ? 'text-indigo-300' : 'text-gray-600'}`}>
                {isPrepared ? '✦' : '◇'}
              </span>
              <div>
                <p className="font-medium">{spell.name}</p>
                <p className="text-xs text-gray-400">{spell.spell_level}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function getModifier(scores: Record<string, number>, charClass: string): number {
  const relevant: Record<string, string> = {
    Wizard: 'Intelligence', Artificer: 'Intelligence',
    Cleric: 'Wisdom', Druid: 'Wisdom',
    Paladin: 'Charisma', Sorcerer: 'Charisma', Bard: 'Charisma',
  }
  const key = relevant[charClass] ?? 'Strength'
  return Math.floor(((scores[key] ?? 10) - 10) / 2)
}
