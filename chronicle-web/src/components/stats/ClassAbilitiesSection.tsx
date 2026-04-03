import { useState } from 'react'
import type { ClassFeature } from '../../types'

interface ClassAbilitiesSectionProps {
  classFeatures: ClassFeature[]
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

export function ClassAbilitiesSection({ classFeatures }: ClassAbilitiesSectionProps) {
  const [cardOpen, setCardOpen] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  if (classFeatures.length === 0) return null

  const features = deduplicateFeatures(classFeatures)

  const toggle = (index: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(index) ? next.delete(index) : next.add(index)
      return next
    })

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
            {features.map(f => {
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
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
