import { useQuery } from '@tanstack/react-query'
import { monstersApi, customMonstersApi } from '../api/monsters'
import CreatureStatBlockModal from './CreatureStatBlockModal'
import type { CustomMonster, MonsterAttack, MonsterSpell } from '../types'

interface Props {
  monsterName: string | null
  displayName: string
  onClose: () => void
}

function mod(score: number): string {
  const m = Math.floor((score - 10) / 2)
  return m >= 0 ? `+${m}` : String(m)
}

function AbilityScore({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="text-base font-bold text-white">{score}</span>
      <span className="text-xs text-gray-300">({mod(score)})</span>
    </div>
  )
}

function AttackRow({ attack }: { attack: MonsterAttack }) {
  const bonusStr = attack.attackBonus !== undefined
    ? (attack.attackBonus >= 0 ? `+${attack.attackBonus}` : String(attack.attackBonus))
    : null

  return (
    <div className="border-b border-gray-800 pb-2 last:border-0 last:pb-0">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-xs font-semibold text-gray-200 italic">{attack.name}.</span>
        {bonusStr && <span className="text-xs text-gray-400">{bonusStr} to hit</span>}
        {attack.range && <span className="text-xs text-gray-500">· {attack.range}</span>}
        {(attack.hitDamage || attack.damageType) && (
          <span className="text-xs text-gray-400">
            · {[attack.hitDamage, attack.damageType].filter(Boolean).join(' ')}
          </span>
        )}
      </div>
      {attack.description && (
        <p className="text-xs text-gray-500 mt-0.5">{attack.description}</p>
      )}
    </div>
  )
}

function CustomMonsterStatBlock({ monster, onClose }: { monster: CustomMonster; onClose: () => void }) {
  function crDisplay(cr: number): string {
    if (cr === 0.125) return '1/8'
    if (cr === 0.25) return '1/4'
    if (cr === 0.5) return '1/2'
    return String(cr)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">{monster.name}</h2>
            <p className="text-xs text-gray-400">
              {monster.size} {monster.type} · CR {crDisplay(monster.challengeRating)}
              <span className="ml-2 text-indigo-400 font-medium">Custom</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none mt-0.5">✕</button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* Core stats */}
          <div className="flex gap-6 text-sm text-gray-300">
            <div><span className="text-gray-500">AC</span> <span className="font-semibold text-white">{monster.armorClass}</span></div>
            <div><span className="text-gray-500">HP</span> <span className="font-semibold text-white">{monster.hitPoints}</span></div>
            <div><span className="text-gray-500">Speed</span> <span className="font-semibold text-white">{monster.speed}</span></div>
          </div>

          {/* Ability scores */}
          <div className="grid grid-cols-6 gap-1 bg-gray-800 rounded-lg p-3">
            <AbilityScore label="STR" score={monster.strength} />
            <AbilityScore label="DEX" score={monster.dexterity} />
            <AbilityScore label="CON" score={monster.constitution} />
            <AbilityScore label="INT" score={monster.intelligence} />
            <AbilityScore label="WIS" score={monster.wisdom} />
            <AbilityScore label="CHA" score={monster.charisma} />
          </div>

          {/* Attacks */}
          {monster.attacks.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-gray-700 pb-1 mb-2">Actions</h4>
              <div className="space-y-2">
                {monster.attacks.map(a => <AttackRow key={a.id} attack={a} />)}
              </div>
            </div>
          )}

          {/* Spells */}
          {monster.spells.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-gray-700 pb-1 mb-2">Spellcasting</h4>
              <div className="space-y-1">
                {monster.spells.map((sp: MonsterSpell) => (
                  <div key={sp.id} className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-200 italic">{sp.name}</span>
                    {sp.usageNote && <span className="text-xs text-gray-500">({sp.usageNote})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {monster.description && (
            <div className="mt-3 border-t border-gray-700 pt-3">
              <p className="text-xs text-gray-400 leading-relaxed">{monster.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LoadingModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl px-8 py-6 text-gray-400 text-sm">
        Loading…
      </div>
    </div>
  )
}

export default function CombatCreatureStatBlockModal({ monsterName, displayName, onClose }: Props) {
  // Fetch SRD monster if we have a name
  const { data: srdMonster, isLoading: srdLoading, isError: srdError } = useQuery({
    queryKey: ['monster', monsterName],
    queryFn: () => monstersApi.getByName(monsterName!),
    enabled: !!monsterName,
    retry: false,
    staleTime: Infinity,
  })

  // Always fetch custom monsters in parallel — don't wait for SRD to fail first.
  // This avoids an enabled-flip race where customLoading stays true indefinitely.
  const { data: customMonsters = [], isLoading: customLoading } = useQuery({
    queryKey: ['custom-monsters'],
    queryFn: customMonstersApi.getAll,
    retry: false,
    staleTime: 30_000,
  })

  const lookupName = (monsterName ?? displayName).toLowerCase()
  const customMatch = customMonsters.find(c => c.name.toLowerCase() === lookupName)

  // Still waiting on SRD (and we haven't already found a custom match)
  if (srdLoading && !customMatch) {
    return <LoadingModal onClose={onClose} />
  }

  // SRD hit — show full stat block
  if (srdMonster && !srdError) {
    return <CreatureStatBlockModal monster={srdMonster} onClose={onClose} />
  }

  // Custom monster found
  if (customMatch) {
    return <CustomMonsterStatBlock monster={customMatch} onClose={onClose} />
  }

  // Still fetching custom monsters (SRD already failed or wasn't attempted)
  if (customLoading) {
    return <LoadingModal onClose={onClose} />
  }

  // Fallback: no data found — show minimal info
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-sm p-6 text-center shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>
        <h2 className="text-lg font-bold text-white mb-1">{displayName}</h2>
        {monsterName && monsterName !== displayName && (
          <p className="text-xs text-gray-500 mb-3">({monsterName})</p>
        )}
        <p className="text-sm text-gray-500">No stat block found.</p>
      </div>
    </div>
  )
}
