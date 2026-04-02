import { useState, useEffect, useRef } from 'react'
import type { CustomItem, SaveCustomItemRequest, DamageEntry, CustomItemAbility } from '../types'
import { spellsApi } from '../api/spells'

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
  abilities: [],
  properties: [],
})

export default function CustomItemFormModal({ item, onSave, onClose, isSaving }: Props) {
  const [form, setForm] = useState<SaveCustomItemRequest>(emptyForm)
  const [propertiesInput, setPropertiesInput] = useState('')
  const [spellSearch, setSpellSearch] = useState<Record<number, string>>({})
  const [spellResults, setSpellResults] = useState<Record<number, { index: string; name: string }[]>>({})
  const spellSearchTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const searchSpells = (idx: number, query: string) => {
    setSpellSearch(s => ({ ...s, [idx]: query }))
    clearTimeout(spellSearchTimers.current[idx])
    if (!query.trim()) { setSpellResults(r => ({ ...r, [idx]: [] })); return }
    spellSearchTimers.current[idx] = setTimeout(async () => {
      try {
        const results = await spellsApi.getAll('dnd5e' as any, { search: query })
        setSpellResults(r => ({ ...r, [idx]: results.slice(0, 8).map(s => ({ index: s.id, name: s.name })) }))
      } catch { /* ignore */ }
    }, 300)
  }

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
        abilities: item.abilities ?? [],
        properties: item.properties,
        ac_bonus: item.ac_bonus,
        saving_throw_bonus: item.saving_throw_bonus,
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

  const addAbility = () => {
    setForm(f => ({
      ...f,
      abilities: [...(f.abilities ?? []), { name: '', maxUses: 1, resetOn: 'long_rest' }],
    }))
  }

  const updateAbility = (index: number, patch: Partial<CustomItemAbility>) => {
    setForm(f => {
      const abilities = [...(f.abilities ?? [])]
      abilities[index] = { ...abilities[index], ...patch }
      return { ...f, abilities }
    })
  }

  const removeAbility = (index: number) => {
    setForm(f => ({
      ...f,
      abilities: (f.abilities ?? []).filter((_, i) => i !== index),
    }))
    setSpellSearch(s => { const n = { ...s }; delete n[index]; return n })
    setSpellResults(r => { const n = { ...r }; delete n[index]; return n })
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
            {/* Base damage row: free-text dice + inline + button */}
            <div className="flex gap-2">
              <input
                value={form.damage ?? ''}
                onChange={(e) => set('damage', e.target.value || undefined)}
                className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                placeholder="e.g. 2d6+4"
              />
              <button
                type="button"
                onClick={addDamageEntry}
                className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-indigo-300 text-sm font-bold leading-none transition-colors"
                title="Add extra damage"
              >+</button>
            </div>
            {/* Additional typed damage entries */}
            {(form.damage_entries ?? []).map((entry, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  value={entry.dice}
                  onChange={(e) => updateDamageEntry(i, 'dice', e.target.value)}
                  className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                  placeholder="e.g. 1d6"
                />
                <select
                  value={entry.damageType}
                  onChange={(e) => updateDamageEntry(i, 'damageType', e.target.value)}
                  className="w-36 bg-gray-800 text-white rounded-lg px-2 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                >
                  {DAMAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => removeDamageEntry(i)}
                  className="text-red-400 hover:text-red-300 px-2 py-1 text-sm"
                  title="Remove"
                >✕</button>
              </div>
            ))}
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

          {/* Bonuses */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">AC Bonus</label>
              <input
                type="number"
                value={form.ac_bonus ?? ''}
                onChange={(e) => set('ac_bonus', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                placeholder="+1, +2…"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Save Bonus (all saves)</label>
              <input
                type="number"
                value={form.saving_throw_bonus ?? ''}
                onChange={(e) => set('saving_throw_bonus', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                placeholder="+1, +2…"
              />
            </div>
          </div>

          {/* Abilities */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Abilities</label>
              <button
                type="button"
                onClick={addAbility}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >＋ Add Ability</button>
            </div>
            {(form.abilities ?? []).map((ability, idx) => (
              <div key={idx} className="bg-gray-800 rounded-lg p-3 space-y-2 border border-gray-700">
                {/* Spell search / name */}
                <div className="relative">
                  <input
                    type="text"
                    value={spellSearch[idx] ?? ability.name}
                    onChange={e => {
                      searchSpells(idx, e.target.value)
                      updateAbility(idx, { name: e.target.value, spellIndex: undefined })
                    }}
                    placeholder="Ability name or search spell…"
                    className="w-full bg-gray-900 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none text-sm pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => removeAbility(idx)}
                    className="absolute right-2 top-2 text-gray-500 hover:text-red-400 text-sm leading-none"
                  >✕</button>
                  {(spellResults[idx]?.length ?? 0) > 0 && (
                    <div className="absolute z-10 left-0 right-0 bg-gray-800 border border-gray-600 rounded-lg mt-1 overflow-hidden shadow-xl">
                      {spellResults[idx].map(spell => (
                        <button
                          key={spell.index}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 text-white"
                          onClick={() => {
                            updateAbility(idx, { name: spell.name, spellIndex: spell.index })
                            setSpellSearch(s => ({ ...s, [idx]: '' }))
                            setSpellResults(r => ({ ...r, [idx]: [] }))
                          }}
                        >{spell.name}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Max Uses</label>
                    <input
                      type="number"
                      min={1}
                      value={ability.maxUses}
                      onChange={e => updateAbility(idx, { maxUses: Math.max(1, Number(e.target.value)) })}
                      className="w-full bg-gray-900 text-white rounded-lg px-3 py-1.5 border border-gray-600 focus:border-indigo-500 focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Resets On</label>
                    <select
                      value={ability.resetOn}
                      onChange={e => updateAbility(idx, { resetOn: e.target.value as 'short_rest' | 'long_rest' })}
                      className="w-full bg-gray-900 text-white rounded-lg px-3 py-1.5 border border-gray-600 focus:border-indigo-500 focus:outline-none text-sm"
                    >
                      <option value="short_rest">Short Rest</option>
                      <option value="long_rest">Long Rest</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
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