import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { monstersApi, customMonstersApi } from '../api/monsters'
import type { MonsterSummary, Monster, CustomMonster, SaveCustomMonsterRequest, MonsterAttack, MonsterSpell } from '../types'
import CreatureStatBlockModal from '../components/CreatureStatBlockModal'
import { DAMAGE_TYPES } from '../constants/damage'

function crDisplay(cr: number): string {
  if (cr === 0.125) return '1/8'
  if (cr === 0.25) return '1/4'
  if (cr === 0.5) return '1/2'
  return String(cr)
}

const SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan']
const CREATURE_TYPES = [
  'aberration', 'beast', 'celestial', 'construct', 'dragon', 'elemental',
  'fey', 'fiend', 'giant', 'humanoid', 'monstrosity', 'ooze', 'plant', 'undead',
]

function newAttack(): MonsterAttack {
  return { id: crypto.randomUUID(), name: '', attackBonus: undefined, range: '5 ft.', hitDamage: '', damageType: 'slashing', description: '' }
}
function newSpell(): MonsterSpell {
  return { id: crypto.randomUUID(), name: '', usageNote: '' }
}

const emptyMonsterForm = (): SaveCustomMonsterRequest => ({
  name: '', type: 'humanoid', challengeRating: 0, hitPoints: 10, armorClass: 10,
  speed: '30 ft.', size: 'Medium',
  strength: 10, dexterity: 10, constitution: 10,
  intelligence: 10, wisdom: 10, charisma: 10,
  description: '',
  attacks: [],
  spells: [],
})

function CustomMonsterModal({
  monster, onSave, onClose, isSaving,
}: {
  monster?: CustomMonster
  onSave: (data: SaveCustomMonsterRequest) => void
  onClose: () => void
  isSaving?: boolean
}) {
  const [form, setForm] = useState<SaveCustomMonsterRequest>(
    monster
      ? {
          name: monster.name, type: monster.type, challengeRating: monster.challengeRating,
          hitPoints: monster.hitPoints, armorClass: monster.armorClass,
          speed: monster.speed, size: monster.size,
          strength: monster.strength, dexterity: monster.dexterity, constitution: monster.constitution,
          intelligence: monster.intelligence, wisdom: monster.wisdom, charisma: monster.charisma,
          description: monster.description ?? '',
          attacks: monster.attacks ?? [],
          spells: monster.spells ?? [],
        }
      : emptyMonsterForm()
  )
  const set = <K extends keyof SaveCustomMonsterRequest>(k: K, v: SaveCustomMonsterRequest[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const abilityMod = (score: number) => {
    const mod = Math.floor((score - 10) / 2)
    return mod >= 0 ? `+${mod}` : String(mod)
  }

  const updateAttack = (id: string, patch: Partial<MonsterAttack>) =>
    set('attacks', form.attacks.map(a => a.id === id ? { ...a, ...patch } : a))
  const removeAttack = (id: string) => set('attacks', form.attacks.filter(a => a.id !== id))

  const updateSpell = (id: string, patch: Partial<MonsterSpell>) =>
    set('spells', form.spells.map(s => s.id === id ? { ...s, ...patch } : s))
  const removeSpell = (id: string) => set('spells', form.spells.filter(s => s.id !== id))

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{monster ? 'Edit Creature' : 'New Custom Creature'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Name *</label>
            <input required value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none"
              placeholder="e.g. Shadow Drake" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Type</label>
            <select value={form.type} onChange={e => set('type', e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:outline-none">
              {CREATURE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Size</label>
            <select value={form.size} onChange={e => set('size', e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:outline-none">
              {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Challenge Rating</label>
            <input type="number" min={0} step={0.25} value={form.challengeRating}
              onChange={e => set('challengeRating', Number(e.target.value))}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Speed</label>
            <input value={form.speed} onChange={e => set('speed', e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none"
              placeholder="30 ft." />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Hit Points</label>
            <input type="number" min={1} value={form.hitPoints} onChange={e => set('hitPoints', Number(e.target.value))}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Armor Class</label>
            <input type="number" min={1} value={form.armorClass} onChange={e => set('armorClass', Number(e.target.value))}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none" />
          </div>
        </div>

        {/* Ability scores */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">Ability Scores</label>
          <div className="grid grid-cols-6 gap-2">
            {([
              ['STR', 'strength'], ['DEX', 'dexterity'], ['CON', 'constitution'],
              ['INT', 'intelligence'], ['WIS', 'wisdom'], ['CHA', 'charisma'],
            ] as [string, keyof SaveCustomMonsterRequest][]).map(([abbr, key]) => (
              <div key={key} className="text-center">
                <label className="block text-xs text-gray-400 mb-1">{abbr}</label>
                <input type="number" min={1} max={30} value={form[key] as number}
                  onChange={e => set(key, Number(e.target.value))}
                  className="w-full bg-gray-800 text-white rounded-lg px-1 py-1.5 border border-gray-700 focus:border-indigo-500 focus:outline-none text-center text-sm" />
                <p className="text-xs text-gray-500 mt-0.5">{abilityMod(form[key] as number)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Attacks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400 font-medium">Attacks</label>
            <button type="button" onClick={() => set('attacks', [...form.attacks, newAttack()])}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              + Add Attack
            </button>
          </div>
          {form.attacks.length === 0 ? (
            <p className="text-xs text-gray-600 italic">No attacks defined.</p>
          ) : (
            <div className="space-y-3">
              {form.attacks.map(atk => (
                <div key={atk.id} className="bg-gray-800 rounded-lg p-3 space-y-2">
                  <div className="flex gap-2">
                    <input value={atk.name} onChange={e => updateAttack(atk.id, { name: e.target.value })}
                      placeholder="Attack name (e.g. Longsword)"
                      className="flex-1 bg-gray-700 text-white text-sm rounded px-2 py-1.5 border border-gray-600 focus:border-indigo-500 focus:outline-none" />
                    <button type="button" onClick={() => removeAttack(atk.id)}
                      className="text-gray-500 hover:text-red-400 text-xs transition-colors px-1">✕</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">Attack Bonus</label>
                      <input type="number" value={atk.attackBonus ?? ''} onChange={e => updateAttack(atk.id, { attackBonus: e.target.value === '' ? undefined : Number(e.target.value) })}
                        placeholder="+5"
                        className="w-full bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:border-indigo-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">Range / Reach</label>
                      <input value={atk.range ?? ''} onChange={e => updateAttack(atk.id, { range: e.target.value })}
                        placeholder="5 ft."
                        className="w-full bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:border-indigo-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">Damage Dice</label>
                      <input value={atk.hitDamage ?? ''} onChange={e => updateAttack(atk.id, { hitDamage: e.target.value })}
                        placeholder="1d8+3"
                        className="w-full bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:border-indigo-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">Damage Type</label>
                      <select value={atk.damageType ?? ''} onChange={e => updateAttack(atk.id, { damageType: e.target.value })}
                        className="w-full bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:outline-none">
                        <option value="">—</option>
                        {DAMAGE_TYPES.map(dt => <option key={dt} value={dt}>{dt.charAt(0).toUpperCase() + dt.slice(1)}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">Additional Effect / Description</label>
                    <input value={atk.description ?? ''} onChange={e => updateAttack(atk.id, { description: e.target.value })}
                      placeholder="On hit: target is grappled…"
                      className="w-full bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:border-indigo-500 focus:outline-none" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Spells */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400 font-medium">Spells</label>
            <button type="button" onClick={() => set('spells', [...form.spells, newSpell()])}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              + Add Spell
            </button>
          </div>
          {form.spells.length === 0 ? (
            <p className="text-xs text-gray-600 italic">No spells defined.</p>
          ) : (
            <div className="space-y-2">
              {form.spells.map(sp => (
                <div key={sp.id} className="flex gap-2 items-center bg-gray-800 rounded-lg px-3 py-2">
                  <input value={sp.name} onChange={e => updateSpell(sp.id, { name: e.target.value })}
                    placeholder="Spell name (e.g. Fireball)"
                    className="flex-1 bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:border-indigo-500 focus:outline-none" />
                  <input value={sp.usageNote ?? ''} onChange={e => updateSpell(sp.id, { usageNote: e.target.value })}
                    placeholder="3/day"
                    className="w-24 bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:border-indigo-500 focus:outline-none" />
                  <button type="button" onClick={() => removeSpell(sp.id)}
                    className="text-gray-500 hover:text-red-400 text-xs transition-colors">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Description / Notes</label>
          <textarea rows={3} value={form.description ?? ''} onChange={e => set('description', e.target.value || undefined)}
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none resize-none text-sm"
            placeholder="Notes, lore, special traits…" />
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
            Cancel
          </button>
          <button type="button" disabled={isSaving || !form.name} onClick={() => onSave(form)}
            className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors font-medium">
            {isSaving ? 'Saving…' : monster ? 'Save Changes' : 'Create Creature'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CreatureLibraryPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [minCr, setMinCr] = useState('')
  const [maxCr, setMaxCr] = useState('')
  const [selected, setSelected] = useState<Monster | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingMonster, setEditingMonster] = useState<CustomMonster | undefined>()

  const params = {
    search: search || undefined,
    type: typeFilter || undefined,
    minCr: minCr ? Number(minCr) : undefined,
    maxCr: maxCr ? Number(maxCr) : undefined,
  }

  const { data: monsters = [], isLoading } = useQuery<MonsterSummary[]>({
    queryKey: ['monsters', params],
    queryFn: () => monstersApi.getAll(params),
  })

  const { data: types = [] } = useQuery<string[]>({
    queryKey: ['monster-types'],
    queryFn: monstersApi.getTypes,
    staleTime: Infinity,
  })

  const { data: fullMonster, isLoading: isLoadingDetail } = useQuery<Monster>({
    queryKey: ['monster', selected?.name],
    queryFn: () => monstersApi.getByName(selected!.name),
    enabled: !!selected,
    staleTime: Infinity,
  })

  // Fetch all custom monsters for editing (we need full data including id)
  const { data: customMonsters = [] } = useQuery<CustomMonster[]>({
    queryKey: ['custom-monsters'],
    queryFn: customMonstersApi.getAll,
    enabled: typeFilter === 'custom',
  })

  const createMutation = useMutation({
    mutationFn: (data: SaveCustomMonsterRequest) => customMonstersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monsters'] })
      qc.invalidateQueries({ queryKey: ['monster-types'] })
      qc.invalidateQueries({ queryKey: ['custom-monsters'] })
      setFormOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SaveCustomMonsterRequest }) =>
      customMonstersApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monsters'] })
      qc.invalidateQueries({ queryKey: ['custom-monsters'] })
      setFormOpen(false)
      setEditingMonster(undefined)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customMonstersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monsters'] })
      qc.invalidateQueries({ queryKey: ['monster-types'] })
      qc.invalidateQueries({ queryKey: ['custom-monsters'] })
    },
  })

  // All type options — always include 'custom'
  const allTypes = types.includes('custom') ? types : [...types, 'custom']
  const isCustomFilter = typeFilter === 'custom'

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">🐉 Creature Library</h1>
          {isCustomFilter && (
            <button
              onClick={() => { setEditingMonster(undefined); setFormOpen(true) }}
              className="text-sm bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg transition-colors"
            >
              + New Creature
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="Search creatures..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Types</option>
            {allTypes.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">CR</span>
            <input
              type="number"
              placeholder="Min"
              value={minCr}
              onChange={(e) => setMinCr(e.target.value)}
              min={0}
              step={0.25}
              className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <span className="text-gray-500">–</span>
            <input
              type="number"
              placeholder="Max"
              value={maxCr}
              onChange={(e) => setMaxCr(e.target.value)}
              min={0}
              step={0.25}
              className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <p className="text-center text-gray-500 py-16">Loading creatures...</p>
        ) : monsters.length === 0 ? (
          <div className="text-center text-gray-500 py-16">
            <p>No creatures found.</p>
            {isCustomFilter && (
              <button
                onClick={() => { setEditingMonster(undefined); setFormOpen(true) }}
                className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
              >
                Create your first custom creature →
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-3">{monsters.length} creature{monsters.length !== 1 ? 's' : ''}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {monsters.map((m) => {
                const isCustom = m.source === 'custom'
                const fullCustom = isCustom ? customMonsters.find(c => c.name === m.name) : undefined
                return (
                  <div key={m.name + m.source} className="relative group">
                    <button
                      onClick={() => setSelected(m as Monster)}
                      className="w-full bg-gray-900 border border-gray-700 hover:border-indigo-500 rounded-lg px-4 py-3 text-left transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-white group-hover:text-indigo-300 transition-colors truncate pr-2">{m.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {isCustom && (
                            <span className="text-xs bg-indigo-900/50 text-indigo-400 px-1.5 py-0.5 rounded-full">Custom</span>
                          )}
                          <span className="text-xs font-bold text-amber-400">CR {crDisplay(m.cr)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{m.size} {m.type}</span>
                        <span>·</span>
                        <span>AC {m.ac}</span>
                        <span>·</span>
                        <span>HP {m.hp}</span>
                      </div>
                    </button>
                    {isCustom && fullCustom && (
                      <div className="absolute top-2 right-2 hidden group-hover:flex gap-1 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingMonster(fullCustom)
                            setFormOpen(true)
                          }}
                          className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 px-2 py-1 rounded text-gray-300 transition-colors"
                          title="Edit"
                        >
                          ✏
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm(`Delete "${m.name}"?`)) deleteMutation.mutate(fullCustom.id)
                          }}
                          className="text-xs bg-gray-800 hover:bg-red-900/50 hover:text-red-400 border border-gray-700 px-2 py-1 rounded text-gray-500 transition-colors"
                          title="Delete"
                        >
                          🗑
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Stat block modal */}
      {selected && (
        isLoadingDetail ? (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <p className="text-white">Loading...</p>
          </div>
        ) : fullMonster ? (
          <CreatureStatBlockModal
            monster={fullMonster}
            onClose={() => setSelected(null)}
          />
        ) : null
      )}

      {/* Custom creature create/edit modal */}
      {formOpen && (
        <CustomMonsterModal
          monster={editingMonster}
          onClose={() => { setFormOpen(false); setEditingMonster(undefined) }}
          isSaving={createMutation.isPending || updateMutation.isPending}
          onSave={(data) => {
            if (editingMonster?.id) {
              updateMutation.mutate({ id: editingMonster.id, data })
            } else {
              createMutation.mutate(data)
            }
          }}
        />
      )}
    </div>
  )
}
