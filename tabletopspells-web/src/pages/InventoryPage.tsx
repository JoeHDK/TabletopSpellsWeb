import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '../api/inventory'
import { charactersApi } from '../api/characters'
import type { InventoryItem, InventorySlot, ItemSource, AddInventoryItemRequest, EquipItemRequest } from '../types'

const SLOTS: InventorySlot[] = ['Armor', 'Weapon', 'Offhand', 'Accessory']

const defaultForm = (): AddInventoryItemRequest & { acBonusStr: string; slot: InventorySlot } => ({
  itemSource: 'SRD',
  name: '',
  quantity: 1,
  acBonusStr: '',
  slot: 'Accessory',
})

export default function InventoryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(defaultForm())
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [sendCharId, setSendCharId] = useState('')
  const [sendError, setSendError] = useState('')

  const { data: character } = useQuery({
    queryKey: ['character', id],
    queryFn: () => charactersApi.get(id!),
    enabled: !!id,
  })

  const { data: items = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ['inventory', id],
    queryFn: () => inventoryApi.getAll(id!),
    enabled: !!id,
  })

  const equipmentAcBonus = items
    .filter(i => i.isEquipped && i.acBonus != null)
    .reduce((sum, i) => sum + (i.acBonus ?? 0), 0)

  const addMutation = useMutation({
    mutationFn: (req: AddInventoryItemRequest) => inventoryApi.add(id!, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', id] })
      setShowAdd(false)
      setForm(defaultForm())
    },
  })

  const equipMutation = useMutation({
    mutationFn: ({ itemId, req }: { itemId: string; req: EquipItemRequest }) =>
      inventoryApi.equip(id!, itemId, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory', id] }),
  })

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => inventoryApi.remove(id!, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory', id] }),
  })

  const sendMutation = useMutation({
    mutationFn: ({ itemId, recipientCharacterId }: { itemId: string; recipientCharacterId: string }) =>
      inventoryApi.send(id!, itemId, { recipientCharacterId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', id] })
      setSendingId(null)
      setSendCharId('')
      setSendError('')
    },
    onError: () => setSendError('Failed to send item. Check the recipient character ID.'),
  })

  const handleAdd = () => {
    if (!form.name) return
    addMutation.mutate({
      itemSource: form.itemSource,
      srdItemIndex: form.itemSource === 'SRD' ? form.srdItemIndex : undefined,
      name: form.name,
      quantity: form.quantity,
      acBonus: form.acBonusStr ? Number(form.acBonusStr) : undefined,
      damageOverride: form.damageOverride,
      notes: form.notes,
    })
  }

  if (isLoading) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Loading…</div>

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(`/characters/${id}`)} className="text-gray-400 hover:text-white">←</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">{character?.name ?? '…'} — Inventory</h1>
          <p className="text-xs text-gray-400">
            AC: {equipmentAcBonus > 0
              ? <>{character?.baseArmorClass} <span className="text-indigo-400">+ {equipmentAcBonus}</span></>
              : character?.baseArmorClass ?? '—'}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="text-sm bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg transition-colors"
        >
          {showAdd ? 'Cancel' : '+ Add'}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 max-w-3xl mx-auto w-full space-y-4">
        {showAdd && (
          <div className="bg-gray-900 rounded-xl p-4 space-y-3">
            <h2 className="font-semibold">Add Item</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Name *</label>
                <input
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Source</label>
                <select
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:outline-none text-sm"
                  value={form.itemSource}
                  onChange={e => setForm(f => ({ ...f, itemSource: e.target.value as ItemSource }))}
                >
                  <option value="SRD">SRD Item</option>
                  <option value="Custom">Custom Item</option>
                </select>
              </div>
              {form.itemSource === 'SRD' && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">SRD Index</label>
                  <input
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                    placeholder="e.g. chain-mail"
                    value={form.srdItemIndex ?? ''}
                    onChange={e => setForm(f => ({ ...f, srdItemIndex: e.target.value }))}
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Quantity</label>
                <input
                  type="number" min={1}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">AC Bonus</label>
                <input
                  type="number"
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                  placeholder="Leave blank if none"
                  value={form.acBonusStr}
                  onChange={e => setForm(f => ({ ...f, acBonusStr: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Damage</label>
                <input
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                  placeholder="e.g. 1d8+3 slashing"
                  value={form.damageOverride ?? ''}
                  onChange={e => setForm(f => ({ ...f, damageOverride: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400 block mb-1">Notes</label>
                <input
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                  value={form.notes ?? ''}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            {addMutation.isError && <p className="text-red-400 text-sm">Failed to add item.</p>}
            <button
              onClick={handleAdd}
              disabled={addMutation.isPending || !form.name}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm"
            >
              Add Item
            </button>
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-gray-500 text-center py-10">No items in inventory yet.</p>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div
                key={item.id}
                className={`bg-gray-900 rounded-xl px-4 py-3 space-y-2 ${item.isEquipped ? 'ring-1 ring-indigo-600/50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{item.name}</span>
                      {item.quantity > 1 && <span className="text-xs text-gray-400">×{item.quantity}</span>}
                      {item.isEquipped && (
                        <span className="text-xs bg-indigo-900/50 text-indigo-300 px-1.5 py-0.5 rounded-full">
                          {item.equippedSlot}
                        </span>
                      )}
                      {item.acBonus != null && (
                        <span className="text-xs bg-green-900/40 text-green-400 px-1.5 py-0.5 rounded-full">
                          AC +{item.acBonus}
                        </span>
                      )}
                      {item.damageOverride && (
                        <span className="text-xs bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded-full">
                          {item.damageOverride}
                        </span>
                      )}
                    </div>
                    {item.notes && <p className="text-xs text-gray-500 mt-0.5">{item.notes}</p>}
                    {item.grantedByUsername && (
                      <p className="text-xs text-gray-600 mt-0.5">From @{item.grantedByUsername}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {/* Equip toggle */}
                    <button
                      onClick={() => equipMutation.mutate({
                        itemId: item.id,
                        req: { isEquipped: !item.isEquipped, slot: item.equippedSlot ?? 'Accessory' },
                      })}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        item.isEquipped
                          ? 'bg-indigo-800 hover:bg-indigo-700 text-indigo-200'
                          : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
                      }`}
                    >
                      {item.isEquipped ? 'Unequip' : 'Equip'}
                    </button>
                    {/* Send button — only if character is in a game */}
                    {character?.gameRoomId && (
                      <button
                        onClick={() => { setSendingId(item.id); setSendCharId(''); setSendError('') }}
                        className="text-xs bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-gray-400 transition-colors"
                      >
                        ↗ Send
                      </button>
                    )}
                    <button
                      onClick={() => removeMutation.mutate(item.id)}
                      className="text-xs bg-gray-800 hover:bg-red-900/50 hover:text-red-400 px-2 py-1 rounded text-gray-500 transition-colors"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                {/* Slot picker when equipped */}
                {item.isEquipped && (
                  <div className="flex gap-1.5 flex-wrap">
                    {SLOTS.map(s => (
                      <button
                        key={s}
                        onClick={() => equipMutation.mutate({ itemId: item.id, req: { isEquipped: true, slot: s } })}
                        className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                          item.equippedSlot === s
                            ? 'bg-indigo-700 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Send panel */}
                {sendingId === item.id && (
                  <div className="flex gap-2 mt-1">
                    <input
                      className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-1.5 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                      placeholder="Recipient character ID"
                      value={sendCharId}
                      onChange={e => setSendCharId(e.target.value)}
                    />
                    <button
                      disabled={sendMutation.isPending || !sendCharId.trim()}
                      onClick={() => sendMutation.mutate({ itemId: item.id, recipientCharacterId: sendCharId.trim() })}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-3 py-1.5 rounded-lg text-sm"
                    >
                      Send
                    </button>
                    <button
                      onClick={() => { setSendingId(null); setSendError('') }}
                      className="text-gray-400 hover:text-white px-2 py-1.5 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {sendingId === item.id && sendError && <p className="text-red-400 text-xs">{sendError}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
