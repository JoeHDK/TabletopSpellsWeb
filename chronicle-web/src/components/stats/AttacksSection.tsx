import type React from 'react'
import type { Character, InventoryItem, CharacterAttack, AddAttackRequest, AbilityModKey, Beast } from '../../types'

export const BLANK_ATTACK: AddAttackRequest = {
  name: '', damageFormula: '', damageType: '', abilityMod: 'Strength',
  useProficiency: true, magicBonus: 0, notes: '',
}

const RANGED_RE = /\b(bow|crossbow|dart|sling|blowgun|net)\b/i
const ABILITY_OPTIONS: AbilityModKey[] = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma', 'None']

function crToProfBonus(cr: number): number {
  if (cr <= 4) return 2
  if (cr <= 8) return 3
  if (cr <= 12) return 4
  if (cr <= 16) return 5
  if (cr <= 20) return 6
  return 7
}

interface AttacksSectionProps {
  character: Character
  inventory: InventoryItem[]
  customAttacks: CharacterAttack[]
  allBeasts: Beast[]
  abilityScores: Record<string, number>
  profBonusNum: number
  sneakAttackDice: number
  showAttackForm: boolean
  setShowAttackForm: (v: boolean) => void
  editingAttack: CharacterAttack | null
  setEditingAttack: (a: CharacterAttack | null) => void
  attackForm: AddAttackRequest
  setAttackForm: React.Dispatch<React.SetStateAction<AddAttackRequest>>
  onAddAttack: (req: AddAttackRequest) => void
  onUpdateAttack: (args: { attackId: string; req: AddAttackRequest }) => void
  onDeleteAttack: (attackId: string) => void
  addAttackPending: boolean
  updateAttackPending: boolean
}

export function AttacksSection({
  character,
  inventory,
  customAttacks,
  allBeasts,
  abilityScores,
  profBonusNum,
  sneakAttackDice,
  showAttackForm,
  setShowAttackForm,
  editingAttack,
  setEditingAttack,
  attackForm,
  setAttackForm,
  onAddAttack,
  onUpdateAttack,
  onDeleteAttack,
  addAttackPending,
  updateAttackPending,
}: AttacksSectionProps) {
  const fmtMod = (n: number) => n >= 0 ? `+${n}` : `${n}`

  // Check if in Wild Shape — show beast attacks instead
  const inWildShape = !!character.wildShapeBeastName
  const activeBeast = inWildShape
    ? allBeasts.find((b: Beast) => b.name === character.wildShapeBeastName)
    : null

  if (inWildShape && activeBeast) {
    const beastAttacks = activeBeast.attacks.map((atk, i) => {
      const score = atk.stat === 'dex' ? activeBeast.dex : activeBeast.str
      const statMod = Math.floor((score - 10) / 2)
      const toHit = statMod + crToProfBonus(activeBeast.cr)
      const dmgStr = `${atk.dice}${statMod !== 0 ? fmtMod(statMod) : ''} ${atk.type}`
      return { id: `beast-${i}`, name: atk.name, toHit, dmgStr }
    })
    return (
      <section className="bg-gray-900 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Attacks</h2>
          <span className="text-[10px] text-amber-400">{activeBeast.name} form</span>
        </div>
        <div className="space-y-2">
          {beastAttacks.map(atk => (
            <div key={atk.id} className="bg-gray-800 rounded-xl px-3 py-2.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{atk.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{atk.dmgStr}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-400">To Hit</p>
                <p className="font-bold text-sm text-indigo-300">{fmtMod(atk.toHit)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  // Normal (non-wild-shape) attacks
  // Auto-generate attack profiles from equipped weapons
  const equippedWeapons = inventory.filter(i => i.isEquipped && (
    i.equippedSlot === 'Weapon' || i.equippedSlot === 'Offhand' ||
    i.equippedSlot === 'MainHand' || i.equippedSlot === 'OffHand'
  ))
  const autoAttacks = equippedWeapons.map(item => {
    const isRanged = RANGED_RE.test(item.name) || RANGED_RE.test(item.notes ?? '')
    const ability = isRanged ? 'Dexterity' : 'Strength'
    const aMod = Math.floor(((abilityScores[ability] ?? 10) - 10) / 2)
    const isOffHand = item.equippedSlot === 'Offhand' || item.equippedSlot === 'OffHand'
    const toHit = aMod + profBonusNum + (isOffHand ? -profBonusNum : 0)
    const dmgBonus = aMod
    const dmgStr = item.damageOverride
      ? `${item.damageOverride}${dmgBonus !== 0 ? fmtMod(dmgBonus) : ''}`
      : fmtMod(dmgBonus)
    return { id: item.id, name: item.name, toHit, dmgStr, slot: item.equippedSlot, isAuto: true }
  })

  // Unarmed strike (always available)
  const strMod = Math.floor(((abilityScores['Strength'] ?? 10) - 10) / 2)
  autoAttacks.push({
    id: 'unarmed',
    name: 'Unarmed Strike',
    toHit: strMod + profBonusNum,
    dmgStr: `1${fmtMod(strMod)} bludgeoning`,
    slot: null as any,
    isAuto: true,
  })

  // Custom stored attacks
  const computedCustom = customAttacks.map((atk: CharacterAttack) => {
    const aMod = atk.abilityMod === 'None' ? 0 : Math.floor(((abilityScores[atk.abilityMod] ?? 10) - 10) / 2)
    const toHit = (atk.useProficiency ? profBonusNum : 0) + aMod + atk.magicBonus
    const dmgBonus = aMod + atk.magicBonus
    const dmgStr = atk.damageFormula
      ? `${atk.damageFormula}${dmgBonus !== 0 ? fmtMod(dmgBonus) : ''}${atk.damageType ? ` ${atk.damageType}` : ''}`
      : dmgBonus !== 0 ? fmtMod(dmgBonus) : '—'
    return { ...atk, toHit, dmgStr }
  })

  return (
    <section className="bg-gray-900 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Attacks</h2>
        {!showAttackForm && !editingAttack && (
          <button
            onClick={() => { setAttackForm(BLANK_ATTACK); setShowAttackForm(true) }}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >+ Add</button>
        )}
      </div>

      {/* Sneak Attack badge for Rogues */}
      {sneakAttackDice > 0 && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 flex items-start gap-2">
          <span className="text-amber-400 text-sm shrink-0">🗡️</span>
          <div className="text-xs">
            <span className="text-amber-300 font-semibold">Sneak Attack: {sneakAttackDice}d6</span>
            <span className="text-gray-400 ml-1">— once per turn, with advantage or an adjacent ally, using a finesse or ranged weapon</span>
          </div>
        </div>
      )}

      {/* Auto-generated weapon attacks */}
      <div className="space-y-2 mb-3">
        {autoAttacks.map(atk => (
          <div key={atk.id} className="bg-gray-800 rounded-xl px-3 py-2.5 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{atk.name}
                <span className="text-[10px] text-gray-400 ml-1.5 font-normal">{atk.slot ?? 'unarmed'}</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{atk.dmgStr}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-gray-400">To Hit</p>
              <p className="font-bold text-sm text-indigo-300">{fmtMod(atk.toHit)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Custom stored attacks */}
      {computedCustom.length > 0 && (
        <div className="space-y-2 mb-3">
          {computedCustom.map(atk => (
            <div key={atk.id} className="bg-gray-800 rounded-xl px-3 py-2.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{atk.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{atk.dmgStr}</p>
                {atk.notes && <p className="text-xs text-gray-600 mt-0.5 truncate">{atk.notes}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-400">To Hit</p>
                <p className="font-bold text-sm text-indigo-300">{fmtMod(atk.toHit)}</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  onClick={() => { setEditingAttack(atk); setAttackForm({ name: atk.name, damageFormula: atk.damageFormula ?? '', damageType: atk.damageType ?? '', abilityMod: atk.abilityMod, useProficiency: atk.useProficiency, magicBonus: atk.magicBonus, notes: atk.notes ?? '', sortOrder: atk.sortOrder }); setShowAttackForm(false) }}
                  className="text-xs text-gray-400 hover:text-indigo-400 transition-colors"
                >✏</button>
                <button
                  onClick={() => onDeleteAttack(atk.id)}
                  className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                >🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit form */}
      {(showAttackForm || editingAttack) && (
        <div className="bg-gray-800 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-300">{editingAttack ? 'Edit Attack' : 'New Attack'}</p>
          <input
            className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Name (e.g. Flurry of Blows)"
            value={attackForm.name}
            onChange={e => setAttackForm(f => ({ ...f, name: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="bg-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Damage (e.g. 1d6)"
              value={attackForm.damageFormula ?? ''}
              onChange={e => setAttackForm(f => ({ ...f, damageFormula: e.target.value }))}
            />
            <input
              className="bg-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Type (e.g. bludgeoning)"
              value={attackForm.damageType ?? ''}
              onChange={e => setAttackForm(f => ({ ...f, damageType: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              className="bg-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={attackForm.abilityMod}
              onChange={e => setAttackForm(f => ({ ...f, abilityMod: e.target.value as AbilityModKey }))}
            >
              {ABILITY_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <input
              type="number"
              className="bg-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Magic bonus"
              value={attackForm.magicBonus}
              onChange={e => setAttackForm(f => ({ ...f, magicBonus: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAttackForm(f => ({ ...f, useProficiency: !f.useProficiency }))}
              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg transition-colors ${attackForm.useProficiency ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'}`}
            >
              <span className="w-2.5 h-2.5 rounded-full border border-current inline-block" />
              Proficient
            </button>
          </div>
          <input
            className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Notes (optional)"
            value={attackForm.notes ?? ''}
            onChange={e => setAttackForm(f => ({ ...f, notes: e.target.value }))}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowAttackForm(false); setEditingAttack(null); setAttackForm(BLANK_ATTACK) }}
              className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
            >Cancel</button>
            <button
              disabled={!attackForm.name.trim() || addAttackPending || updateAttackPending}
              onClick={() => {
                if (editingAttack) onUpdateAttack({ attackId: editingAttack.id, req: attackForm })
                else onAddAttack(attackForm)
              }}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
            >{editingAttack ? 'Save' : 'Add'}</button>
          </div>
        </div>
      )}
    </section>
  )
}
