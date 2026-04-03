import type { InventoryItem, InventorySlot, EquipItemRequest } from '../../types'
import { SLOT_ICON, SLOT_LABEL, EQUIPPED_PANEL_SLOTS } from '../../constants/inventory'

interface EquippedTabProps {
  items: InventoryItem[]
  equippedBySlot: Record<InventorySlot, InventoryItem[]>
  onSelectItem: (item: InventoryItem) => void
  onEquip: (itemId: string, req: EquipItemRequest) => void
  onEquipSlotClick: (slot: InventorySlot) => void
}

export function EquippedTab({ items, equippedBySlot, onSelectItem, onEquip, onEquipSlotClick }: EquippedTabProps) {
  const unequipped = items.filter(i => !i.isEquipped)

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-2xl mx-auto space-y-3">
        {EQUIPPED_PANEL_SLOTS.map(slot => {
          const slotItems = equippedBySlot[slot] ?? []
          return (
            <div key={slot} className="bg-gray-900 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">{SLOT_ICON[slot]} {SLOT_LABEL[slot]}</p>
                {unequipped.length > 0 && (
                  <button
                    onClick={() => onEquipSlotClick(slot)}
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
                          onClick={() => onSelectItem(item)}
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
                        onClick={() => onEquip(item.id, { isEquipped: false, slot: item.equippedSlot })}
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
                      <button className="font-medium truncate hover:text-indigo-300 text-left w-full" onClick={() => onSelectItem(item)}>
                        {item.name}
                      </button>
                    </div>
                    <button
                      onClick={() => onEquip(item.id, { isEquipped: false, slot: item.equippedSlot })}
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
  )
}
