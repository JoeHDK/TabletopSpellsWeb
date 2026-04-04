import { useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '../api/characters'
import type { Character, UpdateCharacteristicsRequest } from '../types'

type FieldKey = keyof UpdateCharacteristicsRequest

interface FieldDef {
  key: FieldKey
  label: string
  placeholder: string
  multiline?: boolean
}

const PHYSICAL_FIELDS: FieldDef[] = [
  { key: 'age', label: 'Age', placeholder: 'e.g. 24, young adult…' },
  { key: 'height', label: 'Height', placeholder: 'e.g. 5\'10"' },
  { key: 'weight', label: 'Weight', placeholder: 'e.g. 160 lbs' },
  { key: 'eyes', label: 'Eyes', placeholder: 'e.g. hazel, glowing amber…' },
  { key: 'hair', label: 'Hair', placeholder: 'e.g. silver, long and braided…' },
  { key: 'skin', label: 'Skin', placeholder: 'e.g. pale, sun-tanned, grey…' },
]

const RP_FIELDS: FieldDef[] = [
  { key: 'personalityTraits', label: 'Personality Traits', placeholder: 'How does your character behave day-to-day?', multiline: true },
  { key: 'ideals', label: 'Ideals', placeholder: 'What principles does your character live by?', multiline: true },
  { key: 'bonds', label: 'Bonds', placeholder: 'What connects your character to the world?', multiline: true },
  { key: 'flaws', label: 'Flaws', placeholder: 'What weaknesses or vices does your character have?', multiline: true },
  { key: 'appearance', label: 'Appearance', placeholder: 'Describe your character\'s look beyond the basics…', multiline: true },
  { key: 'backstory', label: 'Backstory', placeholder: 'Your character\'s history and origin…', multiline: true },
  { key: 'alliesAndOrganizations', label: 'Allies & Organizations', placeholder: 'Groups and individuals your character has ties to…', multiline: true },
]

function CharacteristicField({
  fieldDef,
  value,
  onBlurSave,
}: {
  fieldDef: FieldDef
  value: string
  onBlurSave: (key: FieldKey, value: string) => void
}) {
  const [local, setLocal] = useState(value)

  const handleBlur = useCallback(() => {
    if (local !== value) onBlurSave(fieldDef.key, local)
  }, [local, value, fieldDef.key, onBlurSave])

  // Keep in sync if parent data changes (e.g. on mount)
  if (local !== value && document.activeElement?.id !== `field-${fieldDef.key}`) {
    setLocal(value)
  }

  const baseClass =
    'w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm resize-none'

  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">
        {fieldDef.label}
      </label>
      {fieldDef.multiline ? (
        <textarea
          id={`field-${fieldDef.key}`}
          rows={3}
          className={baseClass}
          placeholder={fieldDef.placeholder}
          value={local}
          onChange={e => setLocal(e.target.value)}
          onBlur={handleBlur}
        />
      ) : (
        <input
          id={`field-${fieldDef.key}`}
          type="text"
          className={baseClass}
          placeholder={fieldDef.placeholder}
          value={local}
          onChange={e => setLocal(e.target.value)}
          onBlur={handleBlur}
        />
      )}
    </div>
  )
}

export default function CharacteristicsPage({ embedded }: { embedded?: boolean } = {}) {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const { data: character, isLoading } = useQuery({
    queryKey: ['character', id],
    queryFn: () => charactersApi.get(id!),
    enabled: !!id,
  })

  const handleBlurSave = useCallback(
    async (key: FieldKey, value: string) => {
      if (!id) return
      const updated = await charactersApi.updateCharacteristics(id, { [key]: value })
      qc.setQueryData<Character>(['character', id], updated)
      qc.invalidateQueries({ queryKey: ['character', id] })
    },
    [id, qc],
  )

  if (isLoading || !character) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        Loading…
      </div>
    )
  }

  const getValue = (key: FieldKey): string => (character[key] as string | undefined) ?? ''

  return (
    <div className={embedded ? 'p-4 space-y-6' : 'min-h-screen bg-gray-950 text-white p-4 space-y-6'}>
      {/* Physical appearance */}
      <section className="bg-gray-900 rounded-2xl p-4 space-y-3">
        <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Physical</h2>
        <div className="grid grid-cols-2 gap-3">
          {PHYSICAL_FIELDS.map(f => (
            <CharacteristicField
              key={f.key}
              fieldDef={f}
              value={getValue(f.key)}
              onBlurSave={handleBlurSave}
            />
          ))}
        </div>
      </section>

      {/* Roleplay fields */}
      <section className="bg-gray-900 rounded-2xl p-4 space-y-4">
        <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Roleplay</h2>
        {RP_FIELDS.map(f => (
          <CharacteristicField
            key={f.key}
            fieldDef={f}
            value={getValue(f.key)}
            onBlurSave={handleBlurSave}
          />
        ))}
      </section>

      <p className="text-xs text-gray-600 text-center pb-4">Changes save automatically when you leave a field.</p>
    </div>
  )
}
