import { useState, useEffect } from 'react'
import type { CustomItem, SaveCustomItemRequest, DamageEntry } from '../types'

const RARITIES = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact', 'Varies']
const DAMAGE_TYPES = [
  'Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning',
  'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder',
]

interface Props {
  item?: CustomItem
  onSave: (data: SaveCustomItemRequest) => void
  onClose: () => void
  isSaving?: boolean
}

const emptyForm = (): SaveCustomItemRequest => ({
  name: '',
  item_type: 'magic',
  category: '',
  rarity: '',
  description: '',
  requires_attunement: false,
  attunement_note: '',
  cost: '',
  weight: undefined,
  damage: '',
  damage_entries: [],
  properties: [],
})

export default function CustomItemFormModal({ item, onSave, onClose, isSaving }: Props) {
  const [form, setForm] = useState<SaveCustomItemRequest>(emptyForm)
  const [propertiesInput, setPropertiesInput] = useState('')

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name,
        item_type: item.item_type,
        category: item.category ?? '',
        rarity: item.rarity ?? '',
        description: item.description ?? '',
        requires_attunement: item.requires_attunement,
        attunement_note: item.attunement_note ?? '',
        cost: item.cost ?? '',
        weight: item.weight,
        damage: item.damage ?? '',
        damage_entries: item.damage_entries ?? [],
        properties: item.properties,
      })
      setPropertiesInput(item.properties.join(', '))
    } else {
      setForm(emptyForm())
      setPropertiesInput('')
    }
  }, [item])

  const set = <K extends keyof SaveCustomItemRequest>(key: K, value: SaveCustomItemRequest[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const updateDamageEntry = (index: number, field: keyof DamageEntry, value: string) => {
    setForm(f => {
      const entries = [...(f.damage_entries ?? [])]
      entries[index] = { ...entries[index], [field]: value }
      return { ...f, damage_entries: entries }
    })
  }

  const addDamageEntry = () => {
    setForm(f => ({
      ...f,
      damage_entries: [...(f.damage_entries ?? []), { dice: '', damageType: 'Fire' }],
    }))
  }

  const removeDamageEntry = (index: number) => {
    setForm(f => ({
      ...f,
      damage_entries: (f.damage_entries ?? []).filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const properties = propertiesInput
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    onSave({ ...form, properties })
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{item ? 'Edit Custom Item' : 'New Custom Item'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none"
              placeholder="e.g. Staff of Thunder"
            />
          </div>

          {/* Type + Rarity row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type</label>
              <select
                value={form.item_type}
                onChange={(e) => set('item_type', e.target.value as 'magic' | 'equipment')}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="magic">✨ Magic</option>
                <option value="equipment">🗡 Equipment</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Rarity</label>
              <select
                value={form.rarity ?? ''}
                onChange={(e) => set('rarity', e.target.value || undefined)}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">— None —</option>
                {RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Category</label>
            <input
              value={form.category ?? ''}
              onChange={(e) => set('category', e.target.value || undefined)}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none"
              placeholder="e.g. Wondrous Item, Weapon…"
            />
          </div>

          {/* Damage section */}
          <div className="space-y-2">
            <label className="block text-xs text-gray-400">Damage</label>
            {/* Base damage row */}
            <div className="flex gap-2">
              <input
                value={form.damage ?? ''}
                onChange={(e) => set('damage', e.target.value || undefined)}
                className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                placeholder="e.g. 2d6"
              />
              <select
                value={(form.damage_entries ?? [])[0]?.damageType ?? 'Slashing'}
                onChange={(e) => {
                  const entries = [...(form.damage_entries ?? [])]
                  if (entries.length === 0) entries.push({ dice: form.damage ?? '', damageType: e.target.value })
                  else entries[0] = { ...entries[0], damageType: e.target.value }
                  setForm(f => ({ ...f, damage_entries: entries }))
                }}
                className="w-36 bg-gray-800 text-white rounded-lg px-2 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
              >
                {DAMAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {/* Additional damage entries */}
            {(form.damage_entries ?? []).slice(1).map((entry, i) => (
              <div key={i + 1} className="flex gap-2 items-center">
                <input
                  value={entry.dice}
                  onChange={(e) => updateDamageEntry(i + 1, 'dice', e.target.value)}
                  className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                  placeholder="e.g. 1d6"
                />
                <select
                  value={entry.damageType}
                  onChange={(e) => updateDamageEntry(i + 1, 'damageType', e.target.value)}
                  className="w-36 bg-gray-800 text-white rounded-lg px-2 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                >
                  {DAMAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => removeDamageEntry(i + 1)}
                  className="text-red-400 hover:text-red-300 px-2 py-1 text-sm"
                  title="Remove"
                >✕</button>
              </div>
            ))}
            <button
              type="button"
              onClick={addDamageEntry}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              + Add damage
            </button>
          </div>

          {/* Cost + Weight row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Cost</label>
              <input
                value={form.cost ?? ''}
                onChange={(e) => set('cost', e.target.value || undefined)}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none"
                placeholder="500 gp"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Weight (lb)</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={form.weight ?? ''}
                onChange={(e) => set('weight', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none"
                placeholder="1"
              />
            </div>
          </div>

          {/* Attunement */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.requires_attunement}
                onChange={(e) => set('requires_attunement', e.target.checked)}
                className="accent-indigo-500"
              />
              <span className="text-sm text-gray-300">Requires Attunement</span>
            </label>
            {form.requires_attunement && (
              <input
                value={form.attunement_note ?? ''}
                onChange={(e) => set('attunement_note', e.target.value || undefined)}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none"
                placeholder="e.g. by a spellcaster"
              />
            )}
          </div>

          {/* Properties */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Properties (comma-separated)</label>
            <input
              value={propertiesInput}
              onChange={(e) => setPropertiesInput(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none"
              placeholder="e.g. Finesse, Light, Thrown"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Description</label>
            <textarea
              rows={4}
              value={form.description ?? ''}
              onChange={(e) => set('description', e.target.value || undefined)}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none resize-none"
              placeholder="Describe the item…"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors font-medium"
            >
              {isSaving ? 'Saving…' : item ? 'Save Changes' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}