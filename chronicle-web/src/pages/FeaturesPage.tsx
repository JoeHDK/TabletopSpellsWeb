import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { classFeaturesApi } from '../api/classFeatures'
import { racesApi } from '../api/races'
import { charactersApi } from '../api/characters'
import type { ClassFeature, Race } from '../types'

export default function FeaturesPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: character, isLoading } = useQuery({
    queryKey: ['character', id],
    queryFn: () => charactersApi.get(id!),
    enabled: !!id,
  })

  const { data: classFeatures = [] } = useQuery({
    queryKey: ['class-features', character?.characterClass, character?.level, character?.subclass],
    queryFn: () => classFeaturesApi.getForCharacter(
      character!.characterClass,
      character!.level,
      character!.subclass !== 'None' ? character!.subclass?.toLowerCase() : undefined,
    ),
    enabled: !!character,
  })

  const { data: race } = useQuery<Race>({
    queryKey: ['race', character?.race],
    queryFn: () => racesApi.getOne(character!.race!),
    enabled: !!character?.race,
  })

  if (isLoading) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Loading…</div>
  if (!character) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Not found</div>

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(`/characters/${id}`)} aria-label="Go back" className="text-gray-400 hover:text-white">← Back</button>
        <h1 className="text-base font-semibold">Features & Traits</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4 pb-8">
        {/* ── Class Features ─────────────────────────────── */}
        {classFeatures.length > 0 && (
          <section className="bg-gray-900 rounded-2xl p-4">
            <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">
              {character.characterClass} Features
            </h2>
            <div className="space-y-1.5">
              {classFeatures.map((f: ClassFeature) => (
                <details key={f.index} className="group">
                  <summary className="flex items-center gap-2 cursor-pointer list-none px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                    <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${f.is_passive ? 'bg-blue-900/50 text-blue-300' : 'bg-gray-700 text-gray-400'}`}>
                      {f.is_passive ? 'Passive' : 'Active'}
                    </span>
                    <span className="flex-1 text-sm text-gray-200">{f.name}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0">Lv {f.min_level}</span>
                    <span className="text-gray-500 group-open:rotate-90 transition-transform text-xs flex-shrink-0">▶</span>
                  </summary>
                  <div className="mt-1 px-2 pb-2 space-y-1">
                    {f.desc.map((p, i) => (
                      <p key={i} className="text-xs text-gray-400 leading-relaxed">{p}</p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* ── Racial Traits ──────────────────────────────── */}
        {race && race.traits.length > 0 && (
          <section className="bg-gray-900 rounded-2xl p-4">
            <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">
              {race.name} Traits
            </h2>
            <div className="space-y-1.5">
              {race.traits.map(trait => (
                <details key={trait.name} className="group">
                  <summary className="flex items-center gap-2 cursor-pointer list-none px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-300 flex-shrink-0">Racial</span>
                    <span className="flex-1 text-sm text-gray-200">{trait.name}</span>
                    <span className="text-gray-500 group-open:rotate-90 transition-transform text-xs flex-shrink-0">▶</span>
                  </summary>
                  <div className="mt-1 px-2 pb-2">
                    <p className="text-xs text-gray-400 leading-relaxed">{trait.desc}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {classFeatures.length === 0 && (!race || race.traits.length === 0) && (
          <p className="text-center text-gray-500 text-sm pt-10">No features available for this character.</p>
        )}
      </main>
    </div>
  )
}
