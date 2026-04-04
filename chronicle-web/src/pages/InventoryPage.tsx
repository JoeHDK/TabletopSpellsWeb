import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '../api/inventory'
import { charactersApi } from '../api/characters'
import { itemsApi } from '../api/items'
import { customItemsApi } from '../api/customItems'
import { useAuthStore } from '../store/authStore'
import CustomItemFormModal from '../components/CustomItemFormModal'
import type {
  InventoryItem, InventorySlot, ItemSource, ArmorType, AddInventoryItemRequest, EquipItemRequest,
  Item, CustomItem, SaveCustomItemRequest,
} from '../types'
import { SLOTS, ARMOR_TYPES, ARMOR_TYPE_LABEL } from '../constants/inventory'
import { RARITIES } from '../constants/rarities'
import { lookupArmor } from '../utils/armorTable'
import { lookupProtection } from '../utils/protectionTable'
import {
  InventoryItemCard,
  InventoryItemModal,
  ItemDetailModal,
  EquippedTab,
  SlotPickerModal,
  rarityColor,
} from '../components/inventory'

function guessArmorType(name: string): ArmorType {
  return lookupArmor(name)?.type ?? 'None'
}

function customItemToItem(ci: CustomItem): Item {
  return {
    index: ci.id, name: ci.name, item_type: ci.item_type,
    category: ci.category ?? '', rarity: ci.rarity ?? '',
    description: ci.description ?? '', requires_attunement: ci.requires_attunement,
    attunement_note: ci.attunement_note, cost: ci.cost, weight: ci.weight,
    damage: ci.damage, properties: ci.properties, source: 'Custom',
  }
}

const defaultForm = (): AddInventoryItemRequest & { acBonusStr: string; slot: InventorySlot } => ({
  itemSource: 'SRD',
  name: '',
  quantity: 1,
  acBonusStr: '',
  slot: 'Accessory',
  armorType: undefined,
  isTwoHanded: false,
})

export default function InventoryPage({ embedded }: { embedded?: boolean } = {}) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isDm = useAuthStore((s) => s.isDm)

  // Page tabs
  const [mainTab, setMainTab] = useState<'inventory' | 'equipped' | 'browse'>('inventory')

  // Inventory state
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(defaultForm())
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [sendCharId, setSendCharId] = useState('')
  const [sendError, setSendError] = useState('')
  const [invSearch, setInvSearch] = useState('')
  const [selectedInvItem, setSelectedInvItem] = useState<InventoryItem | null>(null)
  const [selectingSlot, setSelectingSlot] = useState<InventorySlot | null>(null)

  // Browse state
  const [browseSearch, setBrowseSearch] = useState('')
  const [rarityFilter, setRarityFilter] = useState<string | undefined>()
  const [typeFilter, setTypeFilter] = useState<string | undefined>()
  const [isCustomTab, setIsCustomTab] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [addingItem, setAddingItem] = useState<Item | null>(null)
  const [addQty, setAddQty] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CustomItem | undefined>()

  // Queries
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

  const { data: allItems = [], isLoading: srdLoading } = useQuery({
    queryKey: ['items'],
    queryFn: () => itemsApi.getAll(),
    enabled: mainTab === 'browse',
  })

  const { data: customItems = [], isLoading: customLoading } = useQuery({
    queryKey: ['custom-items'],
    queryFn: () => customItemsApi.getAll(),
    enabled: mainTab === 'browse' && isCustomTab,
  })

  // Derived
  const equippedItems = items.filter(i => i.isEquipped)
  // Check both new 'Chest' slot and legacy 'Armor' slot — also accept items where lookupArmor matches (legacy items without armorType set in DB)
  const armorItem = equippedItems.find(i =>
    (i.equippedSlot === 'Chest' || i.equippedSlot === 'Armor') &&
    ((i.armorType && i.armorType !== 'None') || lookupArmor(i.name) !== undefined)
  )
  const shieldBonus = equippedItems
    .filter(i => i.equippedSlot !== 'Armor' && i.equippedSlot !== 'Chest' && i.acBonus != null)
    .reduce((s, i) => s + (i.acBonus ?? 0), 0)
  const dexMod = character?.abilityScores ? Math.floor(((character.abilityScores['Dexterity'] ?? 10) - 10) / 2) : 0
  const displayAC = (() => {
    if (!armorItem) {
      return (character?.baseArmorClass ?? 0) + equippedItems.filter(i => i.acBonus != null).reduce((s, i) => s + (i.acBonus ?? 0), 0) + dexMod
    }
    const armorLookup = lookupArmor(armorItem.name)
    const resolvedType = (armorItem.armorType && armorItem.armorType !== 'None') ? armorItem.armorType : armorLookup?.type
    const base = armorItem.acBonus ?? armorLookup?.ac ?? 0
    const dexContrib = resolvedType === 'Light' ? dexMod : resolvedType === 'Medium' ? Math.min(dexMod, 2) : 0
    return base + dexContrib + shieldBonus + (character?.baseArmorClass ?? 0)
  })()

  const filteredItems = useMemo(() => {
    if (!invSearch.trim()) return items
    return items.filter(i => i.name.toLowerCase().includes(invSearch.toLowerCase()))
  }, [items, invSearch])

  const equippedBySlot = useMemo(() =>
    Object.fromEntries(
      SLOTS.map(s => [s, items.filter(i => i.isEquipped && i.equippedSlot === s)])
    ) as Record<InventorySlot, InventoryItem[]>,
    [items]
  )

  const filteredSrd = useMemo(() => allItems.filter(item => {
    if (browseSearch && !item.name.toLowerCase().includes(browseSearch.toLowerCase())) return false
    if (rarityFilter && item.rarity !== rarityFilter) return false
    if (typeFilter && item.item_type !== typeFilter) return false
    return true
  }), [allItems, browseSearch, rarityFilter, typeFilter])

  const filteredCustom = useMemo(() => {
    if (!browseSearch) return customItems
    return customItems.filter(i => i.name.toLowerCase().includes(browseSearch.toLowerCase()))
  }, [customItems, browseSearch])

  // Mutations — inventory
  const addMutation = useMutation({
    mutationFn: (req: AddInventoryItemRequest) => inventoryApi.add(id!, req),
    onSuccess: (newItem) => {
      qc.setQueryData<InventoryItem[]>(['inventory', id], old => [...(old ?? []), newItem])
      qc.invalidateQueries({ queryKey: ['inventory', id] })
      setShowAdd(false)
      setForm(defaultForm())
      setAddingItem(null)
    },
  })

  const equipMutation = useMutation({
    mutationFn: ({ itemId, req }: { itemId: string; req: EquipItemRequest }) =>
      inventoryApi.equip(id!, itemId, req),
    onSuccess: (updatedItem) => {
      qc.setQueryData<InventoryItem[]>(['inventory', id], old =>
        old?.map(i => i.id === updatedItem.id ? updatedItem : i) ?? []
      )
      qc.invalidateQueries({ queryKey: ['inventory', id] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => inventoryApi.remove(id!, itemId),
    onSuccess: (_void, itemId) => {
      qc.setQueryData<InventoryItem[]>(['inventory', id], old =>
        old?.filter(i => i.id !== itemId) ?? []
      )
      qc.invalidateQueries({ queryKey: ['inventory', id] })
    },
  })

  const sendMutation = useMutation({
    mutationFn: ({ itemId, recipientCharacterId }: { itemId: string; recipientCharacterId: string }) =>
      inventoryApi.send(id!, itemId, { recipientCharacterId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', id] })
      setSendingId(null); setSendCharId(''); setSendError('')
    },
    onError: () => setSendError('Failed to send item. Check the recipient character ID.'),
  })

  // Mutations — custom items
  const createCustomMutation = useMutation({
    mutationFn: (data: SaveCustomItemRequest) => customItemsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['custom-items'] }); setFormOpen(false) },
  })
  const updateCustomMutation = useMutation({
    mutationFn: ({ id: cid, data }: { id: string; data: SaveCustomItemRequest }) => customItemsApi.update(cid, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['custom-items'] }); setFormOpen(false); setEditingItem(undefined) },
  })
  const deleteCustomMutation = useMutation({
    mutationFn: (cid: string) => customItemsApi.delete(cid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-items'] }),
  })

  const handleAdd = () => {
    if (!form.name) return
    addMutation.mutate({
      itemSource: form.itemSource,
      srdItemIndex: form.itemSource === 'SRD' ? form.srdItemIndex : undefined,
      name: form.name,
      quantity: form.quantity,
      acBonus: form.acBonusStr ? Number(form.acBonusStr) : undefined,
      armorType: form.acBonusStr ? (form.armorType ?? guessArmorType(form.name)) : undefined,
      damageOverride: form.damageOverride,
      notes: form.notes,
    })
  }

  const handleAddFromBrowse = (item: Item, isCustom: boolean) => {
    // Prefer explicit acBonus/armorType from JSON; fall back to ARMOR_TABLE lookup for custom items
    const armorEntry = (item.acBonus != null && item.armorType) ? null : lookupArmor(item.name)
    const resolvedAcBonus = item.acBonus ?? armorEntry?.ac
    const resolvedArmorType = item.armorType ?? armorEntry?.type
    const protEntry = lookupProtection(item.name)
    addMutation.mutate({
      itemSource: isCustom ? 'Custom' : 'SRD',
      srdItemIndex: !isCustom ? item.index : undefined,
      customItemId: isCustom ? item.index : undefined,
      name: item.name,
      quantity: addQty,
      damageOverride: item.damage ?? undefined,
      acBonus: resolvedAcBonus ?? protEntry?.acBonus,
      armorType: resolvedArmorType as import('../types').ArmorType | undefined,
      savingThrowBonus: protEntry?.savingThrowBonus,
    })
  }

  if (isLoading) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Loading…</div>

  return (
    <div className={embedded ? 'bg-gray-950 text-white flex flex-col' : 'min-h-screen bg-gray-950 text-white flex flex-col'}>
      {!embedded && (
        <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/characters/${id}`)} className="text-gray-400 hover:text-white">←</button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">{character?.name ?? '…'} — Inventory</h1>
            <p className="text-xs text-gray-400">
              AC: {character ? displayAC : '—'}
            </p>
          </div>
          {mainTab === 'inventory' && isDm && (
            <button
              onClick={() => setShowAdd(v => !v)}
              className="text-sm bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg transition-colors"
            >
              {showAdd ? 'Cancel' : '+ Add'}
            </button>
          )}
          {mainTab === 'browse' && isCustomTab && isDm && (
            <button
              onClick={() => { setEditingItem(undefined); setFormOpen(true) }}
              className="text-sm bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg transition-colors"
            >
              + New
            </button>
          )}
        </header>
      )}

      {/* Main tab bar */}
      <div className="flex gap-1 px-4 pt-3 pb-0">
        {([
          { id: 'inventory', label: '🎒 Inventory' },
          { id: 'equipped', label: '⚔️ Equipped' },
          { id: 'browse', label: '🔍 Browse' },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setMainTab(id)}
            className={`px-4 py-1.5 rounded-t-lg text-sm font-medium transition-colors ${
              mainTab === id ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ────────────── INVENTORY TAB ────────────── */}
      {mainTab === 'inventory' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-2xl mx-auto space-y-3">

            {/* inventory list */}
            <div className="space-y-3">
              {showAdd && isDm && (
                <div className="bg-gray-900 rounded-xl p-4 space-y-3">
                  <h2 className="font-semibold text-sm">Add Item Manually</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Name *</label>
                      <input
                        className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                        value={form.name}
                        onChange={e => {
                          const name = e.target.value
                          const armorEntry = lookupArmor(name)
                          setForm(f => ({
                            ...f,
                            name,
                            // Auto-fill AC and armor type from lookup table if not already set manually
                            acBonusStr: f.acBonusStr || (armorEntry ? String(armorEntry.ac) : ''),
                            armorType: f.armorType ?? armorEntry?.type,
                          }))
                        }}
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
                      <input type="number" min={1}
                        className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                        value={form.quantity}
                        onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">AC Bonus</label>
                      <input type="number"
                        className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                        placeholder="Leave blank if none"
                        value={form.acBonusStr}
                        onChange={e => setForm(f => ({
                          ...f,
                          acBonusStr: e.target.value,
                          armorType: f.armorType ?? (e.target.value ? guessArmorType(f.name) : undefined),
                        }))}
                      />
                    </div>
                    {(form.acBonusStr || form.armorType) && (
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Armor Type</label>
                        <select
                          className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:outline-none text-sm"
                          value={form.armorType ?? 'None'}
                          onChange={e => setForm(f => ({ ...f, armorType: e.target.value as ArmorType }))}
                        >
                          {ARMOR_TYPES.map(t => (
                            <option key={t} value={t}>{ARMOR_TYPE_LABEL[t]}</option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-1">Used for automatic AC calculation (DEX cap).</p>
                      </div>
                    )}
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

              <input
                value={invSearch}
                onChange={e => setInvSearch(e.target.value)}
                placeholder="Search inventory…"
                className="w-full bg-gray-900 text-white rounded-lg px-3 py-2 border border-gray-800 focus:border-indigo-500 focus:outline-none text-sm"
              />

              {filteredItems.length === 0 ? (
                <p className="text-gray-400 text-center py-10">
                  {items.length === 0 ? 'No items yet. Use Browse to add some!' : 'No items match your search.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredItems.map(item => (
                    <InventoryItemCard
                      key={item.id}
                      item={item}
                      sendingId={sendingId}
                      sendCharId={sendCharId}
                      sendError={sendError}
                      isSendPending={sendMutation.isPending}
                      hasGameRoom={!!character?.gameRoomId}
                      onSelect={setSelectedInvItem}
                      onEquip={(itemId, req) => equipMutation.mutate({ itemId, req })}
                      onDelete={itemId => removeMutation.mutate(itemId)}
                      onSendStart={itemId => { setSendingId(itemId); setSendCharId(''); setSendError('') }}
                      onSendCharIdChange={setSendCharId}
                      onSendConfirm={(itemId, recipientCharacterId) => sendMutation.mutate({ itemId, recipientCharacterId })}
                      onSendCancel={() => { setSendingId(null); setSendError('') }}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ────────────── EQUIPPED TAB ────────────── */}
      {mainTab === 'equipped' && (
        <EquippedTab
          items={items}
          equippedBySlot={equippedBySlot}
          onSelectItem={setSelectedInvItem}
          onEquip={(itemId, req) => equipMutation.mutate({ itemId, req })}
          onEquipSlotClick={setSelectingSlot}
        />
      )}

      {/* Slot picker modal */}
      {selectingSlot && (
        <SlotPickerModal
          slot={selectingSlot}
          items={items}
          onClose={() => setSelectingSlot(null)}
          onEquip={(itemId, req) => {
            equipMutation.mutate({ itemId, req })
            setSelectingSlot(null)
          }}
        />
      )}

      {/* ────────────── BROWSE TAB ────────────── */}
      {mainTab === 'browse' && (
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-4 space-y-3">
            <input
              value={browseSearch}
              onChange={e => setBrowseSearch(e.target.value)}
              placeholder={isCustomTab ? 'Search custom items…' : 'Search items…'}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none"
            />

            {/* Browse sub-tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { label: 'All', type: undefined, custom: false },
                { label: '✨ Magic', type: 'magic', custom: false },
                { label: '🗡 Equipment', type: 'equipment', custom: false },
                { label: '⚒ Custom', type: undefined, custom: true },
              ].map(({ label, type, custom }) => {
                const active = custom ? isCustomTab : !isCustomTab && typeFilter === type
                return (
                  <button
                    key={label}
                    onClick={() => { setIsCustomTab(custom); if (!custom) setTypeFilter(type) }}
                    className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                      active ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            {/* Rarity filter (SRD only) */}
            {!isCustomTab && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {[undefined, ...RARITIES].map(r => (
                  <button
                    key={r ?? 'all-rarity'}
                    onClick={() => setRarityFilter(r)}
                    className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                      rarityFilter === r ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {r ?? 'Any Rarity'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* SRD list */}
          {!isCustomTab && (
            <div className="flex-1 px-4 pb-4 space-y-2">
              {srdLoading ? (
                <div className="text-center text-gray-400 py-12">Loading items…</div>
              ) : filteredSrd.length === 0 ? (
                <div className="text-center text-gray-400 py-12">No items found</div>
              ) : filteredSrd.map(item => (
                <div key={item.index} className="bg-gray-900 rounded-xl px-4 py-3">
                  {addingItem?.index === item.index ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium flex-1">{item.name}</span>
                      <input
                        type="number" min={1}
                        value={addQty}
                        onChange={e => setAddQty(Number(e.target.value))}
                        className="w-16 bg-gray-800 text-white rounded-lg px-2 py-1 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                      />
                      <button
                        disabled={addMutation.isPending}
                        onClick={() => handleAddFromBrowse(item, false)}
                        className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-3 py-1.5 rounded-lg"
                      >
                        {addMutation.isPending ? '…' : 'Add'}
                      </button>
                      <button onClick={() => setAddingItem(null)} className="text-gray-400 hover:text-white text-xs px-2 py-1.5">✕</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button className="flex-1 text-left" onClick={() => setSelectedItem(item)}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.name}</span>
                          {item.requires_attunement && <span className="text-xs text-amber-400">◈</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-indigo-400">{item.category}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${rarityColor(item.rarity)}`}>{item.rarity}</span>
                          {item.damage && <span className="text-xs text-gray-400">{item.damage}</span>}
                          {item.acBonus != null && <span className="text-xs text-green-400">AC {item.acBonus}{item.armorType === 'Shield' ? ' bonus' : ''}</span>}
                          {item.armorType && item.armorType !== 'Shield' && <span className="text-xs text-yellow-500">{item.armorType}</span>}
                        </div>
                      </button>
                      <button
                        onClick={() => { setAddingItem(item); setAddQty(1) }}
                        className="text-xs bg-gray-800 hover:bg-indigo-700 text-gray-300 hover:text-white px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
                      >
                        + Add
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Custom items list */}
          {isCustomTab && (
            <div className="flex-1 px-4 pb-4 space-y-2">
              {customLoading ? (
                <div className="text-center text-gray-400 py-12">Loading…</div>
              ) : filteredCustom.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                  {customItems.length === 0
                    ? <span>No custom items yet.{isDm && <><br /><span className="text-indigo-400">Tap + New to create one.</span></>}</span>
                    : 'No items match your search'}
                </div>
              ) : filteredCustom.map(item => {
                const asItem = customItemToItem(item)
                return (
                  <div key={item.id} className="bg-gray-900 rounded-xl px-4 py-3">
                    {addingItem?.index === item.id ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium flex-1">{item.name}</span>
                        <input
                          type="number" min={1}
                          value={addQty}
                          onChange={e => setAddQty(Number(e.target.value))}
                          className="w-16 bg-gray-800 text-white rounded-lg px-2 py-1 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                        />
                        <button
                          disabled={addMutation.isPending}
                          onClick={() => handleAddFromBrowse(asItem, true)}
                          className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-3 py-1.5 rounded-lg"
                        >
                          {addMutation.isPending ? '…' : 'Add'}
                        </button>
                        <button onClick={() => setAddingItem(null)} className="text-gray-400 hover:text-white text-xs px-2 py-1.5">✕</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button className="flex-1 text-left" onClick={() => setSelectedItem(asItem)}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.name}</span>
                            {item.requires_attunement && <span className="text-xs text-amber-400">◈</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.category && <span className="text-xs text-indigo-400">{item.category}</span>}
                            {item.rarity && <span className={`text-xs px-1.5 py-0.5 rounded-full ${rarityColor(item.rarity)}`}>{item.rarity}</span>}
                            {item.damage && <span className="text-xs text-gray-400">{item.damage}</span>}
                            {item.ac_bonus != null && <span className="text-xs text-green-400">AC {item.ac_bonus}</span>}
                          </div>
                        </button>
                        <button
                          onClick={() => { setAddingItem(asItem); setAddQty(1) }}
                          className="text-xs bg-gray-800 hover:bg-indigo-700 text-gray-300 hover:text-white px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
                        >
                          + Add
                        </button>
                        {isDm && (
                          <>
                            <button
                              onClick={() => { setEditingItem(item); setFormOpen(true) }}
                              className="text-gray-400 hover:text-white px-2 py-1 text-sm transition-colors"
                            >
                              ✏
                            </button>
                            <button
                              onClick={() => { if (confirm(`Delete "${item.name}"?`)) deleteCustomMutation.mutate(item.id) }}
                              className="text-gray-400 hover:text-red-400 px-2 py-1 text-sm transition-colors"
                            >
                              🗑
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {selectedInvItem && <InventoryItemModal item={selectedInvItem} onClose={() => setSelectedInvItem(null)} />}
      {selectedItem && <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />}

      {formOpen && (
        <CustomItemFormModal
          item={editingItem}
          onSave={data => {
            if (editingItem) updateCustomMutation.mutate({ id: editingItem.id, data })
            else createCustomMutation.mutate(data)
          }}
          onClose={() => { setFormOpen(false); setEditingItem(undefined) }}
          isSaving={createCustomMutation.isPending || updateCustomMutation.isPending}
        />
      )}
    </div>
  )
}


