import { useState } from 'react'
import type { CharacterFeatureChoice, ClassFeature } from '../../types'
import { getFeatureChoiceDisplayMap } from '../../utils/featureChoices'

// Features that grant skill expertise (2 slots each)
const EXPERTISE_FEATURE_INDICES = new Set(['rogue-expertise', 'rogue-expertise-2', 'bard-expertise'])

interface ClassAbilitiesSectionProps {
  classFeatures: ClassFeature[]
  skillExpertise?: string[]
  featureChoices?: CharacterFeatureChoice[]
  allProficientSkills?: string[]
  totalExpertiseSlots?: number
  onToggleExpertise?: (skill: string) => void
  bare?: boolean
}

function deduplicateFeatures(features: ClassFeature[]): ClassFeature[] {
  // For modifier types that represent total values (not increments),
  // keep only the highest-min_level entry per unique modifier type.
  const replacementTypes = new Set(['sneak_attack_dice'])

  const kept: ClassFeature[] = []
  const replacementSeen = new Map<string, ClassFeature>()

  for (const f of features) {
    const replacementMods = f.modifiers.filter(m => replacementTypes.has(m.type))
    if (replacementMods.length > 0) {
      const key = replacementMods.map(m => m.type).sort().join(',')
      const existing = replacementSeen.get(key)
      if (!existing || f.min_level > existing.min_level) {
        replacementSeen.set(key, f)
      }
    } else {
      kept.push(f)
    }
  }

  return [...kept, ...replacementSeen.values()].sort((a, b) => a.min_level - b.min_level || a.name.localeCompare(b.name))
}

export function ClassAbilitiesSection({ classFeatures, skillExpertise = [], featureChoices = [], allProficientSkills = [], totalExpertiseSlots = 0, onToggleExpertise, bare }: ClassAbilitiesSectionProps) {
  const [cardOpen, setCardOpen] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  if (classFeatures.length === 0) return null

  const features = deduplicateFeatures(classFeatures)
  const choiceDisplayMap = getFeatureChoiceDisplayMap(featureChoices)

  const toggle = (index: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(index) ? next.delete(index) : next.add(index)
      return next
    })

  const featureCards = features.map(f => {
    const isOpen = expanded.has(f.index)
    return (
      <div key={f.index} className="rounded-xl overflow-hidden">
        <button
          onClick={() => toggle(f.index)}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-800 transition-colors text-left rounded-xl"
        >
          <span className="text-xs text-gray-500 w-6 flex-shrink-0">L{f.min_level}</span>
          <span className="flex-1 text-sm font-medium text-gray-100 truncate">{f.name}</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {f.subclass && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-amber-900/60 text-amber-400">sub</span>
            )}
            {f.resource_key && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-indigo-900/60 text-indigo-400">action</span>
            )}
            {!f.is_passive && !f.resource_key && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-green-900/60 text-green-400">active</span>
            )}
            <span className="text-gray-600 text-xs ml-1">{isOpen ? '▲' : '▼'}</span>
          </div>
        </button>
        <div className={`grid transition-all duration-300 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            {f.desc.length > 0 && (
              <div className="px-3 pb-3 pt-1 space-y-1.5">
                {f.desc.map((para, i) => (
                  <p key={i} className="text-xs text-gray-400 leading-relaxed">{para}</p>
                ))}
                {(choiceDisplayMap[f.index] ?? []).length > 0 && (
                  <div className="pt-1 space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-300">Selected</p>
                    {(choiceDisplayMap[f.index] ?? []).map(option => (
                      <p key={option} className="text-xs text-gray-300">- {option}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
            {EXPERTISE_FEATURE_INDICES.has(f.index) && onToggleExpertise && allProficientSkills.length > 0 && (
              <div className="px-3 pb-3 pt-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Choose proficient skills for expertise</span>
                  <span className={`text-xs font-semibold ${skillExpertise.length >= totalExpertiseSlots && totalExpertiseSlots > 0 ? 'text-amber-400' : 'text-gray-400'}`}>
                    {skillExpertise.length}/{totalExpertiseSlots}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {allProficientSkills.map(skill => {
                    const isSelected = skillExpertise.includes(skill)
                    const atLimit = skillExpertise.length >= totalExpertiseSlots && !isSelected
                    return (
                      <button
                        key={skill}
                        onClick={() => !atLimit && onToggleExpertise(skill)}
                        disabled={atLimit}
                        className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-cyan-900/60 border-cyan-500 text-cyan-300'
                            : atLimit
                            ? 'bg-gray-800/40 border-gray-700 text-gray-600 cursor-not-allowed'
                            : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-cyan-700 hover:text-cyan-300'
                        }`}
                      >
                        {isSelected && <span className="mr-1">✓</span>}{skill}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  })

  if (bare) return (
    <div className="space-y-1 p-4 pt-2">
      {featureCards}
    </div>
  )

  return (
    <section className="bg-gray-900 rounded-2xl p-4">
      <button
        onClick={() => setCardOpen(v => !v)}
        className="w-full flex items-center justify-between mb-2 group"
      >
        <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Class Abilities</h2>
        <span className={`text-gray-600 text-xs transition-transform duration-300 ${cardOpen ? 'rotate-0' : '-rotate-90'}`}>▼</span>
      </button>

      <div className={`grid transition-all duration-300 ${cardOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="space-y-1 pt-0.5">
            {featureCards}
          </div>
        </div>
      </div>
    </section>
  )
}
