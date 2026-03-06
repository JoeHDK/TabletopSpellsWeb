import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { itemsApi } from '../api/items'
import type { Item } from '../types'

const RARITIES = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact', 'Varies']

function ItemDetailModal({ item, onClose }: { item: Item; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-900 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">{item.name}</h2>
            <p className="text-sm text-indigo-400">{item.category}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className={`px-2 py-0.5 rounded-full font-medium ${rarityColor(item.rarity)}`}>{item.rarity}</span>
          {item.requires_attunement && (
            <span className="px-2 py-0.5 rounded-full bg-amber-900/50 text-amber-300">
              Requires Attunement{item.attunement_note ? ` (${item.attunement_note})` : ''}
            </span>
          )}
          {item.damage && <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">⚔ {item.damage}</span>}
          {item.cost && <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">💰 {item.cost}</span>}
          {item.weight != null && <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">⚖ {item.weight} lb</span>}
        </div>

        {item.properties.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.properties.map((p) => (
              <span key={p} className="text-xs px-2 py-0.5 bg-gray-800 rounded-full text-gray-400">{p}</span>
            ))}
          </div>
        )}

        {item.description && (
          <div className="text-sm text-gray-300 whitespace-pre-line leading-relaxed border-t border-gray-800 pt-3">
            {item.description}
          </div>
        )}
      </div>
    </div>
  )
}

function rarityColor(rarity: string) {
  switch (rarity.toLowerCase()) {
    case 'uncommon': return 'bg-green-900/50 text-green-300'
    case 'rare': return 'bg-blue-900/50 text-blue-300'
    case 'very rare': return 'bg-purple-900/50 text-purple-300'
    case 'legendary': return 'bg-orange-900/50 text-orange-300'
    case 'artifact': return 'bg-red-900/50 text-red-300'
    default: return 'bg-gray-800 text-gray-400'
  }
}

export default function SearchItemsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [rarityFilter, setRarityFilter] = useState<string | undefined>()
  const [typeFilter, setTypeFilter] = useState<string | undefined>()
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)

  const { data: allItems = [], isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: () => itemsApi.getAll(),
  })

  const filtered = useMemo(() => {
    return allItems.filter((item) => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false
      if (rarityFilter && item.rarity !== rarityFilter) return false
      if (typeFilter && item.item_type !== typeFilter) return false
      return true
    })
  }, [allItems, search, rarityFilter, typeFilter])

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Go back" className="text-gray-400 hover:text-white">←</button>
        <h1 className="text-lg font-bold flex-1">Search Items</h1>
        <span className="text-xs text-gray-500">{filtered.length} items</span>
      </header>

      <div className="p-4 space-y-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items…"
          className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none"
        />

        <div className="flex gap-2 overflow-x-auto pb-1">
          {[undefined, 'magic', 'equipment'].map((t) => (
            <button
              key={t ?? 'all'}
              onClick={() => setTypeFilter(t)}
              aria-pressed={typeFilter === t}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                typeFilter === t ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {t === undefined ? 'All' : t === 'magic' ? '✨ Magic' : '🗡 Equipment'}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {[undefined, ...RARITIES].map((r) => (
            <button
              key={r ?? 'all-rarity'}
              onClick={() => setRarityFilter(r)}
              aria-pressed={rarityFilter === r}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                rarityFilter === r ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {r ?? 'Any Rarity'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {isLoading ? (
          <div className="text-center text-gray-400 py-12">Loading items…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-12">No items found</div>
        ) : (
          filtered.map((item) => (
            <button
              key={item.index}
              onClick={() => setSelectedItem(item)}
              className="w-full bg-gray-900 hover:bg-gray-800 rounded-xl px-4 py-3 text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{item.name}</span>
                {item.requires_attunement && <span className="text-xs text-amber-400">◈</span>}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-indigo-400">{item.category}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${rarityColor(item.rarity)}`}>{item.rarity}</span>
                {item.damage && <span className="text-xs text-gray-500">{item.damage}</span>}
              </div>
            </button>
          ))
        )}
      </div>

      {selectedItem && <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />}
    </div>
  )
}
