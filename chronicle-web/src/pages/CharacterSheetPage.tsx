import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '../api/characters'
import { racesApi } from '../api/races'
import { inventoryApi } from '../api/inventory'
import { attacksApi } from '../api/attacks'
import { characterFeatsApi } from '../api/characterFeats'
import { classResourcesApi } from '../api/classResources'
import { spellsPerDayApi, spellLogsApi, preparedSpellsApi } from '../api/spells'
import { isPreparingCaster } from '../utils/spellUtils'
import StatsPage from './StatsPage'
import SpellListPage from './SpellListPage'
import SpellsPerDayPage from './SpellsPerDayPage'
import SpellLogPage from './SpellLogPage'
import FeatsPage from './FeatsPage'
import InventoryPage from './InventoryPage'
import SearchSpellsPage from './SearchSpellsPage'
import PrepareSpellsPage from './PrepareSpellsPage'
import CharacteristicsPage from './CharacteristicsPage'

type MainTab = 'stats' | 'spells' | 'log' | 'feats' | 'inventory' | 'bio'
type SpellSubTab = 'list' | 'perday' | 'search' | 'prepare'

export default function CharacterSheetPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<MainTab>('stats')
  const [spellSubTab, setSpellSubTab] = useState<SpellSubTab>('list')

  const { data: character, isLoading } = useQuery({
    queryKey: ['character', id],
    queryFn: () => charactersApi.get(id!),
    enabled: !!id,
  })

  const { data: race } = useQuery({
    queryKey: ['race', character?.race],
    queryFn: () => racesApi.getOne(character!.race!),
    enabled: !!character?.race,
  })

  // Eagerly prefetch all tab data so the app works fully offline
  useEffect(() => {
    if (!id) return
    qc.prefetchQuery({ queryKey: ['inventory', id], queryFn: () => inventoryApi.getAll(id) })
    qc.prefetchQuery({ queryKey: ['attacks', id], queryFn: () => attacksApi.getAll(id) })
    qc.prefetchQuery({ queryKey: ['character-feats', id], queryFn: () => characterFeatsApi.getAll(id) })
    qc.prefetchQuery({ queryKey: ['classResources', id], queryFn: () => classResourcesApi.getAll(id) })
    qc.prefetchQuery({ queryKey: ['spellsPerDay', id], queryFn: () => spellsPerDayApi.getToday(id) })
    qc.prefetchQuery({ queryKey: ['spellLogs', id], queryFn: () => spellLogsApi.getAll(id) })
    qc.prefetchQuery({ queryKey: ['preparedSpells', id], queryFn: () => preparedSpellsApi.getAll(id) })
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Loading…</div>
  if (!character) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Character not found</div>

  const canPrepare = isPreparingCaster(character.characterClass)

  const MAIN_TABS: { id: MainTab; label: string; icon: string }[] = [
    { id: 'stats', label: 'Stats', icon: '📊' },
    { id: 'spells', label: 'Spells', icon: '🔮' },
    { id: 'log', label: 'Log', icon: '📜' },
    { id: 'feats', label: 'Feats', icon: '🎯' },
    { id: 'inventory', label: 'Inv', icon: '🎒' },
    { id: 'bio', label: 'Bio', icon: '🧙' },
  ]

  const spellSubTabs: { id: SpellSubTab; label: string }[] = [
    { id: 'list', label: 'Spell List' },
    { id: 'perday', label: 'Per Day' },
    ...(!character.isDivineCaster ? [{ id: 'search' as SpellSubTab, label: 'Search' }] : []),
    ...(canPrepare ? [{ id: 'prepare' as SpellSubTab, label: 'Prepare' }] : []),
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Character header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/characters')}
          aria-label="Back to characters"
          className="text-gray-400 hover:text-white shrink-0"
        >←</button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold truncate">{character.name}</h1>
          <p className="text-xs text-gray-400">
            {race ? `${race.name} ` : ''}{character.characterClass} • Level {character.level}
          </p>
        </div>
      </header>

      {/* Main tab bar */}
      <div className="bg-gray-900 border-b border-gray-800 flex overflow-x-auto shrink-0">
        {MAIN_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              tab === t.id
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Spells sub-tab bar (only visible when spells tab is active) */}
      {tab === 'spells' && (
        <div className="bg-gray-900/50 border-b border-gray-800 flex overflow-x-auto shrink-0 px-2">
          {spellSubTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setSpellSubTab(t.id)}
              className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors rounded-t-md ${
                spellSubTab === t.id
                  ? 'text-indigo-300 bg-gray-800'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'stats' && <StatsPage embedded />}
        {tab === 'spells' && spellSubTab === 'list' && <SpellListPage embedded />}
        {tab === 'spells' && spellSubTab === 'perday' && <SpellsPerDayPage embedded />}
        {tab === 'spells' && spellSubTab === 'search' && <SearchSpellsPage embedded />}
        {tab === 'spells' && spellSubTab === 'prepare' && <PrepareSpellsPage embedded />}
        {tab === 'log' && <SpellLogPage embedded />}
        {tab === 'feats' && <FeatsPage embedded />}
        {tab === 'inventory' && <InventoryPage embedded />}
        {tab === 'bio' && <CharacteristicsPage embedded />}
      </div>
    </div>
  )
}
