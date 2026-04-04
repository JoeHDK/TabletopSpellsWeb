import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { spellsApi, preparedSpellsApi } from '../api/spells'
import { charactersApi } from '../api/characters'
import { isPreparingCaster } from '../utils/spellUtils'
import type { Spell, Character, PreparedSpell } from '../types'

export default function PrepareSpellsPage({ embedded }: { embedded?: boolean } = {}) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: character, isLoading } = useQuery({
    queryKey: ['character', id],
    queryFn: () => charactersApi.get(id!),
    enabled: !!id,
  })

  if (isLoading || !character) {
    return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Loading…</div>
  }

  if (!character.isDivineCaster && !isPreparingCaster(character.characterClass)) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-gray-400">This class doesn't prepare spells — all known spells are always available to cast.</p>
        <button onClick={() => navigate(`/characters/${id}/spells`)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm">
          Go to Spell List
        </button>
      </div>
    )
  }

  return character.isDivineCaster
    ? <DivinePrepare characterId={id!} character={character} embedded={embedded} />
    : <ArcanePrepare characterId={id!} character={character} embedded={embedded} />
}

// ─────────────────────────────────────────────────────────────────────────────
// Cleric / Druid / Paladin — prepare from the full spell list each long rest
// ─────────────────────────────────────────────────────────────────────────────
function DivinePrepare({ characterId, character, embedded }: { characterId: string; character: Character; embedded?: boolean }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showCantripPicker, setShowCantripPicker] = useState(false)
  const [cantripSearch, setCantripSearch] = useState('')
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { data: allSpells = [] } = useQuery({
    queryKey: ['spells', character.gameType],
    queryFn: () => spellsApi.getAll(character.gameType),
  })
  const { data: preparedList = [] } = useQuery({
    queryKey: ['preparedSpells', characterId],
    queryFn: () => preparedSpellsApi.getAll(characterId),
  })

  const preparedIds = new Set(preparedList.filter((p) => p.isPrepared).map((p) => p.spellId))

  // Cantrips are "known", not prepared daily
  const allCantrips = allSpells.filter((s) => s.spell_level === '0' || s.spell_level === 'Cantrip')
  const knownCantripIds = new Set(preparedList.filter((p) => p.isPrepared && allCantrips.some(c => (c.id ?? c.name!) === p.spellId)).map((p) => p.spellId))
  const knownCantrips = allCantrips.filter((s) => knownCantripIds.has(s.id ?? s.name!))

  // Leveled spells only (exclude cantrips)
  const leveledSpells = allSpells.filter((s) => s.spell_level !== '0' && s.spell_level !== 'Cantrip')
  const filteredLeveled = leveledSpells.filter(
    (s) => !search || s.name?.toLowerCase().includes(search.toLowerCase())
  )

  // Prepared count excludes cantrips
  const preparedCount = preparedList.filter((p) => p.isPrepared && leveledSpells.some(s => (s.id ?? s.name!) === p.spellId)).length
  const maxPrepared = Math.max(1, character.level + getModifier(character.abilityScores, character.characterClass))

  const toggleMutation = useMutation({
    mutationFn: (spell: Spell) =>
      preparedSpellsApi.upsert(characterId, spell.id ?? spell.name!, {
        spellId: spell.id ?? spell.name!,
        isPrepared: !preparedIds.has(spell.id ?? spell.name!),
        isAlwaysPrepared: false,
        isFavorite: false,
        isDomainSpell: false,
      }),
    onSuccess: (updated) => qc.setQueryData<PreparedSpell[]>(['preparedSpells', characterId], old => {
      if (!old) return [updated]
      const exists = old.some(p => p.spellId === updated.spellId)
      return exists ? old.map(p => p.spellId === updated.spellId ? updated : p) : [...old, updated]
    }),
  })

  const filteredCantripPicker = allCantrips.filter(
    (s) => !cantripSearch || s.name?.toLowerCase().includes(cantripSearch.toLowerCase())
  )

  const toggleSelect = (key: string) => setSelectedIds(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })

  const batchPrepare = (prepare: boolean) => {
    const spells = filteredLeveled.filter(s => selectedIds.has(s.id ?? s.name!))
    Promise.all(spells.map(spell =>
      preparedSpellsApi.upsert(characterId, spell.id ?? spell.name!, {
        spellId: spell.id ?? spell.name!, isPrepared: prepare, isAlwaysPrepared: false, isFavorite: false, isDomainSpell: false,
      }).then(updated => qc.setQueryData<PreparedSpell[]>(['preparedSpells', characterId], old => {
        if (!old) return [updated]
        const exists = old.some(p => p.spellId === updated.spellId)
        return exists ? old.map(p => p.spellId === updated.spellId ? updated : p) : [...old, updated]
      }))
    )).then(() => { setSelectedIds(new Set()); setSelecting(false) })
  }

  return (
    <div className={embedded ? 'bg-gray-950 text-white flex flex-col' : 'min-h-screen bg-gray-950 text-white flex flex-col'}>
      {!embedded && (
        <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/characters/${characterId}`)} aria-label="Go back" className="text-gray-400 hover:text-white">←</button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Prepare Spells</h1>
            <p className="text-xs text-gray-400">{preparedCount} / {maxPrepared} prepared</p>
          </div>
          <button
            onClick={() => { setSelecting(v => !v); setSelectedIds(new Set()) }}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${selecting ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-gray-600 text-gray-400 hover:text-white'}`}
          >{selecting ? 'Cancel' : 'Select'}</button>
        </header>
      )}

      <div className={`flex-1 overflow-y-auto ${selecting && selectedIds.size > 0 ? 'pb-20' : 'pb-4'}`}>
        {/* Known Cantrips section */}
        <section className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Known Cantrips</h2>
            <button
              onClick={() => { setShowCantripPicker(true); setCantripSearch('') }}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >＋ Learn cantrip</button>
          </div>
          {knownCantrips.length === 0 ? (
            <p className="text-xs text-gray-600 italic">No cantrips learned yet.</p>
          ) : (
            <div className="space-y-1">
              {knownCantrips.map((spell) => {
                const key = spell.id ?? spell.name!
                return (
                  <div key={key} className="flex items-center gap-3 bg-gray-900 rounded-xl px-4 py-2.5">
                    <span className="text-indigo-300 text-base shrink-0">✦</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{spell.name}</p>
                      <p className="text-[10px] text-indigo-400">Cantrip · always ready</p>
                    </div>
                    <button
                      onClick={() => toggleMutation.mutate(spell)}
                      className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1"
                      title="Forget cantrip"
                    >✕</button>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <div className="px-4 pb-3 pt-2 border-t border-gray-800 mt-2">
          <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Leveled Spells</h2>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search spells…"
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="px-4 pb-4 space-y-2">
          {filteredLeveled.map((spell) => {
            const key = spell.id ?? spell.name!
            const isPrepared = preparedIds.has(key)
            return (
              <SpellToggleRow
                key={key}
                spell={spell}
                isPrepared={isPrepared}
                onToggle={() => toggleMutation.mutate(spell)}
                selecting={selecting}
                isSelected={selectedIds.has(key)}
                onSelectToggle={() => toggleSelect(key)}
              />
            )
          })}
        </div>
      </div>

      {/* Batch action bar */}
      {selecting && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 px-4 py-3 flex gap-2 z-40">
          <button
            onClick={() => batchPrepare(true)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2 rounded-xl transition-colors"
          >Prepare ({selectedIds.size})</button>
          <button
            onClick={() => batchPrepare(false)}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2 rounded-xl transition-colors"
          >Unprepare ({selectedIds.size})</button>
        </div>
      )}

      {/* Cantrip picker modal */}
      {showCantripPicker && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Learn a Cantrip</h2>
              <input
                className="mt-3 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Search cantrips…"
                value={cantripSearch}
                onChange={(e) => setCantripSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {filteredCantripPicker.map((spell) => {
                const key = spell.id ?? spell.name!
                const isKnown = knownCantripIds.has(key)
                return (
                  <button
                    key={key}
                    onClick={() => { toggleMutation.mutate(spell); setShowCantripPicker(false) }}
                    disabled={isKnown}
                    className={`w-full text-left rounded-lg px-3 py-2.5 mb-1 transition-colors flex items-center gap-2 ${isKnown ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">{spell.name}</span>
                    {isKnown && <span className="text-xs text-indigo-400">known</span>}
                  </button>
                )
              })}
            </div>
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowCantripPicker(false)} className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 py-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Wizard / Artificer — prepare only from spells in the spellbook
// ─────────────────────────────────────────────────────────────────────────────
function ArcanePrepare({ characterId, character, embedded }: { characterId: string; character: Character; embedded?: boolean }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showCantripPicker, setShowCantripPicker] = useState(false)
  const [cantripSearch, setCantripSearch] = useState('')
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { data: allSpells = [] } = useQuery({
    queryKey: ['spells', character.gameType],
    queryFn: () => spellsApi.getAll(character.gameType),
  })
  const { data: preparedList = [] } = useQuery({
    queryKey: ['preparedSpells', characterId],
    queryFn: () => preparedSpellsApi.getAll(characterId),
  })

  // Cantrips are "known" (always ready), not in the daily spellbook prep cycle
  const allCantrips = allSpells.filter((s) => s.spell_level === '0' || s.spell_level === 'Cantrip')
  const knownCantripIds = useMemo(() => new Set(
    preparedList.filter((p) => p.isPrepared && allCantrips.some(c => (c.id ?? c.name!) === p.spellId)).map((p) => p.spellId)
  ), [preparedList, allCantrips])
  const knownCantrips = allCantrips.filter((s) => knownCantripIds.has(s.id ?? s.name!))

  // Spellbook = leveled spells only (exclude cantrips)
  const spellbookIds = useMemo(() => new Set(
    preparedList.filter((p) => {
      const isCantrip = allCantrips.some(c => (c.id ?? c.name!) === p.spellId)
      return !isCantrip
    }).map((p) => p.spellId)
  ), [preparedList, allCantrips])
  const preparedIds = useMemo(() => new Set(preparedList.filter((p) => p.isPrepared).map((p) => p.spellId)), [preparedList])

  const leveledSpells = allSpells.filter((s) => s.spell_level !== '0' && s.spell_level !== 'Cantrip')
  const spellbookSpells = useMemo(() =>
    leveledSpells.filter((s) => spellbookIds.has(s.id ?? s.name!)),
    [leveledSpells, spellbookIds]
  )

  const filtered = spellbookSpells.filter(
    (s) => !search || s.name?.toLowerCase().includes(search.toLowerCase())
  )

  const toggleMutation = useMutation({
    mutationFn: (spell: Spell) =>
      preparedSpellsApi.upsert(characterId, spell.id ?? spell.name!, {
        spellId: spell.id ?? spell.name!,
        isPrepared: !preparedIds.has(spell.id ?? spell.name!),
        isAlwaysPrepared: false,
        isFavorite: false,
        isDomainSpell: false,
      }),
    onSuccess: (updated) => qc.setQueryData<PreparedSpell[]>(['preparedSpells', characterId], old => {
      if (!old) return [updated]
      const exists = old.some(p => p.spellId === updated.spellId)
      return exists ? old.map(p => p.spellId === updated.spellId ? updated : p) : [...old, updated]
    }),
  })

  // Prepared count excludes cantrips
  const preparedCount = Array.from(preparedIds).filter(id => !allCantrips.some(c => (c.id ?? c.name!) === id)).length
  const maxPrepared = Math.max(1, character.level + getModifier(character.abilityScores, character.characterClass))
  const spellbookCount = spellbookIds.size
  const expectedMin = 6 + (character.level - 1) * 2

  const filteredCantripPicker = allCantrips.filter(
    (s) => !cantripSearch || s.name?.toLowerCase().includes(cantripSearch.toLowerCase())
  )

  const toggleSelect = (key: string) => setSelectedIds(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })

  const batchPrepare = (prepare: boolean) => {
    const spells = filtered.filter(s => selectedIds.has(s.id ?? s.name!))
    Promise.all(spells.map(spell =>
      preparedSpellsApi.upsert(characterId, spell.id ?? spell.name!, {
        spellId: spell.id ?? spell.name!, isPrepared: prepare, isAlwaysPrepared: false, isFavorite: false, isDomainSpell: false,
      }).then(updated => qc.setQueryData<PreparedSpell[]>(['preparedSpells', characterId], old => {
        if (!old) return [updated]
        const exists = old.some(p => p.spellId === updated.spellId)
        return exists ? old.map(p => p.spellId === updated.spellId ? updated : p) : [...old, updated]
      }))
    )).then(() => { setSelectedIds(new Set()); setSelecting(false) })
  }

  return (
    <div className={embedded ? 'bg-gray-950 text-white flex flex-col' : 'min-h-screen bg-gray-950 text-white flex flex-col'}>
      {!embedded && (
        <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/characters/${characterId}`)} aria-label="Go back" className="text-gray-400 hover:text-white">←</button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Prepare Spells</h1>
            <p className="text-xs text-gray-400">{preparedCount} / {maxPrepared} prepared</p>
          </div>
          <button
            onClick={() => { setSelecting(v => !v); setSelectedIds(new Set()) }}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${selecting ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-gray-600 text-gray-400 hover:text-white'}`}
          >{selecting ? 'Cancel' : 'Select'}</button>
        </header>
      )}

      <div className={`flex-1 overflow-y-auto ${selecting && selectedIds.size > 0 ? 'pb-20' : 'pb-4'}`}>
        {/* Known Cantrips section */}
        <section className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Known Cantrips</h2>
            <button
              onClick={() => { setShowCantripPicker(true); setCantripSearch('') }}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >＋ Learn cantrip</button>
          </div>
          {knownCantrips.length === 0 ? (
            <p className="text-xs text-gray-600 italic">No cantrips learned yet.</p>
          ) : (
            <div className="space-y-1">
              {knownCantrips.map((spell) => {
                const key = spell.id ?? spell.name!
                return (
                  <div key={key} className="flex items-center gap-3 bg-gray-900 rounded-xl px-4 py-2.5">
                    <span className="text-indigo-300 text-base shrink-0">✦</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{spell.name}</p>
                      <p className="text-[10px] text-indigo-400">Cantrip · always ready</p>
                    </div>
                    <button
                      onClick={() => toggleMutation.mutate(spell)}
                      className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1"
                      title="Forget cantrip"
                    >✕</button>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Spellbook info bar */}
        <div className="bg-gray-900/60 border-y border-gray-800 px-4 py-2 flex items-center justify-between mt-2">
          <div>
            <span className="text-xs text-gray-400">📖 Spellbook: </span>
            <span className="text-xs text-white font-medium">{spellbookCount} spells</span>
            {spellbookCount < expectedMin && (
              <span className="text-xs text-amber-400 ml-2">(expected ≥ {expectedMin} at level {character.level})</span>
            )}
          </div>
          <button
            onClick={() => navigate(`/characters/${characterId}/search-spells`)}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            ＋ Add to spellbook
          </button>
        </div>

        <div className="px-4 pt-3 pb-2">
          <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Leveled Spells</h2>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search spellbook…"
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="px-4 pb-4 space-y-2">
          {spellbookSpells.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <p className="text-4xl mb-3">📖</p>
              <p className="text-lg font-medium mb-1">Spellbook is empty</p>
              <p className="text-sm mb-4">Use Search Spells to copy spells into your spellbook.</p>
              <button
                onClick={() => navigate(`/characters/${characterId}/search-spells`)}
                className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Search Spells
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">No spells match your search.</p>
          ) : (
            filtered.map((spell) => {
              const key = spell.id ?? spell.name!
              const isPrepared = preparedIds.has(key)
              return (
                <SpellToggleRow
                  key={key}
                  spell={spell}
                  isPrepared={isPrepared}
                  onToggle={() => toggleMutation.mutate(spell)}
                  selecting={selecting}
                  isSelected={selectedIds.has(key)}
                  onSelectToggle={() => toggleSelect(key)}
                />
              )
            })
          )}
        </div>
      </div>

      {/* Batch action bar */}
      {selecting && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 px-4 py-3 flex gap-2 z-40">
          <button
            onClick={() => batchPrepare(true)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2 rounded-xl transition-colors"
          >Prepare ({selectedIds.size})</button>
          <button
            onClick={() => batchPrepare(false)}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2 rounded-xl transition-colors"
          >Unprepare ({selectedIds.size})</button>
        </div>
      )}

      {/* Cantrip picker modal */}
      {showCantripPicker && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Learn a Cantrip</h2>
              <input
                className="mt-3 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Search cantrips…"
                value={cantripSearch}
                onChange={(e) => setCantripSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {filteredCantripPicker.map((spell) => {
                const key = spell.id ?? spell.name!
                const isKnown = knownCantripIds.has(key)
                return (
                  <button
                    key={key}
                    onClick={() => { toggleMutation.mutate(spell); setShowCantripPicker(false) }}
                    disabled={isKnown}
                    className={`w-full text-left rounded-lg px-3 py-2.5 mb-1 transition-colors flex items-center gap-2 ${isKnown ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">{spell.name}</span>
                    {isKnown && <span className="text-xs text-indigo-400">known</span>}
                  </button>
                )
              })}
            </div>
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowCantripPicker(false)} className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 py-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared row component
// ─────────────────────────────────────────────────────────────────────────────
function SpellToggleRow({ spell, isPrepared, onToggle, selecting = false, isSelected = false, onSelectToggle }: {
  spell: Spell
  isPrepared: boolean
  onToggle: () => void
  selecting?: boolean
  isSelected?: boolean
  onSelectToggle?: () => void
}) {
  const handleClick = () => {
    if (selecting) onSelectToggle?.()
    else onToggle()
  }
  return (
    <button
      onClick={handleClick}
      aria-pressed={selecting ? isSelected : isPrepared}
      className={`w-full text-left rounded-xl px-4 py-3 transition-colors flex items-center gap-3 ${
        selecting
          ? isSelected ? 'bg-indigo-800/70 border border-indigo-500' : 'bg-gray-900 hover:bg-gray-800'
          : isPrepared ? 'bg-indigo-900/60 border border-indigo-700' : 'bg-gray-900 hover:bg-gray-800'
      }`}
    >
      {selecting ? (
        <span className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-600'}`}>
          {isSelected && <span className="text-xs leading-none">✓</span>}
        </span>
      ) : (
        <span className={`text-lg shrink-0 ${isPrepared ? 'text-indigo-300' : 'text-gray-600'}`}>
          {isPrepared ? '✦' : '◇'}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{spell.name}</p>
          {spell.ritual && (
            <span className="shrink-0 text-[10px] text-amber-400 border border-amber-400/40 rounded px-1 py-0.5 leading-none">
              ritual
            </span>
          )}
          {!selecting && isPrepared && (
            <span className="shrink-0 text-[10px] text-indigo-400 ml-auto">prepared</span>
          )}
        </div>
        <p className="text-xs text-gray-400">{spell.spell_level}</p>
      </div>
    </button>
  )
}

function getModifier(scores: Record<string, number>, charClass: string): number {
  const relevant: Record<string, string> = {
    Wizard: 'Intelligence', Artificer: 'Intelligence',
    Cleric: 'Wisdom', Druid: 'Wisdom', Ranger: 'Wisdom',
    Paladin: 'Charisma', Sorcerer: 'Charisma', Bard: 'Charisma',
  }
  const key = relevant[charClass] ?? 'Intelligence'
  return Math.floor(((scores[key] ?? 10) - 10) / 2)
}
