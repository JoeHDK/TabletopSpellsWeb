import type { Monster, MonsterTrait } from '../types'

interface Props {
  monster: Monster
  onClose: () => void
  onAddToEncounter?: () => void
}

function crDisplay(cr: number): string {
  if (cr === 0.125) return '1/8'
  if (cr === 0.25) return '1/4'
  if (cr === 0.5) return '1/2'
  return String(cr)
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

function TraitSection({ title, items }: { title: string; items: MonsterTrait[] }) {
  if (items.length === 0) return null
  return (
    <div className="mt-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-gray-700 pb-1 mb-2">{title}</h4>
      <div className="space-y-2">
        {items.map((t, i) => (
          <div key={i}>
            <span className="text-xs font-semibold text-gray-200 italic">{t.name}. </span>
            <span className="text-xs text-gray-400">{t.description}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CreatureStatBlockModal({ monster, onClose, onAddToEncounter }: Props) {
  const speeds: string[] = []
  if (monster.walkSpeed) speeds.push(`${monster.walkSpeed} ft.`)
  if (monster.flySpeed) speeds.push(`Fly ${monster.flySpeed} ft.`)
  if (monster.swimSpeed) speeds.push(`Swim ${monster.swimSpeed} ft.`)
  if (monster.climbSpeed) speeds.push(`Climb ${monster.climbSpeed} ft.`)
  if (monster.burrowSpeed) speeds.push(`Burrow ${monster.burrowSpeed} ft.`)

  const acText = monster.acNote ? `${monster.ac} (${monster.acNote})` : String(monster.ac)

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">{monster.name}</h2>
            <p className="text-xs text-gray-400">
              {monster.size} {monster.type}{monster.subtype ? ` (${monster.subtype})` : ''} · CR {crDisplay(monster.cr)}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none mt-0.5">✕</button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* Core stats */}
          <div className="flex gap-6 text-sm text-gray-300">
            <div><span className="text-gray-500">AC</span> <span className="font-semibold text-white">{acText}</span></div>
            <div><span className="text-gray-500">HP</span> <span className="font-semibold text-white">{monster.hp}</span> <span className="text-gray-500 text-xs">({monster.hitDice})</span></div>
            <div><span className="text-gray-500">Speed</span> <span className="font-semibold text-white">{speeds.join(', ') || '0 ft.'}</span></div>
          </div>

          {/* Ability scores */}
          <div className="grid grid-cols-6 gap-1 bg-gray-800 rounded-lg p-3">
            <AbilityScore label="STR" score={monster.str} />
            <AbilityScore label="DEX" score={monster.dex} />
            <AbilityScore label="CON" score={monster.con} />
            <AbilityScore label="INT" score={monster.int} />
            <AbilityScore label="WIS" score={monster.wis} />
            <AbilityScore label="CHA" score={monster.cha} />
          </div>

          {/* Details */}
          <div className="space-y-1 text-xs text-gray-400 border-t border-gray-700 pt-3">
            {monster.savingThrows.length > 0 && (
              <p><span className="text-gray-500">Saving Throws</span> {monster.savingThrows.join(', ')}</p>
            )}
            {monster.skills.length > 0 && (
              <p><span className="text-gray-500">Skills</span> {monster.skills.join(', ')}</p>
            )}
            {monster.damageVulnerabilities.length > 0 && (
              <p><span className="text-gray-500">Damage Vulnerabilities</span> {monster.damageVulnerabilities.join(', ')}</p>
            )}
            {monster.damageResistances.length > 0 && (
              <p><span className="text-gray-500">Damage Resistances</span> {monster.damageResistances.join(', ')}</p>
            )}
            {monster.damageImmunities.length > 0 && (
              <p><span className="text-gray-500">Damage Immunities</span> {monster.damageImmunities.join(', ')}</p>
            )}
            {monster.conditionImmunities.length > 0 && (
              <p><span className="text-gray-500">Condition Immunities</span> {monster.conditionImmunities.join(', ')}</p>
            )}
            {monster.senses && <p><span className="text-gray-500">Senses</span> {monster.senses}</p>}
            {monster.languages && <p><span className="text-gray-500">Languages</span> {monster.languages}</p>}
          </div>

          <TraitSection title="Traits" items={monster.traits} />
          <TraitSection title="Actions" items={monster.actions} />
          <TraitSection title="Legendary Actions" items={monster.legendaryActions} />
        </div>

        {/* Footer */}
        {onAddToEncounter && (
          <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 px-5 py-3">
            <button
              onClick={onAddToEncounter}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
            >
              ⚔ Add to Encounter
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
