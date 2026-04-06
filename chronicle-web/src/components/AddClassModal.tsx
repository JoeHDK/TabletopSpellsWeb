import React, { useState } from 'react'
import type { CharacterClass, CharacterClassEntry } from '../types/character'
import { checkMulticlassPrereqs, unmetPrereqsText } from '../utils/multiclassTables'

const DND5E_CLASSES: CharacterClass[] = [
  'Artificer', 'Barbarian', 'Bard', 'Cleric', 'Druid',
  'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue',
  'Sorcerer', 'Warlock', 'Wizard',
]

interface Props {
  existingClasses: CharacterClassEntry[]
  abilityScores: Record<string, number>
  gameType: string
  onConfirm: (entry: CharacterClassEntry) => void
  onCancel: () => void
}

export default function AddClassModal({ existingClasses, abilityScores, gameType, onConfirm, onCancel }: Props) {
  const takenClasses = new Set(existingClasses.map(e => e.characterClass))
  const available = DND5E_CLASSES.filter(c => !takenClasses.has(c))

  const [selectedClass, setSelectedClass] = useState<CharacterClass>(available[0] ?? 'Fighter')
  const [level, setLevel] = useState(1)
  const [confirmed, setConfirmed] = useState(false)

  const isDnd5e = gameType === 'dnd5e'
  const prereqsMet = !isDnd5e || checkMulticlassPrereqs(selectedClass, abilityScores)
  const prereqText = isDnd5e ? unmetPrereqsText(selectedClass, abilityScores) : ''
  const showWarning = isDnd5e && !prereqsMet

  const handleConfirm = () => {
    if (showWarning && !confirmed) {
      setConfirmed(true)
      return
    }
    onConfirm({
      characterClass: selectedClass,
      subclass: 'None',
      level,
      cantripsKnown: 0,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
        <h2 className="text-lg font-bold text-white">Add Class</h2>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Class</label>
          <select
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
            value={selectedClass}
            onChange={e => { setSelectedClass(e.target.value as CharacterClass); setConfirmed(false) }}
          >
            {available.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Starting Level</label>
          <input
            type="number"
            min={1}
            max={20}
            value={level}
            onChange={e => setLevel(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
            className="w-24 bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
          />
        </div>

        {showWarning && (
          <div className="bg-yellow-900/40 border border-yellow-600/50 rounded-lg px-3 py-2 text-xs text-yellow-300">
            ⚠️ {selectedClass} requires {prereqText}.
            {confirmed ? ' Proceeding anyway…' : ' Click Add again to proceed anyway.'}
          </div>
        )}

        {available.length === 0 && (
          <p className="text-xs text-gray-500">All classes are already assigned.</p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2 text-sm font-medium transition-colors disabled:opacity-40"
            onClick={handleConfirm}
            disabled={available.length === 0}
          >
            {showWarning && !confirmed ? '⚠️ Add Anyway' : 'Add Class'}
          </button>
          <button
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded-xl py-2 text-sm font-medium transition-colors"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
