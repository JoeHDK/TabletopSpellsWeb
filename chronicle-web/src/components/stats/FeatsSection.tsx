import { useNavigate } from 'react-router-dom'
import type { CharacterFeat } from '../../types'

interface FeatsSectionProps {
  charFeats: CharacterFeat[]
  characterId: string
  bare?: boolean
}

export function FeatsSection({ charFeats, characterId, bare }: FeatsSectionProps) {
  const navigate = useNavigate()

  if (bare) return (
    <div className="flex flex-wrap gap-1.5 p-4 pt-2">
      {charFeats.map(cf => (
        <span key={cf.id} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">
          🎯 {cf.name}
        </span>
      ))}
    </div>
  )

  if (charFeats.length === 0) return null
  return (
    <section className="bg-gray-900 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Active Feats</h2>
        <button
          onClick={() => navigate(`/characters/${characterId}/feats`)}
          className="text-xs text-indigo-400 hover:text-indigo-300"
        >
          Manage →
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {charFeats.map(cf => (
          <span key={cf.id} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">
            🎯 {cf.name}
          </span>
        ))}
      </div>
    </section>
  )
}
