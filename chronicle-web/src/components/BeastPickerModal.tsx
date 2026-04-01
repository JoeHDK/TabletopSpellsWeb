import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { beastsApi } from '../api/beasts'
import type { Beast } from '../types'

interface Props {
  maxCr: number
  allowFly: boolean
  allowSwim: boolean
  onSelect: (beast: Beast) => void
  onClose: () => void
}

function crLabel(cr: number): string {
  if (cr === 0.125) return '1/8'
  if (cr === 0.25) return '1/4'
  if (cr === 0.5) return '1/2'
  return String(cr)
}

export default function BeastPickerModal({ maxCr, allowFly, allowSwim, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Beast | null>(null)

  const { data: beasts = [], isLoading } = useQuery({
    queryKey: ['beasts', maxCr, allowFly, allowSwim],
    queryFn: () => beastsApi.getBeasts(maxCr, allowFly, allowSwim),
  })

  const filtered = beasts.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleConfirm = () => {
    if (selected) onSelect(selected)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Choose Beast Form</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Max CR {crLabel(maxCr)}{!allowFly ? ' · No fly' : ''}{!allowSwim ? ' · No swim' : ''}
          </p>
          <input
            className="mt-3 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Search beasts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="overflow-y-auto flex-1 p-2">
          {isLoading && (
            <p className="text-center text-gray-400 py-8">Loading…</p>
          )}
          {!isLoading && filtered.length === 0 && (
            <p className="text-center text-gray-400 py-8">No beasts found.</p>
          )}
          {filtered.map((beast) => (
            <button
              key={beast.name}
              onClick={() => setSelected(beast)}
              className={`w-full text-left rounded-lg px-3 py-2.5 mb-1 transition-colors ${
                selected?.name === beast.name
                  ? 'bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 dark:text-white text-sm">{beast.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">CR {crLabel(beast.cr)}</span>
              </div>
              <div className="flex gap-3 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                <span>AC {beast.ac}</span>
                <span>HP {beast.hp}</span>
                <span>{beast.size}</span>
                {beast.flySpeed > 0 && <span>✈ {beast.flySpeed}ft</span>}
                {beast.swimSpeed > 0 && <span>🌊 {beast.swimSpeed}ft</span>}
              </div>
              {selected?.name === beast.name && (
                <div className="flex gap-3 mt-1 text-xs text-indigo-700 dark:text-indigo-300">
                  <span>STR {beast.str}</span>
                  <span>DEX {beast.dex}</span>
                  <span>CON {beast.con}</span>
                  <span>Walk {beast.walkSpeed}ft</span>
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Transform into {selected?.name ?? '…'}
          </button>
        </div>
      </div>
    </div>
  )
}
