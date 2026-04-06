import { useNavigate } from 'react-router-dom'
import { useLevelUpStore } from '../stores/levelUpStore'

/**
 * Sticky banner shown on Spells/Feats pages when a Level Up is in progress.
 * Prompts the user to return to the Stats page where the wizard will auto-reopen.
 */
export default function LevelUpBanner() {
  const navigate = useNavigate()
  const { isActive, pending } = useLevelUpStore()

  if (!isActive || !pending) return null

  const remaining = pending.newSpells.length + pending.newCantrips.length
  const levelLabel = pending.targetClass
    ? `${pending.targetClass} → Level ${pending.newClassLevel}`
    : 'Level Up in progress'
  const displayLabel = pending.targetClass ? `Level Up in progress — ${levelLabel}` : levelLabel

  return (
    <div className="sticky top-0 z-40 bg-indigo-900/95 border-b border-indigo-700 px-4 py-2.5 flex items-center justify-between gap-3 backdrop-blur-sm">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-indigo-300 text-lg flex-shrink-0">▲</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{displayLabel}</p>
          {remaining > 0 && (
            <p className="text-xs text-indigo-300">{remaining} spell{remaining !== 1 ? 's' : ''} selected so far</p>
          )}
        </div>
      </div>
      <button
        onClick={() => navigate(`/characters/${pending.characterId}/stats`)}
        className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
      >
        Return to Wizard
      </button>
    </div>
  )
}
