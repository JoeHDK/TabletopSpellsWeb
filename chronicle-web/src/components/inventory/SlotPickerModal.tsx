import type { InventoryItem, InventorySlot, EquipItemRequest } from '../../types'
import { SLOT_ICON, SLOT_LABEL } from '../../constants/inventory'
import { lookupArmor } from '../../utils/armorTable'
import { lookupProtection } from '../../utils/protectionTable'

interface SlotPickerModalProps {
  slot: InventorySlot
  items: InventoryItem[]
  onClose: () => void
  onEquip: (itemId: string, req: EquipItemRequest) => void
}

export function SlotPickerModal({ slot, items, onClose, onEquip }: SlotPickerModalProps) {
  const unequipped = items.filter(i => !i.isEquipped)

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl w-full max-w-lg max-h-[70vh] overflow-y-auto p-5 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Equip to {SLOT_ICON[slot]} {SLOT_LABEL[slot]}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>
        {unequipped.length === 0 ? (
          <p className="text-gray-400 text-sm">No unequipped items in inventory.</p>
        ) : (
          <div className="space-y-2">
            {unequipped.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  const armorEntry = (slot === 'Chest' || slot === 'Armor')
                    ? lookupArmor(item.name) : undefined
                  const protEntry = lookupProtection(item.name)
                  onEquip(item.id, {
                    isEquipped: true,
                    slot,
                    armorType: armorEntry ? armorEntry.type : item.armorType,
                    acBonus: armorEntry && item.acBonus == null ? armorEntry.ac : (item.acBonus ?? protEntry?.acBonus),
                    savingThrowBonus: item.savingThrowBonus ?? protEntry?.savingThrowBonus,
                  })
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
  )
}
