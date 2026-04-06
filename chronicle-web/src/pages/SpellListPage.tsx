import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { spellsApi, preparedSpellsApi, spellsPerDayApi, spellLogsApi } from '../api/spells'
import { charactersApi } from '../api/characters'
import type { Spell, Character, SpellsPerDay, PreparedSpell } from '../types'
import SpellDetailModal from '../components/SpellDetailModal'
import LevelUpBanner from '../components/LevelUpBanner'
import { getLevelForClass, parseFirstLevel, resolveClassName, isPreparingCaster } from '../utils/spellUtils'

export default function SpellListPage({ embedded }: { embedded?: boolean } = {}) {
  const { id } = useParams<{ id: string }>()
  const { data: character, isLoading } = useQuery({
    queryKey: ['character', id],
    queryFn: () => charactersApi.get(id!),
    enabled: !!id,
  })

  if (isLoading) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Loading…</div>
  if (!character) return null

  return character.isDivineCaster
    ? <DivineSpellList characterId={id!} character={character} embedded={embedded} />
    : <ArcaneSpellList characterId={id!} character={character} embedded={embedded} />
}

// ─────────────────────────────────────────────────────────────────────────────
// Arcane Spell List — known spells the character has added
// ─────────────────────────────────────────────────────────────────────────────

function ArcaneSpellList({ characterId, character, embedded }: { characterId: string; character: Character; embedded?: boolean }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null)
  const [castingSpell, setCastingSpell] = useState<Spell | null>(null)

  const { data: allSpells = [] } = useQuery({
    queryKey: ['spells', character.gameType],
    queryFn: () => spellsApi.getAll(character.gameType),
  })
  const { data: preparedList = [] } = useQuery({
    queryKey: ['preparedSpells', characterId],
    queryFn: () => preparedSpellsApi.getAll(characterId),
  })
  const { data: slotsData = [] } = useQuery({
    queryKey: ['spellsPerDay', characterId],
    queryFn: () => spellsPerDayApi.getToday(characterId),
  })

  const knownIds = new Set(preparedList.map((p) => p.spellId))

  const knownSpells = useMemo(() => {
    const charClass = resolveClassName(character.characterClass)
    return allSpells
      .filter((s) => knownIds.has(s.id ?? s.name!))
      .filter((s) => !search || s.name?.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const aLvl = getLevelForClass(a.spell_level, charClass) ?? parseFirstLevel(a.spell_level)
        const bLvl = getLevelForClass(b.spell_level, charClass) ?? parseFirstLevel(b.spell_level)
        if (aLvl !== bLvl) return aLvl - bLvl
        return (a.name ?? '').localeCompare(b.name ?? '')
      })
  }, [allSpells, preparedList, search, character])

  const canPrepare = isPreparingCaster(character.characterClass)

  const knownSpellIds = useMemo(() => new Set(allSpells.map(s => s.id ?? s.name!)), [allSpells])
  const preparedCount = canPrepare ? preparedList.filter(
    (p) => p.isPrepared && knownSpellIds.has(p.spellId)
  ).length : 0
  const spellcastingMod = getSpellcastingModifier(character.abilityScores, character.characterClass)
  const maxPrepared = Math.max(1, character.level + spellcastingMod)

  const removeMutation = useMutation({
    mutationFn: (spell: Spell) => preparedSpellsApi.delete(characterId, spell.id ?? spell.name!),
    onSuccess: (_void, spell) => {
      const key = spell.id ?? spell.name!
      qc.setQueryData<PreparedSpell[]>(['preparedSpells', characterId], old => old?.filter(p => p.spellId !== key) ?? [])
      qc.invalidateQueries({ queryKey: ['preparedSpells', characterId] })
      setSelectedSpell(null)
    },
  })

  const prepareMutation = useMutation({
    mutationFn: (spell: Spell) => {
      const key = spell.id ?? spell.name!
      const existing = preparedList.find((p) => p.spellId === key)
      const currentlyPrepared = existing?.isPrepared ?? false
      return preparedSpellsApi.upsert(characterId, key, {
        spellId: key,
        isPrepared: !currentlyPrepared,
        isAlwaysPrepared: existing?.isAlwaysPrepared ?? false,
        isFavorite: existing?.isFavorite ?? false,
        isDomainSpell: existing?.isDomainSpell ?? false,
      })
    },
    onSuccess: (updated) => {
      qc.setQueryData<PreparedSpell[]>(['preparedSpells', characterId], old => {
        if (!old) return [updated]
        const exists = old.some(p => p.spellId === updated.spellId)
        return exists ? old.map(p => p.spellId === updated.spellId ? updated : p) : [...old, updated]
      })
      qc.invalidateQueries({ queryKey: ['preparedSpells', characterId] })
    },
  })

  const castMutation = useMutation({
    mutationFn: async ({ spell, slotLevel, castAsRitual }: { spell: Spell; slotLevel: number; castAsRitual?: boolean }) => {
      if (!castAsRitual && slotLevel > 0) {
        const slotData = slotsData.find((s) => s.spellLevel === slotLevel)
        const used = slotData?.usedSlots ?? 0
        const max = character.maxSpellsPerDay?.[slotLevel] ?? 0
        await spellsPerDayApi.upsert(characterId, slotLevel, { spellLevel: slotLevel, maxSlots: max, usedSlots: used + 1 })
      }
      await spellLogsApi.create(characterId, {
        spellName: spell.name,
        spellLevel: slotLevel,
        castAsRitual: castAsRitual ?? false,
        success: true,
        sessionId: 0,
      })
    },
    onSuccess: (_void, { slotLevel, castAsRitual }) => {
      if (!castAsRitual && slotLevel > 0) {
        qc.setQueryData<SpellsPerDay[]>(['spellsPerDay', characterId], old =>
          old?.map(s => s.spellLevel === slotLevel ? { ...s, usedSlots: s.usedSlots + 1 } : s) ?? []
        )
        qc.invalidateQueries({ queryKey: ['spellsPerDay', characterId] })
      }
      setCastingSpell(null)
      setSelectedSpell(null)
    },
  })

  return (
    <div className={embedded ? 'bg-gray-950 text-white flex flex-col' : 'min-h-screen bg-gray-950 text-white flex flex-col'}>
      {!embedded && (
        <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/characters/${characterId}`)} aria-label="Go back" className="text-gray-400 hover:text-white">←</button>
          <h1 className="text-lg font-bold flex-1">My Spells</h1>
          {canPrepare && <span className="text-sm text-amber-400">{preparedCount}/{maxPrepared} prepared</span>}
        </header>
      )}
      <LevelUpBanner />

      <div className="p-4">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search spells…"
          className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {knownSpells.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p>No spells in your list.</p>
            <p className="text-sm mt-1">Use Search Spells to add them.</p>
          </div>
        ) : (
          knownSpells.map((spell) => {
            const key = spell.id ?? spell.name!
            const charClass = resolveClassName(character.characterClass)
            const lvl = getLevelForClass(spell.spell_level, charClass) ?? parseFirstLevel(spell.spell_level)
            const isPrepared = preparedList.find((p) => p.spellId === key)?.isPrepared ?? false
            const isRitual = spell.ritual
            // "ritual only" means: this spell can be cast (as ritual) but isn't prepared — only meaningful for preparing casters
            const ritualOnly = canPrepare && isRitual && !isPrepared && lvl > 0
            const showUnprepared = canPrepare && !isPrepared && !isRitual && lvl > 0
            return (
              <button
                key={key}
                onClick={() => setSelectedSpell(spell)}
                className={`w-full text-left rounded-xl px-4 py-3 transition-colors ${
                  ritualOnly ? 'bg-gray-900/60 hover:bg-gray-800 opacity-75' : 'bg-gray-900 hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">{spell.name}</span>
                    {isRitual && (
                      <span className="shrink-0 text-[10px] text-amber-400 border border-amber-400/40 rounded px-1 py-0.5 leading-none">
                        ritual
                      </span>
                    )}
                    {ritualOnly && (
                      <span className="shrink-0 text-[10px] text-gray-400 leading-none">unprepared</span>
                    )}
                    {showUnprepared && (
                      <span className="shrink-0 text-[10px] text-gray-400 leading-none">unprepared</span>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">
                    {lvl === 0 ? 'Cantrip' : `L${lvl}`}
                  </span>
                </div>
                {spell.school && <p className="text-xs text-indigo-400 mt-0.5">{spell.school}</p>}
              </button>
            )
          })
        )}
      </div>

      {selectedSpell && (() => {
        const key = selectedSpell.id ?? selectedSpell.name!
        const charClass = resolveClassName(character.characterClass)
        const spellLvl = getLevelForClass(selectedSpell.spell_level, charClass) ?? parseFirstLevel(selectedSpell.spell_level)
        const isCantrip = spellLvl === 0
        const existing = preparedList.find((p) => p.spellId === key)
        const isPrepared = existing?.isPrepared ?? false
        const isRitual = selectedSpell.ritual
        const atMax = !isPrepared && preparedCount >= maxPrepared
        const hasSlot = Object.entries(character.maxSpellsPerDay ?? {}).some(([slvl, max]) => {
          const slotLevel = Number(slvl)
          if (slotLevel < spellLvl) return false
          const slotData = slotsData.find((s) => s.spellLevel === slotLevel)
          return max - (slotData?.usedSlots ?? 0) > 0
        })
        // Preparing casters (Wizard/Artificer) must have isPrepared=true to cast; others can cast any known spell
        const canCast = isCantrip || (canPrepare ? (isPrepared || isRitual) && hasSlot : hasSlot)
        return (
          <SpellDetailModal
            spell={selectedSpell}
            onClose={() => setSelectedSpell(null)}
            footer={
              <>
                <button
                  onClick={() => removeMutation.mutate(selectedSpell)}
                  className="flex-1 py-2 rounded-lg bg-red-900/60 hover:bg-red-900 text-red-300 text-sm font-medium transition-colors"
                >
                  Remove
                </button>
                {canPrepare && !isCantrip && (
                  <button
                    onClick={() => !atMax && prepareMutation.mutate(selectedSpell)}
                    disabled={atMax && !isPrepared}
                    title={atMax && !isPrepared ? `Prepared spells limit reached (${maxPrepared})` : undefined}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isPrepared
                        ? 'bg-amber-800 text-amber-100 hover:bg-amber-900'
                        : atMax
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {isPrepared ? '◇ Unprepare' : '✦ Prepare'}
                  </button>
                )}
                <button
                  onClick={() => {
                    if (isCantrip) {
                      castMutation.mutate({ spell: selectedSpell, slotLevel: 0 })
                    } else {
                      setSelectedSpell(null)
                      setCastingSpell(selectedSpell)
                    }
                  }}
                  disabled={!canCast}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    canCast ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Cast
                </button>
              </>
            }
          />
        )
      })()}

      {castingSpell && (
        <CastModal
          spell={castingSpell}
          character={character}
          slots={slotsData}
          onConfirm={(slotLevel, castAsRitual) => castMutation.mutate({ spell: castingSpell, slotLevel, castAsRitual })}
          onClose={() => setCastingSpell(null)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Divine Spell List — all class spells with prepare & favorite toggles
// ─────────────────────────────────────────────────────────────────────────────

function DivineSpellList({ characterId, character, embedded }: { characterId: string; character: Character; embedded?: boolean }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  type Filter = 'all' | 'prepared' | 'favorites' | number
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null)
  const [castingSpell, setCastingSpell] = useState<Spell | null>(null)

  const { data: allSpells = [], isLoading } = useQuery({
    queryKey: ['spells', character.gameType],
    queryFn: () => spellsApi.getAll(character.gameType),
  })
  const { data: preparedList = [] } = useQuery({
    queryKey: ['preparedSpells', characterId],
    queryFn: () => preparedSpellsApi.getAll(characterId),
  })
  const { data: slotsData = [] } = useQuery({
    queryKey: ['spellsPerDay', characterId],
    queryFn: () => spellsPerDayApi.getToday(characterId),
  })

  const preparedIds = new Set(
    preparedList.filter((p) => p.isPrepared || p.isAlwaysPrepared).map((p) => p.spellId)
  )
  const favoriteIds = new Set(preparedList.filter((p) => p.isFavorite).map((p) => p.spellId))
  // Only count spells that actually exist in the spell database to avoid stale/orphaned rows inflating the count
  const knownSpellIds = useMemo(() => new Set(allSpells.map(s => s.id ?? s.name!)), [allSpells])
  const preparedCount = preparedList.filter(
    (p) => p.isPrepared && !p.isAlwaysPrepared && knownSpellIds.has(p.spellId)
  ).length

  const visibleSpells = useMemo(() => {
    const charClass = resolveClassName(character.characterClass)
    const q = search.toLowerCase()

    let pool: Spell[]
    if (filter === 'all') {
      // All filter: search the entire spell database (no class restriction)
      pool = allSpells
    } else if (filter === 'prepared') {
      pool = allSpells.filter((s) => preparedIds.has(s.id ?? s.name!))
    } else if (filter === 'favorites') {
      pool = allSpells.filter((s) => favoriteIds.has(s.id ?? s.name!))
    } else {
      // Level filter: restrict to class spells at that level
      pool = allSpells.filter((s) => getLevelForClass(s.spell_level, charClass) === filter)
    }

    if (q) pool = pool.filter((s) => s.name?.toLowerCase().includes(q))

    return pool.sort((a, b) => {
      const aLvl = getLevelForClass(a.spell_level, charClass) ?? parseFirstLevel(a.spell_level)
      const bLvl = getLevelForClass(b.spell_level, charClass) ?? parseFirstLevel(b.spell_level)
      if (aLvl !== bLvl) return aLvl - bLvl
      return (a.name ?? '').localeCompare(b.name ?? '')
    })
  }, [allSpells, search, filter, preparedList, character])

  const prepareMutation = useMutation({
    mutationFn: (spell: Spell) => {
      const key = spell.id ?? spell.name!
      const existing = preparedList.find((p) => p.spellId === key)
      // Toggle the isPrepared flag directly — don't use preparedIds which conflates isAlwaysPrepared
      const currentlyPrepared = existing?.isPrepared ?? false
      return preparedSpellsApi.upsert(characterId, key, {
        spellId: key,
        isPrepared: !currentlyPrepared,
        isAlwaysPrepared: existing?.isAlwaysPrepared ?? false,
        isFavorite: existing?.isFavorite ?? false,
        isDomainSpell: existing?.isDomainSpell ?? false,
      })
    },
    onSuccess: (updated) => {
      qc.setQueryData<PreparedSpell[]>(['preparedSpells', characterId], old => {
        if (!old) return [updated]
        const exists = old.some(p => p.spellId === updated.spellId)
        return exists ? old.map(p => p.spellId === updated.spellId ? updated : p) : [...old, updated]
      })
      qc.invalidateQueries({ queryKey: ['preparedSpells', characterId] })
      setSelectedSpell(null)
    },
  })

  const favoriteMutation = useMutation({
    mutationFn: (spell: Spell) => {
      const key = spell.id ?? spell.name!
      const isFavorite = favoriteIds.has(key)
      const existing = preparedList.find((p) => p.spellId === key)
      return preparedSpellsApi.upsert(characterId, key, {
        spellId: key,
        isPrepared: existing?.isPrepared ?? false,
        isAlwaysPrepared: existing?.isAlwaysPrepared ?? false,
        isFavorite: !isFavorite,
        isDomainSpell: existing?.isDomainSpell ?? false,
      })
    },
    onSuccess: (updated) => {
      qc.setQueryData<PreparedSpell[]>(['preparedSpells', characterId], old => {
        if (!old) return [updated]
        const exists = old.some(p => p.spellId === updated.spellId)
        return exists ? old.map(p => p.spellId === updated.spellId ? updated : p) : [...old, updated]
      })
      qc.invalidateQueries({ queryKey: ['preparedSpells', characterId] })
    },
  })

  const alwaysPreparedMutation = useMutation({
    mutationFn: (spell: Spell) => {
      const key = spell.id ?? spell.name!
      const existing = preparedList.find((p) => p.spellId === key)
      const currentlyAlways = existing?.isAlwaysPrepared ?? false
      return preparedSpellsApi.upsert(characterId, key, {
        spellId: key,
        // Removing always-prepared also clears manual prepare so it doesn't linger
        isPrepared: currentlyAlways ? false : (existing?.isPrepared ?? false),
        isAlwaysPrepared: !currentlyAlways,
        isFavorite: existing?.isFavorite ?? false,
        isDomainSpell: !currentlyAlways, // treat as domain/oath spell when marking always prepared
      })
    },
    onSuccess: (updated) => {
      qc.setQueryData<PreparedSpell[]>(['preparedSpells', characterId], old => {
        if (!old) return [updated]
        const exists = old.some(p => p.spellId === updated.spellId)
        return exists ? old.map(p => p.spellId === updated.spellId ? updated : p) : [...old, updated]
      })
      qc.invalidateQueries({ queryKey: ['preparedSpells', characterId] })
    },
  })

  const castMutation = useMutation({
    mutationFn: async ({ spell, slotLevel, castAsRitual }: { spell: Spell; slotLevel: number; castAsRitual?: boolean }) => {
      if (!castAsRitual && slotLevel > 0) {
        const slotData = slotsData.find((s) => s.spellLevel === slotLevel)
        const used = slotData?.usedSlots ?? 0
        const max = character.maxSpellsPerDay?.[slotLevel] ?? 0
        await spellsPerDayApi.upsert(characterId, slotLevel, { spellLevel: slotLevel, maxSlots: max, usedSlots: used + 1 })
      }
      await spellLogsApi.create(characterId, {
        spellName: spell.name,
        spellLevel: slotLevel,
        castAsRitual: castAsRitual ?? false,
        success: true,
        sessionId: 0,
      })
    },
    onSuccess: (_void, { slotLevel, castAsRitual }) => {
      if (!castAsRitual && slotLevel > 0) {
        qc.setQueryData<SpellsPerDay[]>(['spellsPerDay', characterId], old =>
          old?.map(s => s.spellLevel === slotLevel ? { ...s, usedSlots: s.usedSlots + 1 } : s) ?? []
        )
        qc.invalidateQueries({ queryKey: ['spellsPerDay', characterId] })
      }
      setCastingSpell(null)
      setSelectedSpell(null)
    },
  })

  const spellcastingMod = getSpellcastingModifier(character.abilityScores, character.characterClass)
  const maxPrepared = character.level + spellcastingMod

  function hasAvailableSlot(spell: Spell): boolean {
    const charClass = resolveClassName(character.characterClass)
    const lvl = getLevelForClass(spell.spell_level, charClass) ?? 0
    if (lvl === 0) return true
    return Object.entries(character.maxSpellsPerDay ?? {}).some(([slvl, max]) => {
      const slotLevel = Number(slvl)
      if (slotLevel < lvl) return false
      const slotData = slotsData.find((s) => s.spellLevel === slotLevel)
      return max - (slotData?.usedSlots ?? 0) > 0
    })
  }

  return (
    <div className={embedded ? 'bg-gray-950 text-white flex flex-col' : 'min-h-screen bg-gray-950 text-white flex flex-col'}>
      {!embedded && (
        <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/characters/${characterId}`)} aria-label="Go back" className="text-gray-400 hover:text-white">←</button>
          <h1 className="text-lg font-bold flex-1">Spell List</h1>
          <span className="text-sm text-amber-400">{preparedCount}/{maxPrepared} prepared</span>
        </header>
      )}
      <LevelUpBanner />

      <div className="p-4 space-y-3">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search spells…"
          className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-amber-500 focus:outline-none"
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setFilter('all')}
              aria-pressed={filter === 'all'}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                filter === 'all' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('prepared')}
              aria-pressed={filter === 'prepared'}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                filter === 'prepared' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              ✦ Prepared
            </button>
            <button
              onClick={() => setFilter('favorites')}
              aria-pressed={filter === 'favorites'}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                filter === 'favorites' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              ⭐ Favorites
            </button>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
              <button
                key={l}
                onClick={() => setFilter(l)}
                aria-pressed={filter === l}
                className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                  filter === l ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {l === 0 ? 'Cantrip' : `Level ${l}`}
              </button>
            ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {isLoading ? (
          <div className="text-center text-gray-400 py-12">Loading spells…</div>
        ) : visibleSpells.length === 0 ? (
          <div className="text-center text-gray-400 py-12">No spells found</div>
        ) : (
          visibleSpells.map((spell) => {
            const key = spell.id ?? spell.name!
            const isPrepared = preparedIds.has(key)
            const isFavorite = favoriteIds.has(key)
            const charClass = resolveClassName(character.characterClass)
            const lvl = getLevelForClass(spell.spell_level, charClass) ?? parseFirstLevel(spell.spell_level)
            return (
              <div
                key={key}
                className={`rounded-xl px-4 py-3 flex items-center gap-3 transition-colors ${
                  isPrepared ? 'bg-amber-900/50 border border-amber-700/60' : 'bg-gray-900'
                }`}
              >
                <button className="flex-1 text-left" onClick={() => setSelectedSpell(spell)}>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${isPrepared ? 'text-amber-100' : 'text-white'}`}>{spell.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isPrepared ? 'bg-amber-800/60 text-amber-300' : 'bg-gray-800 text-gray-400'}`}>
                      {lvl === 0 ? 'Cantrip' : `L${lvl}`}
                    </span>
                  </div>
                  {spell.school && (
                    <p className={`text-xs mt-0.5 ${isPrepared ? 'text-amber-400' : 'text-indigo-400'}`}>{spell.school}</p>
                  )}
                </button>
                <button
                  onClick={() => favoriteMutation.mutate(spell)}
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  className={`shrink-0 text-xl transition-colors ${isFavorite ? 'text-amber-400' : 'text-gray-600 hover:text-gray-400'}`}
                >
                  {isFavorite ? '⭐' : '☆'}
                </button>
              </div>
            )
          })
        )}
      </div>

      {selectedSpell && (() => {
        const key = selectedSpell.id ?? selectedSpell.name!
        const existing = preparedList.find((p) => p.spellId === key)
        const isPrepared = existing?.isPrepared ?? false
        const isAlwaysPrepared = existing?.isAlwaysPrepared ?? false
        const isFavorite = favoriteIds.has(key)
        const atMax = !isPrepared && !isAlwaysPrepared && preparedCount >= maxPrepared
        const canCast = (isPrepared || isAlwaysPrepared) && hasAvailableSlot(selectedSpell)
        return (
          <SpellDetailModal
            spell={selectedSpell}
            onClose={() => setSelectedSpell(null)}
            footer={
              <div className="flex flex-col gap-2 w-full">
                {/* Row 1: domain/oath toggle + favorite */}
                <div className="flex gap-2">
                  <button
                    onClick={() => alwaysPreparedMutation.mutate(selectedSpell)}
                    title={isAlwaysPrepared ? 'Remove oath/domain designation' : 'Mark as oath or domain spell — always prepared, never uses a slot'}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isAlwaysPrepared
                        ? 'bg-violet-800 text-violet-100 hover:bg-violet-900'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                    }`}
                  >
                    {isAlwaysPrepared ? '◈ Oath/Domain' : '◇ Mark Oath/Domain'}
                  </button>
                  <button
                    onClick={() => favoriteMutation.mutate(selectedSpell)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isFavorite ? 'bg-amber-900/60 text-amber-300 hover:bg-amber-900' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {isFavorite ? '⭐' : '☆'}
                  </button>
                </div>
                {/* Row 2: prepare + cast */}
                <div className="flex gap-2">
                  {!isAlwaysPrepared && (
                    <button
                      onClick={() => !atMax && prepareMutation.mutate(selectedSpell)}
                      disabled={atMax}
                      title={atMax ? `Prepared spells limit reached (${maxPrepared})` : undefined}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isPrepared
                          ? 'bg-amber-800 text-amber-100 hover:bg-amber-900'
                          : atMax
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {isPrepared ? '◇ Unprepare' : '✦ Prepare'}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const charClass = resolveClassName(character.characterClass)
                      const lvl = getLevelForClass(selectedSpell.spell_level, charClass) ?? 0
                      if (lvl === 0) {
                        castMutation.mutate({ spell: selectedSpell, slotLevel: 0 })
                      } else {
                        setSelectedSpell(null)
                        setCastingSpell(selectedSpell)
                      }
                    }}
                    disabled={!canCast}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      canCast ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Cast
                  </button>
                </div>
              </div>
            }
          />
        )
      })()}

      {castingSpell && (
        <CastModal
          spell={castingSpell}
          character={character}
          slots={slotsData}
          onConfirm={(slotLevel, castAsRitual) => castMutation.mutate({ spell: castingSpell, slotLevel, castAsRitual })}
          onClose={() => setCastingSpell(null)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getSpellcastingModifier(scores: Record<string, number>, charClass: string): number {
  const relevant: Record<string, string> = {
    Cleric: 'Wisdom', Druid: 'Wisdom', Shaman: 'Wisdom', Inquisitor: 'Wisdom',
    Paladin: 'Charisma', Oracle: 'Charisma',
    Wizard: 'Intelligence', Artificer: 'Intelligence',
    Sorcerer: 'Charisma', Bard: 'Charisma', Warlock: 'Charisma',
  }
  const key = relevant[charClass] ?? 'Wisdom'
  return Math.floor(((scores[key] ?? 10) - 10) / 2)
}

// ─────────────────────────────────────────────────────────────────────────────
// Cast Modal — slot level selection with upcast support
// ─────────────────────────────────────────────────────────────────────────────

function CastModal({ spell, character, slots, onConfirm, onClose }: {
  spell: Spell
  character: Character
  slots: SpellsPerDay[]
  onConfirm: (slotLevel: number, castAsRitual?: boolean) => void
  onClose: () => void
}) {
  const charClass = resolveClassName(character.characterClass)
  const baseLevel = getLevelForClass(spell.spell_level, charClass) ?? 0
  const maxSlotMap = character.maxSpellsPerDay ?? {}

  const availableLevels = Object.entries(maxSlotMap)
    .map(([lvl]) => Number(lvl))
    .filter((lvl) => {
      if (lvl < baseLevel) return false
      const slotData = slots.find((s) => s.spellLevel === lvl)
      const used = slotData?.usedSlots ?? 0
      return (maxSlotMap[lvl] ?? 0) - used > 0
    })
    .sort((a, b) => a - b)

  // 'ritual' | number (slot level)
  type Selection = 'ritual' | number
  const defaultSelection: Selection = spell.ritual ? 'ritual' : (availableLevels[0] ?? baseLevel)
  const [selected, setSelected] = useState<Selection>(defaultSelection)

  if (baseLevel === 0) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-end justify-center p-4 z-50" onClick={onClose}>
        <div className="bg-gray-900 rounded-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-bold mb-2">Cast {spell.name}</h2>
          <p className="text-gray-400 text-sm mb-4">Cantrips don't use spell slots.</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm transition-colors">Cancel</button>
            <button onClick={() => onConfirm(0)} className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors">Cast</button>
          </div>
        </div>
      </div>
    )
  }

  const noSlotsAvailable = availableLevels.length === 0
  const canConfirm = selected === 'ritual' || !noSlotsAvailable

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-1">Cast {spell.name}</h2>
        <p className="text-sm text-gray-400 mb-4">Select how to cast:</p>

        <div className="space-y-2 mb-4">
          {/* Ritual option — always first if spell is a ritual */}
          {spell.ritual && (
            <button
              onClick={() => setSelected('ritual')}
              aria-pressed={selected === 'ritual'}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${
                selected === 'ritual' ? 'bg-amber-700 text-white' : 'bg-gray-800 hover:bg-gray-700 text-white'
              }`}
            >
              <span>🕯 Cast as Ritual</span>
              <span className={`text-sm ${selected === 'ritual' ? 'text-amber-200' : 'text-gray-400'}`}>
                10 min · no slot
              </span>
            </button>
          )}

          {/* Slot level options */}
          {noSlotsAvailable && !spell.ritual ? (
            <p className="text-red-400 text-sm">No available spell slots of level {baseLevel} or higher.</p>
          ) : (
            availableLevels.map((lvl) => {
              const slotData = slots.find((s) => s.spellLevel === lvl)
              const used = slotData?.usedSlots ?? 0
              const remaining = (maxSlotMap[lvl] ?? 0) - used
              return (
                <button
                  key={lvl}
                  onClick={() => setSelected(lvl)}
                  aria-pressed={selected === lvl}
                  className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${
                    selected === lvl ? 'bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-white'
                  }`}
                >
                  <span>Level {lvl}{lvl > baseLevel ? ' (Upcast)' : ''}</span>
                  <span className={`text-sm ${selected === lvl ? 'text-indigo-200' : 'text-gray-400'}`}>
                    {remaining} slot{remaining !== 1 ? 's' : ''} left
                  </span>
                </button>
              )
            })
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm transition-colors">Cancel</button>
          <button
            onClick={() => {
              if (selected === 'ritual') onConfirm(baseLevel, true)
              else onConfirm(selected as number, false)
            }}
            disabled={!canConfirm}
            className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium transition-colors"
          >
            {selected === 'ritual' ? 'Cast (10 min)' : 'Cast'}
          </button>
        </div>
      </div>
    </div>
  )
}

