import type { InventoryItem, Item } from '../../types'
import { SLOT_ICON, SLOT_LABEL, ARMOR_TYPE_LABEL } from '../../constants/inventory'
import { lookupArmor } from '../../utils/armorTable'

export function rarityColor(rarity: string) {
  switch (rarity.toLowerCase()) {
    case 'uncommon': return 'bg-green-900/50 text-green-300'
    case 'rare': return 'bg-blue-900/50 text-blue-300'
    case 'very rare': return 'bg-purple-900/50 text-purple-300'
    case 'legendary': return 'bg-orange-900/50 text-orange-300'
    case 'artifact': return 'bg-red-900/50 text-red-300'
    default: return 'bg-gray-800 text-gray-400'
  }
}

interface InventoryItemModalProps {
  item: InventoryItem
  onClose: () => void
}

export function InventoryItemModal({ item, onClose }: InventoryItemModalProps) {
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

interface ItemDetailModalProps {
  item: Item
  onClose: () => void
}

export function ItemDetailModal({ item, onClose }: ItemDetailModalProps) {
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
