import { useState } from 'react'
import type { ClassResource, EquipmentResource, ClassFeature } from '../../types'

const RESOURCE_DESCRIPTIONS: Record<string, { title: string; desc: string }> = {
  rage: {
    title: 'Rage',
    desc: 'While raging you have advantage on Strength checks and saving throws, bonus to melee damage, and resistance to bludgeoning, piercing, and slashing damage. You can\'t cast or concentrate on spells while raging.',
  },
  ki_points: {
    title: 'Ki Points',
    desc: 'Ki points fuel special monk abilities. You regain all spent ki points after a short or long rest. Ki save DC = 8 + proficiency bonus + Wisdom modifier.',
  },
  channel_divinity: {
    title: 'Channel Divinity',
    desc: 'Channel Divinity lets you harness divine energy to fuel magical effects. Each use expends one charge. You regain all uses after a short or long rest (Cleric) or after a short or long rest (Paladin at higher levels).',
  },
  divine_sense: {
    title: 'Divine Sense',
    desc: 'Until the end of your next turn you know the location of any celestial, fiend, or undead within 60 ft that is not behind total cover. You also know if a place or object has been consecrated or desecrated. Uses = 1 + Charisma modifier per long rest.',
  },
  lay_on_hands: {
    title: 'Lay on Hands',
    desc: 'Your blessed touch can heal wounds. A pool of hit points = 5 × Paladin level. As an action you can restore up to that many hit points (divided among creatures), or expend 5 points to cure one disease or neutralise one poison.',
  },
  cleansing_touch: {
    title: 'Cleansing Touch',
    desc: 'As an action you can end one spell on yourself or a willing creature by touch. Uses = Charisma modifier (minimum 1) per long rest.',
  },
  divine_intervention: {
    title: 'Divine Intervention',
    desc: 'You can call on your deity to intervene on your behalf. Roll a d100; if you roll equal to or lower than your Cleric level, your deity intervenes. Success resets after a long rest.',
  },
  sorcery_points: {
    title: 'Sorcery Points',
    desc: 'Sorcery points are the currency of your magical power. You can convert them to spell slots (Flexible Casting) or expend them for Metamagic options. You regain all spent sorcery points after a long rest.',
  },
  bardic_inspiration: {
    title: 'Bardic Inspiration',
    desc: 'As a bonus action, give a creature within 60 ft a Bardic Inspiration die (d6 at bard level 1, scaling up). The creature can add the die to one ability check, attack roll, or saving throw within 10 minutes. You regain uses on a short or long rest (College of Lore) or long rest.',
  },
  second_wind: {
    title: 'Second Wind',
    desc: 'As a bonus action you can regain hit points equal to 1d10 + your Fighter level. You must finish a short or long rest before using this again.',
  },
  action_surge: {
    title: 'Action Surge',
    desc: 'On your turn you can take one additional action. You must finish a short or long rest before using this again (two uses at Fighter level 17).',
  },
  indomitable: {
    title: 'Indomitable',
    desc: 'You can reroll a saving throw that you fail. You must use the new roll. You must finish a long rest before using this again (up to 3 uses at Fighter level 17).',
  },
  pact_magic_slots: {
    title: 'Pact Magic',
    desc: 'Your Warlock spell slots are recovered on a short or long rest. All slots are the same level (determined by Warlock level) and you have a limited number per rest.',
  },
  mystic_arcanum_6: { title: 'Mystic Arcanum (6th)', desc: 'Once per long rest you can cast a 6th-level Warlock spell without expending a spell slot.' },
  mystic_arcanum_7: { title: 'Mystic Arcanum (7th)', desc: 'Once per long rest you can cast a 7th-level Warlock spell without expending a spell slot.' },
  mystic_arcanum_8: { title: 'Mystic Arcanum (8th)', desc: 'Once per long rest you can cast an 8th-level Warlock spell without expending a spell slot.' },
  mystic_arcanum_9: { title: 'Mystic Arcanum (9th)', desc: 'Once per long rest you can cast a 9th-level Warlock spell without expending a spell slot.' },
  infusions: {
    title: 'Infusions',
    desc: 'Artificer infusions are magical upgrades you can embed in non-magical items over a long rest. You can only have a limited number of infused items active at once. An infusion ends when you die or re-infuse the item.',
  },
  arcane_firearm: {
    title: 'Arcane Firearm',
    desc: 'After a long rest you can use woodcarver\'s tools to inscribe a firearm or wand as your arcane firearm. When you cast an Artificer spell through it, you can add 1d8 to one of the spell\'s damage rolls.',
  },
}

interface ClassResourcesSectionProps {
  classResources: ClassResource[]
  equipmentResources: EquipmentResource[]
  classFeatures: ClassFeature[]
  characterLevel: number
  onResourceAction: (args: { action: 'use' | 'restore' | 'long-rest' | 'short-rest' | 'sync'; key?: string; amount?: number }) => void
  resourcePending: boolean
  onEquipResAction: (args: { action: 'use' | 'restore' | 'rest-short' | 'rest-long'; usageId?: string }) => void
  equipResPending: boolean
}

function bardicInspirationDie(level: number): string {
  if (level >= 15) return 'd12'
  if (level >= 10) return 'd10'
  if (level >= 5) return 'd8'
  return 'd6'
}

export function ClassResourcesSection({
  classResources,
  equipmentResources,
  classFeatures,
  characterLevel,
  onResourceAction,
  resourcePending,
  onEquipResAction,
  equipResPending,
}: ClassResourcesSectionProps) {
  const [resourceInfoKey, setResourceInfoKey] = useState<string | null>(null)

  if (classResources.length === 0 && equipmentResources.length === 0) return null

  return (
    <>
      {/* Class Resources */}
      {classResources.length > 0 && (
        <section className="bg-gray-900 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Class Resources</h2>
            <div className="flex gap-2">
              <button
                onClick={() => onResourceAction({ action: 'short-rest' })}
                disabled={resourcePending}
                className="text-xs px-2 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 disabled:opacity-40 transition-colors"
                title="Short Rest — restores short-rest resources"
              >
                ⏱ Short Rest
              </button>
              <button
                onClick={() => onResourceAction({ action: 'long-rest' })}
                disabled={resourcePending}
                className="text-xs px-2 py-1 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white disabled:opacity-40 transition-colors"
                title="Long Rest — restores all resources"
              >
                🌙 Long Rest
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {classResources.map((res: ClassResource) => {
              const subFeatures = classFeatures.filter(f => f.resource_key === res.resourceKey)
              return (
                <div key={res.resourceKey} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <button
                      className="flex-1 text-sm text-gray-200 text-left hover:text-indigo-300 transition-colors"
                      onClick={() => RESOURCE_DESCRIPTIONS[res.resourceKey] && setResourceInfoKey(res.resourceKey)}
                      title={RESOURCE_DESCRIPTIONS[res.resourceKey] ? 'Tap for description' : undefined}
                    >
                      {res.name}
                      {res.resourceKey === 'bardic_inspiration' && (
                        <span className="ml-1 text-indigo-400 text-xs">({bardicInspirationDie(characterLevel)})</span>
                      )}
                      {RESOURCE_DESCRIPTIONS[res.resourceKey] && (
                        <span className="ml-1 text-gray-600 text-xs">ℹ</span>
                      )}
                    </button>
                    <div className="flex items-center gap-1">
                      {res.isHpPool ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onResourceAction({ action: 'use', key: res.resourceKey, amount: 5 })}
                            disabled={res.usesRemaining <= 0 || resourcePending}
                            className="text-xs w-7 h-7 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white transition-colors"
                          >−5</button>
                          <span className="text-sm font-bold text-white w-16 text-center">
                            {res.usesRemaining}<span className="text-gray-500">/{res.maxUses}</span>
                          </span>
                          <button
                            onClick={() => onResourceAction({ action: 'restore', key: res.resourceKey, amount: 5 })}
                            disabled={res.usesRemaining >= res.maxUses || resourcePending}
                            className="text-xs w-7 h-7 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white transition-colors"
                          >+5</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onResourceAction({ action: 'use', key: res.resourceKey })}
                            disabled={res.usesRemaining <= 0 || resourcePending}
                            className="text-xs w-7 h-7 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white transition-colors"
                          >−</button>
                          <div className="flex gap-1">
                            {res.maxUses <= 10 ? (
                              Array.from({ length: res.maxUses }).map((_, i) => (
                                <span
                                  key={i}
                                  className={`w-3 h-3 rounded-full border-2 transition-colors ${i < res.usesRemaining ? 'bg-indigo-500 border-indigo-400' : 'border-gray-500'}`}
                                />
                              ))
                            ) : (
                              <span className="text-sm font-bold text-white">
                                {res.usesRemaining}<span className="text-gray-500">/{res.maxUses}</span>
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => onResourceAction({ action: 'restore', key: res.resourceKey })}
                            disabled={res.usesRemaining >= res.maxUses || resourcePending}
                            className="text-xs w-7 h-7 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white transition-colors"
                          >+</button>
                        </div>
                      )}
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${res.resetOn === 'short_rest' ? 'bg-amber-900/50 text-amber-400' : 'bg-indigo-900/50 text-indigo-400'}`}>
                      {res.resetOn === 'short_rest' ? 'Short' : 'Long'}
                    </span>
                  </div>
                  {subFeatures.length > 0 && (
                    <details className="group pl-2">
                      <summary className="cursor-pointer list-none text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                        <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                        {subFeatures.length} {subFeatures.length === 1 ? 'option' : 'options'}
                      </summary>
                      <div className="mt-1.5 space-y-1.5">
                        {subFeatures.map(f => (
                          <details key={f.index} className="group/inner">
                            <summary className="flex items-center gap-2 cursor-pointer list-none px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                              <span className="flex-1 text-xs text-gray-300">{f.name}</span>
                              <span className="text-gray-600 group-open/inner:rotate-90 transition-transform text-xs">▶</span>
                            </summary>
                            <div className="mt-1 px-2 pb-1 space-y-1">
                              {f.desc.map((p, i) => (
                                <p key={i} className="text-xs text-gray-400 leading-relaxed">{p}</p>
                              ))}
                            </div>
                          </details>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Equipment Resources */}
      {equipmentResources.length > 0 && (
        <section className="bg-gray-900 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Equipment Resources</h2>
          </div>
          <div className="space-y-3">
            {equipmentResources.map(res => {
              const dots = Array.from({ length: res.maxUses }, (_, i) => i < res.usesRemaining)
              return (
                <div key={res.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 truncate">{res.itemName}</p>
                      <p className="text-sm font-medium truncate">{res.abilityName}</p>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      res.resetOn === 'short_rest'
                        ? 'bg-amber-900/50 text-amber-300'
                        : 'bg-indigo-900/50 text-indigo-300'
                    }`}>
                      {res.resetOn === 'short_rest' ? 'Short' : 'Long'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEquipResAction({ action: 'use', usageId: res.id })}
                      disabled={res.usesRemaining === 0 || equipResPending}
                      className="text-xs px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30 transition-colors"
                    >Use</button>
                    <div className="flex gap-1 flex-wrap">
                      {dots.map((filled, i) => (
                        <span
                          key={i}
                          className={`w-3 h-3 rounded-full border transition-colors ${
                            filled ? 'bg-indigo-500 border-indigo-400' : 'bg-transparent border-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500 ml-auto">{res.usesRemaining}/{res.maxUses}</span>
                    {res.usesRemaining < res.maxUses && (
                      <button
                        onClick={() => onEquipResAction({ action: 'restore', usageId: res.id })}
                        disabled={equipResPending}
                        className="text-xs px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30 transition-colors"
                      >+1</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Resource description modal */}
      {resourceInfoKey && RESOURCE_DESCRIPTIONS[resourceInfoKey] && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4" onClick={() => setResourceInfoKey(null)}>
          <div className="bg-gray-900 rounded-2xl w-full max-w-lg p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-bold">{RESOURCE_DESCRIPTIONS[resourceInfoKey].title}</h2>
              <button onClick={() => setResourceInfoKey(null)} className="text-gray-400 hover:text-white text-xl leading-none shrink-0">✕</button>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{RESOURCE_DESCRIPTIONS[resourceInfoKey].desc}</p>
          </div>
        </div>
      )}
    </>
  )
}
