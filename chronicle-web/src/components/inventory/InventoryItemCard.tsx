import type { InventoryItem, InventorySlot, EquipItemRequest, ArmorType } from '../../types'
import { SLOT_ICON, SLOT_LABEL, EQUIPPED_PANEL_SLOTS, ARMOR_TYPES } from '../../constants/inventory'

function guessSlot(item: InventoryItem): InventorySlot {
  if (item.equippedSlot) return item.equippedSlot
  const name = item.name.toLowerCase()
  if (/shield/.test(name)) return 'OffHand'
  if (/helmet|helm|hat|hood|crown|cap/.test(name)) return 'Head'
  if (/armor|mail|plate|breastplate|hide|leather|studded|splint|scale|robe|coat/.test(name)) return 'Chest'
  if (item.acBonus != null) return 'Chest'
  if (item.damageOverride) return 'MainHand'
  if (/boots|shoes|greaves|sabatons|slippers/.test(name)) return 'Feet'
  if (/gauntlet|gloves|bracers|vambraces/.test(name)) return 'Hands'
  if (/leggings|breeches|trousers|pants/.test(name)) return 'Legs'
  if (/sword|axe|bow|dagger|hammer|mace|spear|staff|wand|flail|scimitar|rapier|lance|pike|halberd|glaive|crossbow|sling|trident|whip|quarterstaff|shortsword|longsword|greatsword|handaxe|battleaxe|greataxe/.test(name)) return 'MainHand'
  if (/necklace|amulet|pendant|collar/.test(name)) return 'Neck'
  if (/ring/.test(name)) return 'Ring1'
  if (/cloak|cape|mantle|shroud/.test(name)) return 'Back'
  return 'Accessory'
}

export interface InventoryItemCardProps {
  item: InventoryItem
  sendingId: string | null
  sendCharId: string
  sendError: string
  isSendPending: boolean
  hasGameRoom: boolean
  onSelect: (item: InventoryItem) => void
  onEquip: (itemId: string, req: EquipItemRequest) => void
  onDelete: (itemId: string) => void
  onSendStart: (itemId: string) => void
  onSendCharIdChange: (val: string) => void
  onSendConfirm: (itemId: string, recipientId: string) => void
  onSendCancel: () => void
}

export function InventoryItemCard({
  item,
  sendingId,
  sendCharId,
  sendError,
  isSendPending,
  hasGameRoom,
  onSelect,
  onEquip,
  onDelete,
  onSendStart,
  onSendCharIdChange,
  onSendConfirm,
  onSendCancel,
}: InventoryItemCardProps) {
  return (
    <div className={`bg-gray-900 rounded-xl px-4 py-3 space-y-2 ${item.isEquipped ? 'ring-1 ring-indigo-600/50' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              className="font-medium hover:text-indigo-300 transition-colors text-left"
              onClick={() => onSelect(item)}
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
            onClick={() => onEquip(item.id, { isEquipped: !item.isEquipped, slot: guessSlot(item) })}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              item.isEquipped
                ? 'bg-indigo-800 hover:bg-indigo-700 text-indigo-200'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
            }`}
          >
            {item.isEquipped ? 'Unequip' : 'Equip'}
          </button>
          {hasGameRoom && (
            <button
              onClick={() => onSendStart(item.id)}
              className="text-xs bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-gray-400 transition-colors"
            >
              ↗
            </button>
          )}
          <button
            onClick={() => onDelete(item.id)}
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
              onClick={() => onEquip(item.id, { isEquipped: true, slot: s, armorType: item.armorType })}
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
                  onClick={() => onEquip(item.id, { isEquipped: true, slot: item.equippedSlot ?? 'Chest', armorType: t as ArmorType })}
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
                onClick={() => onEquip(item.id, { isEquipped: true, slot: 'MainHand', isTwoHanded: !item.isTwoHanded })}
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
            onChange={e => onSendCharIdChange(e.target.value)}
          />
          <button
            disabled={isSendPending || !sendCharId.trim()}
            onClick={() => onSendConfirm(item.id, sendCharId.trim())}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-3 py-1.5 rounded-lg text-sm"
          >
            Send
          </button>
          <button onClick={onSendCancel} className="text-gray-400 hover:text-white px-2 py-1.5 text-sm">✕</button>
        </div>
      )}
      {sendingId === item.id && sendError && <p className="text-red-400 text-xs">{sendError}</p>}
    </div>
  )
}
