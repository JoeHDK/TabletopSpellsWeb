import { useState } from 'react'
import EditableNumber from '../EditableNumber'
import BeastPickerModal from '../BeastPickerModal'
import { resolveClassName } from '../../utils/spellUtils'
import type { Character, Beast } from '../../types'

function crLabel(cr: number): string {
  if (cr === 0.125) return '1/8'
  if (cr === 0.25) return '1/4'
  if (cr === 0.5) return '1/2'
  return String(cr)
}

function crToProfBonus(cr: number): number {
  if (cr <= 4) return 2
  if (cr <= 8) return 3
  if (cr <= 12) return 4
  if (cr <= 16) return 5
  if (cr <= 20) return 6
  return 7
}

function getWildShapeLimits(level: number, subclass: string): { maxCr: number; allowFly: boolean; allowSwim: boolean } {
  const isMoon = subclass === 'DruidCircleOfTheMoon'
  let maxCr: number
  if (isMoon) {
    maxCr = level >= 6 ? Math.floor(level / 3) : 1
  } else {
    maxCr = level >= 8 ? 1 : level >= 4 ? 0.5 : 0.25
  }
  const allowFly = level >= 8
  const allowSwim = level >= 4
  return { maxCr, allowFly, allowSwim }
}

type WildShapeRequest =
  | { action: 'enter'; beastName: string; beastMaxHp: number; beastCurrentHp: number }
  | { action: 'revert' }
  | { action: 'heal'; amount: number }
  | { action: 'damage'; amount: number }
  | { action: 'restoreUses' }

interface ClassFeaturesSectionProps {
  character: Character
  allBeasts: Beast[]
  onWildShapeAction: (req: WildShapeRequest) => void
  wildShapePending: boolean
}

export function ClassFeaturesSection({ character, allBeasts, onWildShapeAction, wildShapePending }: ClassFeaturesSectionProps) {
  const [showBeastPicker, setShowBeastPicker] = useState(false)
  const [showBeastStats, setShowBeastStats] = useState(false)

  if (resolveClassName(character.characterClass) !== 'druid') return null

  if (character.level < 2) {
    return (
      <section className="bg-gray-900 rounded-2xl p-4">
        <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Wild Shape</h2>
        <p className="text-sm text-gray-400">Available at level 2.</p>
      </section>
    )
  }

  const limits = getWildShapeLimits(character.level, character.subclass)
  const inForm = !!character.wildShapeBeastName
  const uses = character.wildShapeUsesRemaining
  const maxUses = character.level >= 20 ? Infinity : 2
  const beastHpPct = (character.wildShapeBeastCurrentHp ?? 0) / (character.wildShapeBeastMaxHp ?? 1) * 100
  const beastHpColor = beastHpPct > 50 ? 'bg-green-500' : beastHpPct > 25 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <section className="bg-gray-900 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Wild Shape</h2>
        <div className="flex gap-1">
          {Array.from({ length: Math.min(maxUses, 4) }).map((_, i) => (
            <span key={i} className={`w-3 h-3 rounded-full border-2 ${i < uses ? 'bg-indigo-500 border-indigo-500' : 'border-gray-500'}`} />
          ))}
          {maxUses === Infinity && <span className="text-xs text-indigo-400">∞</span>}
        </div>
      </div>

      {!inForm ? (
        <div className="flex gap-2">
          <button
            disabled={uses <= 0 || wildShapePending}
            onClick={() => setShowBeastPicker(true)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-xl transition-colors"
          >
            🐾 Enter Wild Shape
          </button>
          <button
            disabled={uses >= maxUses || wildShapePending}
            onClick={() => onWildShapeAction({ action: 'restoreUses' })}
            title="Short / long rest"
            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors"
          >
            ⏳
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🐺</span>
            <button
              className="text-left hover:opacity-80 transition-opacity"
              onClick={() => setShowBeastStats(true)}
              title="View beast stats"
            >
              <p className="text-sm font-semibold text-white underline decoration-dotted">{character.wildShapeBeastName}</p>
              <p className="text-xs text-gray-400">Beast form active — tap for stats</p>
            </button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">Beast HP</span>
              <div className="flex items-center gap-1 text-sm">
                <EditableNumber
                  value={character.wildShapeBeastCurrentHp ?? 0}
                  onChange={v => {
                    const cur = character.wildShapeBeastCurrentHp ?? 0
                    const diff = v - cur
                    if (diff > 0) onWildShapeAction({ action: 'heal', amount: diff })
                    else if (diff < 0) onWildShapeAction({ action: 'damage', amount: -diff })
                  }}
                  min={0} max={character.wildShapeBeastMaxHp ?? 999}
                  label="Beast HP"
                  className="w-12 text-center font-bold text-lg"
                />
                <span className="text-gray-500">/</span>
                <span className="text-gray-400 w-8 text-center">{character.wildShapeBeastMaxHp}</span>
              </div>
            </div>
            <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
              <div className={`h-full ${beastHpColor} rounded-full transition-all`} style={{ width: `${Math.max(0, Math.min(100, beastHpPct))}%` }} />
            </div>
          </div>
          <button
            disabled={wildShapePending}
            onClick={() => onWildShapeAction({ action: 'revert' })}
            className="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white text-sm font-medium py-2 rounded-xl transition-colors"
          >
            ↩ Revert to Druid
          </button>
        </div>
      )}

      {showBeastPicker && (
        <BeastPickerModal
          maxCr={limits.maxCr}
          allowFly={limits.allowFly}
          allowSwim={limits.allowSwim}
          onClose={() => setShowBeastPicker(false)}
          onSelect={(beast: Beast) => {
            setShowBeastPicker(false)
            onWildShapeAction({
              action: 'enter',
              beastName: beast.name,
              beastMaxHp: beast.hp,
              beastCurrentHp: beast.hp,
            })
          }}
        />
      )}

      {showBeastStats && character.wildShapeBeastName && (() => {
        const activeBeast = allBeasts.find(b => b.name === character.wildShapeBeastName)
        if (!activeBeast) return null
        const abilityMod = (score: number) => Math.floor((score - 10) / 2)
        const fmtMod = (n: number) => n >= 0 ? `+${n}` : `${n}`
        return (
          <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4" onClick={() => setShowBeastStats(false)}>
            <div className="bg-gray-900 rounded-2xl w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold">{activeBeast.name}</h2>
                  <p className="text-xs text-gray-400">{activeBeast.size} Beast · CR {activeBeast.cr}</p>
                </div>
                <button onClick={() => setShowBeastStats(false)} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[['AC', activeBeast.ac], ['HP', activeBeast.hp], ['CR', activeBeast.cr]].map(([label, val]) => (
                  <div key={label as string} className="bg-gray-800 rounded-lg p-2">
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="font-bold">{val}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[['STR', activeBeast.str], ['DEX', activeBeast.dex], ['CON', activeBeast.con]].map(([label, score]) => (
                  <div key={label as string} className="bg-gray-800 rounded-lg p-2">
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="font-bold">{score}</p>
                    <p className="text-xs text-gray-400">{fmtMod(abilityMod(score as number))}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1 text-sm">
                {activeBeast.walkSpeed > 0 && <div className="flex justify-between"><span className="text-gray-400">Walk</span><span>{activeBeast.walkSpeed} ft</span></div>}
                {activeBeast.flySpeed > 0 && <div className="flex justify-between"><span className="text-gray-400">Fly</span><span>{activeBeast.flySpeed} ft</span></div>}
                {activeBeast.swimSpeed > 0 && <div className="flex justify-between"><span className="text-gray-400">Swim</span><span>{activeBeast.swimSpeed} ft</span></div>}
                {activeBeast.climbSpeed > 0 && <div className="flex justify-between"><span className="text-gray-400">Climb</span><span>{activeBeast.climbSpeed} ft</span></div>}
              </div>
              {activeBeast.attacks.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Attacks</p>
                  <div className="space-y-1">
                    {activeBeast.attacks.map((atk, i) => {
                      const score = atk.stat === 'dex' ? activeBeast.dex : activeBeast.str
                      const statMod = Math.floor((score - 10) / 2)
                      const toHit = statMod + crToProfBonus(activeBeast.cr)
                      const dmgStr = `${atk.dice}${statMod !== 0 ? fmtMod(statMod) : ''} ${atk.type}`
                      return (
                        <div key={i} className="flex justify-between items-center text-sm bg-gray-800 rounded-lg px-3 py-1.5">
                          <span className="font-medium">{atk.name}</span>
                          <div className="text-right">
                            <span className="text-indigo-300 font-bold">{fmtMod(toHit)}</span>
                            <span className="text-gray-400 text-xs ml-2">{dmgStr}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      <p className="text-xs text-gray-600 text-center">
        Max CR {crLabel(limits.maxCr)}{!limits.allowFly ? ' · No fly' : ''}{!limits.allowSwim ? ' · No swim' : ''}
      </p>
    </section>
  )
}
