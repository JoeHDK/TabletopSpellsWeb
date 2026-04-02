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

const SLOTS: InventorySlot[] = [
  'Head', 'Chest', 'Legs', 'Hands', 'Feet',
  'MainHand', 'OffHand', 'Neck', 'Ring1', 'Ring2', 'Back',
  // Legacy slots kept for backwards-compat items
  'Armor', 'Weapon', 'Offhand', 'Accessory',
]

const EQUIPPED_PANEL_SLOTS: InventorySlot[] = [
  'Head', 'Chest', 'Legs', 'Hands', 'Feet',
  'MainHand', 'OffHand', 'Neck', 'Ring1', 'Ring2', 'Back',
]
const RARITIES = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact', 'Varies']
const ARMOR_TYPES: ArmorType[] = ['None', 'Light', 'Medium', 'Heavy']

const ARMOR_TYPE_LABEL: Record<ArmorType, string> = {
  None: 'Unarmored / Clothing',
  Light: 'Light Armor',
  Medium: 'Medium Armor',
  Heavy: 'Heavy Armor',
}

const SLOT_ICON: Record<InventorySlot, string> = {
  Head: '🪖',
  Chest: '🥋',
  Legs: '👖',
  Hands: '🧤',
  Feet: '👟',
  MainHand: '⚔️',
  OffHand: '🗡',
  Neck: '📿',
  Ring1: '💍',
  Ring2: '💍',
  Back: '🧣',
  // Legacy
  Armor: '🛡',
  Weapon: '⚔️',
  Offhand: '🗡',
  Accessory: '✨',
}

const SLOT_LABEL: Record<InventorySlot, string> = {
  Head: 'Head',
  Chest: 'Chest',
  Legs: 'Legs',
  Hands: 'Hands',
  Feet: 'Feet',
  MainHand: 'Main Hand',
  OffHand: 'Off-Hand',
  Neck: 'Neck',
  Ring1: 'Ring 1',
  Ring2: 'Ring 2',
  Back: 'Back',
  // Legacy
  Armor: 'Armor',
  Weapon: 'Main Hand',
  Offhand: 'Offhand',
  Accessory: 'Accessory',
}

function guessSlot(item: InventoryItem): InventorySlot {
  if (item.equippedSlot) return item.equippedSlot
  if (item.acBonus != null) return 'Chest'
  if (item.damageOverride) return 'MainHand'
  const name = item.name.toLowerCase()
  if (/helmet|helm|hat|hood|crown|cap/.test(name)) return 'Head'
  if (/armor|mail|plate|breastplate|hide|leather|studded|splint|scale|robe|coat/.test(name)) return 'Chest'
  if (/boots|shoes|greaves|sabatons|slippers/.test(name)) return 'Feet'
  if (/gauntlet|gloves|bracers|vambraces/.test(name)) return 'Hands'
  if (/leggings|breeches|trousers|pants/.test(name)) return 'Legs'
  if (/shield/.test(name)) return 'OffHand'
  if (/sword|axe|bow|dagger|hammer|mace|spear|staff|wand|flail|scimitar|rapier|lance|pike|halberd|glaive|crossbow|sling|trident|whip|quarterstaff|shortsword|longsword|greatsword|handaxe|battleaxe|greataxe/.test(name)) return 'MainHand'
  if (/necklace|amulet|pendant|collar/.test(name)) return 'Neck'
  if (/ring/.test(name)) return 'Ring1'
  if (/cloak|cape|mantle|shroud/.test(name)) return 'Back'
  return 'Accessory'
}

import { lookupArmor } from '../utils/armorTable'
import { lookupProtection } from '../utils/protectionTable'

function guessArmorType(name: string): ArmorType {
  return lookupArmor(name)?.type ?? 'None'
}

function InventoryItemModal({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl w-full max-w-md p-5 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-bold">{item.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {item.quantity > 1 && (
            <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">×{item.quantity}</span>
          )}
          {item.isEquipped && item.equippedSlot && (
            <span className="px-2 py-0.5 rounded-full bg-indigo-900/50 text-indigo-300">
              {SLOT_ICON[item.equippedSlot]} {SLOT_LABEL[item.equippedSlot]}
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">{item.itemSource}</span>
        </div>
        <div className="space-y-2 text-sm">
          {item.acBonus != null && (
            <div className="flex justify-between">
              <span className="text-gray-400">{(item.armorType && item.armorType !== 'None') || lookupArmor(item.name) ? 'Base AC' : 'AC Bonus'}</span>
              <span className="text-green-400 font-medium">{(item.armorType && item.armorType !== 'None') || lookupArmor(item.name) ? item.acBonus : `+${item.acBonus}`}</span>
            </div>
          )}
          {item.savingThrowBonus != null && item.savingThrowBonus !== 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">Saving Throw Bonus</span>
              <span className="text-blue-400 font-medium">{item.savingThrowBonus > 0 ? `+${item.savingThrowBonus}` : item.savingThrowBonus} to all saves</span>
            </div>
          )}
          {item.armorType && item.armorType !== 'None' && (
            <div className="flex justify-between">
              <span className="text-gray-400">Armor Type</span>
              <span className="text-yellow-400 font-medium">{ARMOR_TYPE_LABEL[item.armorType]}</span>
            </div>
          )}
          {item.damageOverride && (
            <div className="flex justify-between">
              <span className="text-gray-400">Damage</span>
              <span className="text-red-400 font-medium">{item.damageOverride}</span>
            </div>
          )}
          {item.notes && (
            <div className="border-t border-gray-800 pt-2">
              <p className="text-gray-400 text-xs mb-1">Notes</p>
              <p className="text-gray-300">{item.notes}</p>
            </div>
          )}
          {item.grantedByUsername && (
            <p className="text-gray-500 text-xs">From @{item.grantedByUsername}</p>
          )}
        </div>
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

function customItemToItem(ci: CustomItem): Item {
  return {
    index: ci.id, name: ci.name, item_type: ci.item_type,
    category: ci.category ?? '', rarity: ci.rarity ?? '',
    description: ci.description ?? '', requires_attunement: ci.requires_attunement,
    attunement_note: ci.attunement_note, cost: ci.cost, weight: ci.weight,
    damage: ci.damage, properties: ci.properties, source: 'Custom',
  }
}

function ItemDetailModal({ item, onClose }: { item: Item; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-5 space-y-3" onClick={e => e.stopPropagation()}>
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
          {item.acBonus != null && (
            <span className="px-2 py-0.5 rounded-full bg-green-900/50 text-green-300">
              🛡 AC {item.acBonus}{item.armorType === 'Shield' ? ' bonus' : ''}
            </span>
          )}
          {item.armorType && item.armorType !== 'Shield' && (
            <span className="px-2 py-0.5 rounded-full bg-yellow-900/50 text-yellow-300">{item.armorType} Armor</span>
          )}
          {item.cost && <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">💰 {item.cost}</span>}
          {item.weight != null && <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">⚖ {item.weight} lb</span>}
        </div>
        {item.properties.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.properties.map(p => (
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
    },
  })

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => inventoryApi.remove(id!, itemId),
    onSuccess: (_void, itemId) => {
      qc.setQueryData<InventoryItem[]>(['inventory', id], old =>
        old?.filter(i => i.id !== itemId) ?? []
      )
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
                    <div
                      key={item.id}
                      className={`bg-gray-900 rounded-xl px-4 py-3 space-y-2 ${item.isEquipped ? 'ring-1 ring-indigo-600/50' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              className="font-medium hover:text-indigo-300 transition-colors text-left"
                              onClick={() => setSelectedInvItem(item)}
                            >
                              {item.name}
                            </button>
                            {item.quantity > 1 && <span className="text-xs text-gray-400">×{item.quantity}</span>}
                            {item.isEquipped && item.equippedSlot && (
                              <span className="text-xs bg-indigo-900/50 text-indigo-300 px-1.5 py-0.5 rounded-full">
                                {SLOT_ICON[item.equippedSlot]} {SLOT_LABEL[item.equippedSlot]}
                              </span>
                            )}
                            {item.acBonus != null && (
                              <span className="text-xs bg-green-900/40 text-green-400 px-1.5 py-0.5 rounded-full">
                                AC +{item.acBonus}
                              </span>
                            )}
                            {item.armorType && item.armorType !== 'None' && (
                              <span className="text-xs bg-yellow-900/40 text-yellow-400 px-1.5 py-0.5 rounded-full">
                                {item.armorType}
                              </span>
                            )}
                            {item.damageOverride && (
                              <span className="text-xs bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded-full">
                                {item.damageOverride}
                              </span>
                            )}
                          </div>
                          {item.notes && <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>}
                          {item.grantedByUsername && (
                            <p className="text-xs text-gray-600 mt-0.5">From @{item.grantedByUsername}</p>
                          )}
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => equipMutation.mutate({
                              itemId: item.id,
                              req: { isEquipped: !item.isEquipped, slot: guessSlot(item) },
                            })}
                            className={`text-xs px-2 py-1 rounded transition-colors ${
                              item.isEquipped
                                ? 'bg-indigo-800 hover:bg-indigo-700 text-indigo-200'
                                : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
                            }`}
                          >
                            {item.isEquipped ? 'Unequip' : 'Equip'}
                          </button>
                          {character?.gameRoomId && (
                            <button
                              onClick={() => { setSendingId(item.id); setSendCharId(''); setSendError('') }}
                              className="text-xs bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-gray-400 transition-colors"
                            >
                              ↗
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

                      {item.isEquipped && (
                        <div className="flex gap-1.5 flex-wrap">
                          {EQUIPPED_PANEL_SLOTS.map(s => (
                            <button
                              key={s}
                              onClick={() => equipMutation.mutate({ itemId: item.id, req: { isEquipped: true, slot: s, armorType: item.armorType } })}
                              className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                                item.equippedSlot === s
                                  ? 'bg-indigo-700 text-white'
                                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                              }`}
                            >
                              {SLOT_LABEL[s]}
                            </button>
                          ))}
                          {(item.equippedSlot === 'Chest' || item.equippedSlot === 'Armor') && (
                            <>
                              <span className="text-xs text-gray-400 self-center">|</span>
                              {ARMOR_TYPES.map(t => (
                                <button
                                  key={t}
                                  onClick={() => equipMutation.mutate({ itemId: item.id, req: { isEquipped: true, slot: item.equippedSlot ?? 'Chest', armorType: t } })}
                                  className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                                    item.armorType === t
                                      ? 'bg-yellow-700 text-white'
                                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                  }`}
                                >
                                  {t}
                                </button>
                              ))}
                            </>
                          )}
                          {item.equippedSlot === 'MainHand' && (
                            <>
                              <span className="text-xs text-gray-400 self-center">|</span>
                              <button
                                onClick={() => equipMutation.mutate({ itemId: item.id, req: { isEquipped: true, slot: 'MainHand', isTwoHanded: !item.isTwoHanded } })}
                                className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                                  item.isTwoHanded ? 'bg-yellow-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                              >
                                2-Handed
                              </button>
                            </>
                          )}
                        </div>
                      )}

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
                          <button onClick={() => { setSendingId(null); setSendError('') }} className="text-gray-400 hover:text-white px-2 py-1.5 text-sm">✕</button>
                        </div>
                      )}
                      {sendingId === item.id && sendError && <p className="text-red-400 text-xs">{sendError}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ────────────── EQUIPPED TAB ────────────── */}
      {mainTab === 'equipped' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-2xl mx-auto space-y-3">
            {EQUIPPED_PANEL_SLOTS.map(slot => {
              const slotItems = equippedBySlot[slot] ?? []
              const unequipped = items.filter(i => !i.isEquipped)
              return (
                <div key={slot} className="bg-gray-900 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold">{SLOT_ICON[slot]} {SLOT_LABEL[slot]}</p>
                    {unequipped.length > 0 && (
                      <button
                        onClick={() => setSelectingSlot(slot)}
                        className="text-xs px-2 py-1 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white transition-colors"
                      >
                        + Equip
                      </button>
                    )}
                  </div>
                  {slotItems.length === 0 ? (
                    <p className="text-sm text-gray-600 italic">Empty</p>
                  ) : (
                    <div className="space-y-2">
                      {slotItems.map(item => (
                        <div key={item.id} className="flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2.5">
                          <div className="flex-1 min-w-0">
                            <button
                              className="font-medium truncate hover:text-indigo-300 transition-colors text-left w-full"
                              onClick={() => setSelectedInvItem(item)}
                            >
                              {item.name}
                              {item.isTwoHanded && (
                                <span className="ml-2 text-xs text-yellow-400 font-normal">2H</span>
                              )}
                            </button>
                            <div className="flex gap-2 flex-wrap mt-0.5">
                              {item.acBonus != null && <span className="text-xs text-green-400">AC +{item.acBonus}</span>}
                              {item.damageOverride && <span className="text-xs text-red-400">{item.damageOverride}</span>}
                              {item.notes && <span className="text-xs text-gray-400">{item.notes}</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => equipMutation.mutate({ itemId: item.id, req: { isEquipped: false, slot: item.equippedSlot } })}
                            className="text-xs text-gray-500 hover:text-red-400 px-2 py-1 rounded transition-colors shrink-0"
                            title="Unequip"
                          >
                            Unequip
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {/* Legacy slots — only show if something is equipped in them */}
            {(['Armor', 'Weapon', 'Offhand', 'Accessory'] as InventorySlot[]).map(slot => {
              const slotItems = equippedBySlot[slot] ?? []
              if (slotItems.length === 0) return null
              return (
                <div key={slot} className="bg-gray-900 rounded-xl p-4">
                  <p className="text-sm font-semibold mb-2 text-gray-400">{SLOT_ICON[slot]} {SLOT_LABEL[slot]} <span className="text-xs">(legacy)</span></p>
                  <div className="space-y-2">
                    {slotItems.map(item => (
                      <div key={item.id} className="flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <button className="font-medium truncate hover:text-indigo-300 text-left w-full" onClick={() => setSelectedInvItem(item)}>
                            {item.name}
                          </button>
                        </div>
                        <button
                          onClick={() => equipMutation.mutate({ itemId: item.id, req: { isEquipped: false, slot: item.equippedSlot } })}
                          className="text-xs text-gray-500 hover:text-red-400 px-2 py-1 rounded transition-colors shrink-0"
                        >
                          Unequip
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            {items.filter(i => i.isEquipped).length === 0 && (
              <p className="text-gray-400 text-center py-10">
                Nothing equipped yet.<br />
                <span className="text-indigo-400 text-sm">Tap "+ Equip" on a slot above.</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Slot picker modal */}
      {selectingSlot && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4" onClick={() => setSelectingSlot(null)}>
          <div className="bg-gray-900 rounded-2xl w-full max-w-lg max-h-[70vh] overflow-y-auto p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">
                Equip to {SLOT_ICON[selectingSlot]} {SLOT_LABEL[selectingSlot]}
              </h2>
              <button onClick={() => setSelectingSlot(null)} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
            </div>
            {items.filter(i => !i.isEquipped).length === 0 ? (
              <p className="text-gray-400 text-sm">No unequipped items in inventory.</p>
            ) : (
              <div className="space-y-2">
                {items.filter(i => !i.isEquipped).map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      const armorEntry = (selectingSlot === 'Chest' || selectingSlot === 'Armor')
                        ? lookupArmor(item.name) : undefined
                      const protEntry = lookupProtection(item.name)
                      equipMutation.mutate({
                        itemId: item.id,
                        req: {
                          isEquipped: true,
                          slot: selectingSlot,
                          armorType: armorEntry ? armorEntry.type : item.armorType,
                          acBonus: armorEntry && item.acBonus == null ? armorEntry.ac : (item.acBonus ?? protEntry?.acBonus),
                          savingThrowBonus: item.savingThrowBonus ?? protEntry?.savingThrowBonus,
                        }
                      })
                      setSelectingSlot(null)
                    }}
                    className="w-full flex items-center gap-3 bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2.5 text-left transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{item.name}</p>
                      <div className="flex gap-2 flex-wrap mt-0.5">
                        {item.acBonus != null && <span className="text-xs text-green-400">{lookupArmor(item.name) ? `AC ${item.acBonus}` : `AC +${item.acBonus}`}</span>}
                        {item.damageOverride && <span className="text-xs text-red-400">{item.damageOverride}</span>}
                        {item.notes && <span className="text-xs text-gray-400">{item.notes}</span>}
                      </div>
                    </div>
                    <span className="text-indigo-400 text-xs shrink-0">Equip →</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
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


