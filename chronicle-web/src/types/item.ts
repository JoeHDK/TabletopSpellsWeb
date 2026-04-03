export type InventorySlot =
  | 'Armor' | 'Weapon' | 'Offhand' | 'Accessory'
  | 'Head' | 'Chest' | 'Legs' | 'Hands' | 'Feet'
  | 'MainHand' | 'OffHand' | 'Neck' | 'Ring1' | 'Ring2' | 'Back'

export type ItemSource = 'SRD' | 'Custom'
export type ArmorType = 'None' | 'Light' | 'Medium' | 'Heavy'

export interface Item {
  index: string
  name: string
  item_type: 'magic' | 'equipment'
  category: string
  rarity: string
  description: string
  requires_attunement: boolean
  attunement_note?: string
  cost?: string
  weight?: number
  damage?: string
  properties: string[]
  source: string
  acBonus?: number
  armorType?: string
}

export interface DamageEntry {
  dice: string
  damageType: string
}

export interface CustomItemAbility {
  name: string
  spellIndex?: string
  maxUses: number
  resetOn: 'short_rest' | 'long_rest'
}

export interface EquipmentResource {
  id: string
  inventoryItemId: string
  itemName: string
  abilityName: string
  spellIndex?: string
  maxUses: number
  usesRemaining: number
  resetOn: 'short_rest' | 'long_rest'
}

export interface CustomItem {
  id: string
  name: string
  item_type: 'magic' | 'equipment'
  category?: string
  rarity?: string
  description?: string
  requires_attunement: boolean
  attunement_note?: string
  cost?: string
  weight?: number
  damage?: string
  damage_entries?: DamageEntry[]
  abilities?: CustomItemAbility[]
  ac_bonus?: number
  str_bonus?: number
  con_bonus?: number
  dex_bonus?: number
  wis_bonus?: number
  int_bonus?: number
  cha_bonus?: number
  saving_throw_bonus?: number
  properties: string[]
  createdAt: string
}

export interface SaveCustomItemRequest {
  name: string
  item_type: 'magic' | 'equipment'
  category?: string
  rarity?: string
  description?: string
  requires_attunement: boolean
  attunement_note?: string
  cost?: string
  weight?: number
  damage?: string
  damage_entries?: DamageEntry[]
  abilities?: CustomItemAbility[]
  ac_bonus?: number
  str_bonus?: number
  con_bonus?: number
  dex_bonus?: number
  wis_bonus?: number
  int_bonus?: number
  cha_bonus?: number
  saving_throw_bonus?: number
  properties: string[]
}

export interface InventoryItem {
  id: string
  itemSource: ItemSource
  srdItemIndex?: string
  customItemId?: string
  name: string
  quantity: number
  isEquipped: boolean
  equippedSlot?: InventorySlot
  acBonus?: number
  armorType?: ArmorType
  damageOverride?: string
  damageEntries?: DamageEntry[]
  isTwoHanded?: boolean
  strBonus?: number
  conBonus?: number
  dexBonus?: number
  wisBonus?: number
  intBonus?: number
  chaBonus?: number
  savingThrowBonus?: number
  notes?: string
  grantedByUsername?: string
  acquiredAt: string
}

export interface AddInventoryItemRequest {
  itemSource: ItemSource
  srdItemIndex?: string
  customItemId?: string
  name: string
  quantity: number
  acBonus?: number
  armorType?: ArmorType
  damageOverride?: string
  isTwoHanded?: boolean
  savingThrowBonus?: number
  notes?: string
}

export interface EquipItemRequest {
  isEquipped: boolean
  slot?: InventorySlot
  armorType?: ArmorType
  acBonus?: number
  isTwoHanded?: boolean
  savingThrowBonus?: number
}

export interface GiveItemRequest {
  recipientCharacterId: string
  itemSource: ItemSource
  srdItemIndex?: string
  customItemId?: string
  name: string
  quantity: number
  acBonus?: number
  armorType?: ArmorType
  damageOverride?: string
  damageEntries?: DamageEntry[]
  strBonus?: number
  conBonus?: number
  dexBonus?: number
  wisBonus?: number
  intBonus?: number
  chaBonus?: number
  savingThrowBonus?: number
  notes?: string
}

export interface CreateLootItemRequest {
  name: string
  itemSource: ItemSource
  srdItemIndex?: string
  customItemId?: string
  quantity: number
  acBonus?: number
  damageOverride?: string
  notes?: string
}

export interface LootItem {
  id: string
  name: string
  itemSource: ItemSource
  srdItemIndex?: string
  customItemId?: string
  quantity: number
  acBonus?: number
  damageOverride?: string
  notes?: string
  createdAt: string
}

export interface SendItemRequest {
  recipientCharacterId: string
}
