import { useRef } from 'react'
import type { Spell } from '../types'
import { useFocusTrap } from '../hooks/useFocusTrap'

interface Props { spell: Spell; onClose: () => void }

export default function SpellDetailModal({ spell, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef, onClose)

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="spell-modal-title"
        className="bg-gray-900 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gray-900 px-6 pt-6 pb-4 border-b border-gray-800 flex items-start justify-between">
          <div>
            <h2 id="spell-modal-title" className="text-xl font-bold">{spell.name}</h2>
            <div className="flex gap-2 mt-1 flex-wrap">
              {spell.school && <span className="text-xs bg-indigo-900/60 text-indigo-300 px-2 py-0.5 rounded-full">{spell.school}</span>}
              {spell.spell_level && <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">{spell.spell_level}</span>}
              {spell.ritual && <span className="text-xs bg-green-900/60 text-green-300 px-2 py-0.5 rounded-full">Ritual</span>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-white text-xl ml-4">✕</button>
        </div>

        <div className="px-6 py-4 space-y-3 text-sm">
          {spell.casting_time && <Row label="Casting Time" value={spell.casting_time} />}
          {spell.range && <Row label="Range" value={spell.range} />}
          {spell.components && <Row label="Components" value={spell.components} />}
          {spell.duration && <Row label="Duration" value={spell.duration} />}
          {spell.targets && <Row label="Targets" value={spell.targets} />}
          {spell.saving_throw && <Row label="Saving Throw" value={spell.saving_throw} />}
          {spell.source && <Row label="Source" value={spell.source} />}

          {spell.description && (
            <div className="pt-2">
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Description</p>
              <p className="text-gray-200 leading-relaxed whitespace-pre-line">{spell.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 w-28 shrink-0">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  )
}
