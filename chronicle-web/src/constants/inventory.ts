import type { InventorySlot, ArmorType } from '../types/index'

export const SLOTS: InventorySlot[] = [
  'Head', 'Chest', 'Legs', 'Hands', 'Feet',
  'MainHand', 'OffHand', 'Neck', 'Ring1', 'Ring2', 'Back',
  // Legacy slots kept for backwards-compat items
  'Armor', 'Weapon', 'Offhand', 'Accessory',
]

export const EQUIPPED_PANEL_SLOTS: InventorySlot[] = [
  'Head', 'Chest', 'Legs', 'Hands', 'Feet',
  'MainHand', 'OffHand', 'Neck', 'Ring1', 'Ring2', 'Back',
]

export const ARMOR_TYPES: ArmorType[] = ['None', 'Light', 'Medium', 'Heavy']

export const ARMOR_TYPE_LABEL: Record<ArmorType, string> = {
  None: 'Unarmored / Clothing',
  Light: 'Light Armor',
  Medium: 'Medium Armor',
  Heavy: 'Heavy Armor',
}

export const SLOT_ICON: Record<InventorySlot, string> = {
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

export const SLOT_LABEL: Record<InventorySlot, string> = {
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
