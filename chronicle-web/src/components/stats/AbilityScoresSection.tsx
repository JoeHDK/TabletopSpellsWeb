import { useState } from 'react'
import { getAbilityModStr } from '../../utils/abilityModifiers'
import type { Character, Race, UpdateCharacterRequest } from '../../types'
import { ABILITY_KEYS, ABILITY_SHORT } from './statsConstants'

const POINT_BUY_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 }
const POINT_BUY_BUDGET = 27

interface AbilityScoresSectionProps {
  character: Character
  race?: Race
  abilityScores: Record<string, number>
  getRacialBonus: (key: string) => number
  getAsiBonus: (key: string) => number
  patch: (fields: Partial<UpdateCharacterRequest & { currentHp?: number; maxHp?: number }>) => void
  bare?: boolean
}

export function AbilityScoresSection({
  character,
  race,
  abilityScores,
  getRacialBonus,
  getAsiBonus,
  patch,
  bare,
}: AbilityScoresSectionProps) {
  const [pointBuyMode, setPointBuyMode] = useState(false)
  const [abilityBreakdownKey, setAbilityBreakdownKey] = useState<string | null>(null)
  const [abilityScoreRaw, setAbilityScoreRaw] = useState<string>('')

  const totalAbilityScore = (key: string) =>
    (abilityScores[key] ?? 10) + getRacialBonus(key) + getAsiBonus(key)

  const scoresContent = (
    <>
      {pointBuyMode && character.gameType === 'dnd5e' && (() => {
        const pointsSpent = ABILITY_KEYS.reduce((sum, key) => {
          const base = Math.min(Math.max(abilityScores[key] ?? 8, 8), 15)
          return sum + (POINT_BUY_COST[base] ?? 0)
        }, 0)
        const pointsRemaining = POINT_BUY_BUDGET - pointsSpent
        return (
          <>
            <div className={`text-center text-xs font-semibold mb-2 ${pointsRemaining < 0 ? 'text-red-400' : pointsRemaining === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {pointsSpent} / {POINT_BUY_BUDGET} points used — {pointsRemaining} remaining
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {ABILITY_KEYS.map(key => {
                const base = Math.min(Math.max(abilityScores[key] ?? 8, 8), 15)
                const racial = getRacialBonus(key)
                const asi = getAsiBonus(key)
                const total = base + racial + asi
                const cost = POINT_BUY_COST[base] ?? 0
                const canIncrease = base < 15 && pointsRemaining >= ((POINT_BUY_COST[base + 1] ?? 9) - cost)
                const canDecrease = base > 8
                return (
                  <div key={key} className="bg-gray-800 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-gray-400 mb-0.5">{ABILITY_SHORT[key]}</p>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => canDecrease && patch({ abilityScores: { ...abilityScores, [key]: base - 1 } })}
                        disabled={!canDecrease}
                        className="w-5 h-5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-xs leading-none flex items-center justify-center"
                      >−</button>
                      <span className="text-sm font-bold w-6 text-center">{base}</span>
                      <button
                        onClick={() => canIncrease && patch({ abilityScores: { ...abilityScores, [key]: base + 1 } })}
                        disabled={!canIncrease}
                        className="w-5 h-5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-xs leading-none flex items-center justify-center"
                      >+</button>
                    </div>
                    <p className="text-[10px] text-indigo-400">{getAbilityModStr(total)}{racial !== 0 ? ` (${total})` : ''}</p>
                    <p className="text-[9px] text-gray-600">{cost}pt</p>
                  </div>
                )
              })}
            </div>
          </>
        )
      })()}
      {!pointBuyMode && (
        <div className="grid grid-cols-2 gap-1.5">
          {ABILITY_KEYS.map(key => {
            const total = totalAbilityScore(key)
            return (
              <button
                key={key}
                onClick={() => { setAbilityScoreRaw(String(abilityScores[key] ?? 10)); setAbilityBreakdownKey(key) }}
                className="bg-gray-800 hover:bg-gray-700 rounded-xl p-2 text-center transition-colors"
              >
                <p className="text-[10px] text-gray-400 mb-0.5">{ABILITY_SHORT[key]}</p>
                <p className="text-sm font-bold">{total}</p>
                <p className="text-[10px] text-indigo-400">{getAbilityModStr(total)}</p>
              </button>
            )
          })}
        </div>
      )}
    </>
  )

  const modal = abilityBreakdownKey && (() => {
    const key = abilityBreakdownKey
    const base = abilityScores[key] ?? 10
    const racial = getRacialBonus(key)
    const asi = getAsiBonus(key)
    const total = base + racial + asi
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setAbilityBreakdownKey(null)}>
        <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-xs" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">{key}</h3>
            <button onClick={() => setAbilityBreakdownKey(null)} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
          </div>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Base score</span>
              <input
                type="number" min={1} max={30}
                value={abilityScoreRaw}
                onChange={e => setAbilityScoreRaw(e.target.value)}
                onBlur={e => {
                  const n = parseInt(e.target.value, 10)
                  if (!e.target.value.trim() || isNaN(n)) {
                    const orig = character.abilityScores[key] ?? 10
                    setAbilityScoreRaw(String(orig))
                    patch({ abilityScores: { ...abilityScores, [key]: orig } })
                  } else {
                    const clamped = Math.max(1, Math.min(30, n))
                    setAbilityScoreRaw(String(clamped))
                    patch({ abilityScores: { ...abilityScores, [key]: clamped } })
                  }
                }}
                className="w-16 text-center bg-gray-800 rounded-lg px-2 py-1 border border-gray-700 text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            {racial !== 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Racial bonus{race ? ` (${race.name})` : ''}</span>
                <span className="text-emerald-400 font-semibold">{racial >= 0 ? `+${racial}` : racial}</span>
              </div>
            )}
            {asi !== 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Feat (ASI)</span>
                <span className="text-emerald-400 font-semibold">{asi >= 0 ? `+${asi}` : asi}</span>
              </div>
            )}
            <div className="border-t border-gray-700 pt-2 flex items-center justify-between font-bold">
              <span>Total</span>
              <span className="text-white text-base">{total} <span className="text-indigo-400 font-normal text-xs">({getAbilityModStr(total)})</span></span>
            </div>
          </div>
        </div>
      </div>
    )
  })()

  if (bare) return (
    <>
      <div>
        {character.gameType === 'dnd5e' && (
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setPointBuyMode(m => !m)}
              className={`text-[10px] px-2 py-0.5 rounded transition-colors ${pointBuyMode ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
            >Point Buy</button>
          </div>
        )}
        {scoresContent}
      </div>
      {modal}
    </>
  )

  return (
    <>
      <section className="bg-gray-900 rounded-2xl p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Ability Scores</h2>
          {character.gameType === 'dnd5e' && (
            <div className="flex gap-1">
              <button
                onClick={() => setPointBuyMode(m => !m)}
                className={`text-[10px] px-2 py-0.5 rounded transition-colors ${pointBuyMode ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
              >Point Buy</button>
            </div>
          )}
        </div>
        {scoresContent}
      </section>
      {modal}
    </>
  )
}
