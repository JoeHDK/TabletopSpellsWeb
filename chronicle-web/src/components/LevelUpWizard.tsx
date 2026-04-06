import React, { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { spellsApi, preparedSpellsApi } from '../api/spells'
import { characterFeatsApi } from '../api/characterFeats'
import { charactersApi } from '../api/characters'
import { featsApi } from '../api/feats'
import type { Character, CharacterClass, CharacterClassEntry, Spell, Feat, UpdateCharacterRequest } from '../types'
import { getExpectedSpellSlots } from '../utils/spellSlotsTable'
import { getLevelForClass, resolveClassName } from '../utils/spellUtils'
import { ABILITY_KEYS } from '../components/stats/statsConstants'
import {
  HIT_DIE, ASI_LEVELS, SUBCLASS_LEVEL, PREPARED_CASTERS, KNOWN_CASTERS,
  getCantripCount, getSpellsKnown,
} from '../utils/multiclassTables'

const SUBCLASSES: Record<string, string[]> = {
  Barbarian: ['BarbarianPathOfTheBerserker','BarbarianPathOfTheTotemWarrior','BarbarianPathOfTheWildMagic','BarbarianPathOfTheZealot','BarbarianPathOfTheAncestralGuardian','BarbarianPathOfTheRune','BarbarianPathOfTheBeast','BarbarianPathOfTheWildHunt'],
  Bard: ['BardCollegeOfLore','BardCollegeOfPerformance','BardCollegeOfGlamour','BardCollegeOfWhispers','BardCollegeOfSwords','BardCollegeOfEloquence','BardCollegeOfSpirits','BardCollegeOfPuppets'],
  Cleric: ['ClericAirDomain','ClericAnimalDomain','ClericArcanaDomain','ClericDeathDomain','ClericForgeDomain','ClericGraveDomain','ClericKnowledgeDomain','ClericLifeDomain','ClericLightDomain','ClericNatureDomain','ClericTempestDomain','ClericTrickeryDomain','ClericWarDomain','ClericTwilightDomain','ClericLoveDomain','ClericOrderDomain'],
  Druid: ['DruidCircleOfTheLand','DruidCircleOfTheMoon','DruidCircleOfSpores','DruidCircleOfDreams','DruidCircleOfTheShepherd','DruidCircleOfWildFire','DruidCircleOfStar','DruidCircleOfTheTaiga'],
  Fighter: ['FighterChampion','FighterBattleMaster','FighterEldritchKnight','FighterArcaneArcher','FighterCavalier','FighterRune','FighterPsiWarrior'],
  Monk: ['MonkWayOfTheOpenHand','MonkWayOfTheLongDeath','MonkWayOfTheFourElements','MonkWayOfShadow','MonkWayOfTheSunSoul','MonkWayOfMercy','MonkWayOfTheKensei','MonkWayOfTheAstralSelf'],
  Paladin: ['PaladinOathOfDevotion','PaladinOathOfTheAncients','PaladinOathOfVengeance','PaladinOathOfConquest','PaladinOathOfRedemption','PaladinOathOfTheeWatchers','PaladinOathOfTheCrown'],
  Ranger: ['RangerHunter','RangerBeastMaster','RangerGloomStalker','RangerFeyWanderer','RangerSwiftBlade','RangerMonsterSlayer'],
  Rogue: ['RogueAssassin','RogueThief','RogueTrickster','RogueArcaneConundrum','RogueSoulknife','RogueShadowdancer','RogueInquisitive','RogueSwashbuckler'],
  Sorcerer: ['SorcererDraconicBloodline','SorcererWildMagic','SorcererStormSorcery','SorcererShadowMagic','SorcererDivineSource','SorcererSessionOfTheClockworkSoul','SorcererAbberantMind'],
  Warlock: ['WarlockArchfey','WarlockFiend','WarlockGreatOldOne','WarlockCelestial','WarlockHexblade','WarlockUndying','WarlockGenies'],
  Wizard: ['WizardAbjuration','WizardConjuration','WizardDivination','WizardEnchantment','WizardEvocation','WizardIllusion','WizardNecromancy','WizardTransmutation','WizardChronoturgy','WizardGravityMastery','WizardWar','WizardBladesingers'],
  Artificer: ['ArtificerAlchemist','ArtificerArtillerist','ArtificerBattlesmith','ArtificerArmorer'],
}

function formatSubclass(value: string, cls: string): string {
  if (!value || value === 'None') return '—'
  const stripped = value.startsWith(cls) ? value.slice(cls.length) : value
  return stripped.replace(/([A-Z])/g, ' $1').trim()
}

// ── Snapshot type (stored in DB for Level Down) ──────────────────────────────

interface LevelDownSnapshot {
  prevLevel: number
  prevMaxHp: number
  prevClasses: CharacterClassEntry[] | null
  prevCharacterClass: CharacterClass
  prevSubclass: string
  prevMaxSpellsPerDay: Record<number, number>
  prevAbilityScores: Record<string, number>
  addedSpellIds: string[]
  addedCantripIds: string[]
  addedFeatId: string | null
}

// ── Wizard step types ────────────────────────────────────────────────────────

type WizardStepId =
  | 'choose-class'
  | 'gain-hp'
  | 'spell-slots-info'
  | 'pick-cantrips'
  | 'pick-spells'
  | 'subclass'
  | 'asi-or-feat'
  | 'summary'

interface WizardState {
  targetClassIdx: number
  targetClass: CharacterClass
  newClassLevel: number
  newTotalLevel: number
  // Gain HP
  hpGained: number
  // Spell picks
  pickedSpells: string[]
  pickedCantrips: string[]
  requiredSpellPicks: number
  requiredCantripPicks: number
  // ASI / Feat
  asiOrFeat: 'asi' | 'feat' | null
  asiChoices: Record<string, number>
  asiPointsLeft: number
  pickedFeat: Feat | null
  pickedFeatId: string | null
  // Subclass
  pickedSubclass: string | null
  // New spell slots (computed)
  newMaxSpellsPerDay: Record<number, number>
}

interface Props {
  character: Character
  characterId: string
  onClose: () => void
}

export default function LevelUpWizard({ character, characterId, onClose }: Props) {
  const qc = useQueryClient()

  // Determine starting class choices
  const effectiveClasses: CharacterClassEntry[] = useMemo(() => {
    if (character.classes && character.classes.length > 0) return character.classes
    return [{ characterClass: character.characterClass, subclass: character.subclass, level: character.level, cantripsKnown: 0 }]
  }, [character])

  // ── Wizard state ──────────────────────────────────────────────────
  const [step, setStep] = useState<WizardStepId>(
    effectiveClasses.length > 1 ? 'choose-class' : 'gain-hp'
  )
  const [state, setState] = useState<WizardState>(() => {
    const cls = effectiveClasses[0]
    const newClassLevel = cls.level + 1
    const newTotalLevel = character.level + 1
    return buildInitialState(0, cls, newClassLevel, newTotalLevel, character)
  })
  const [search, setSearch] = useState('')
  const [asiOrFeatChoice, setAsiOrFeatChoice] = useState<'asi' | 'feat' | null>(null)
  const [showLevelDown, setShowLevelDown] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Data queries ──────────────────────────────────────────────────
  const { data: allSpells = [] } = useQuery({
    queryKey: ['spells', character.gameType],
    queryFn: () => spellsApi.getAll(character.gameType),
  })
  const { data: preparedList = [] } = useQuery({
    queryKey: ['preparedSpells', characterId],
    queryFn: () => preparedSpellsApi.getAll(characterId),
  })
  const { data: allFeats = [] } = useQuery({
    queryKey: ['feats'],
    queryFn: () => featsApi.getAll(),
  })

  const knownSpellIds = useMemo(() => new Set(preparedList.map(p => p.spellId)), [preparedList])
  const existingFeatIndices = useMemo(() =>
    new Set(qc.getQueryData<{ featIndex: string }[]>(['character-feats', characterId])?.map(f => f.featIndex) ?? []),
    [qc, characterId]
  )

  // ── Step computation ──────────────────────────────────────────────
  const steps = useMemo(() => computeSteps(state, character, effectiveClasses), [state, character, effectiveClasses])
  const stepIdx = steps.indexOf(step)

  // ── Navigation ───────────────────────────────────────────────────
  const goNext = useCallback(() => {
    const nextStep = steps[stepIdx + 1]
    if (nextStep) setStep(nextStep)
  }, [steps, stepIdx])

  const goBack = useCallback(() => {
    const prevStep = steps[stepIdx - 1]
    if (prevStep) setStep(prevStep)
  }, [steps, stepIdx])

  // ── Mutations ────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (req: UpdateCharacterRequest) => charactersApi.update(characterId, req),
    onSuccess: (updated) => {
      qc.setQueryData<Character>(['character', characterId], updated)
      qc.invalidateQueries({ queryKey: ['character', characterId] })
    },
  })

  // ── Confirm / Submit ────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const snapshot: LevelDownSnapshot = {
        prevLevel: character.level,
        prevMaxHp: character.maxHp,
        prevClasses: character.classes ?? null,
        prevCharacterClass: character.characterClass,
        prevSubclass: character.subclass,
        prevMaxSpellsPerDay: character.maxSpellsPerDay,
        prevAbilityScores: character.abilityScores,
        addedSpellIds: state.pickedSpells,
        addedCantripIds: state.pickedCantrips,
        addedFeatId: null, // filled below
      }

      // Build updated classes array
      const newClasses = effectiveClasses.map((e, i) =>
        i === state.targetClassIdx
          ? {
              ...e,
              level: state.newClassLevel,
              subclass: state.pickedSubclass ?? e.subclass,
              cantripsKnown: getCantripCount(e.characterClass, state.newClassLevel),
            }
          : e
      )

      // Build character PATCH
      const charReq: UpdateCharacterRequest = {
        level: state.newTotalLevel,
        maxHp: character.maxHp + state.hpGained,
        classes: newClasses,
        maxSpellsPerDay: state.newMaxSpellsPerDay ?? character.maxSpellsPerDay,
      }
      // Sync primary characterClass/subclass when idx 0 gains a subclass
      if (state.targetClassIdx === 0 && state.pickedSubclass) {
        charReq.subclass = state.pickedSubclass
      }
      // ASI
      if (state.asiOrFeat === 'asi' && Object.keys(state.asiChoices).length > 0) {
        charReq.abilityScores = Object.fromEntries(
          Object.entries(character.abilityScores).map(([k, v]) => [k, v + (state.asiChoices[k] ?? 0)])
        )
      }

      // Cantrips & spells → add to prepared list
      const allSpellPicks = [...state.pickedSpells, ...state.pickedCantrips]
      for (const spellId of allSpellPicks) {
        const spell = allSpells.find(s => (s.id ?? s.name) === spellId)
        const isCantrip = spell?.spell_level === '0' || spell?.spell_level === 'Cantrip'
        await preparedSpellsApi.upsert(characterId, spellId, {
          spellId,
          isPrepared: isCantrip,
          isAlwaysPrepared: false,
          isFavorite: false,
          isDomainSpell: false,
        })
      }
      qc.invalidateQueries({ queryKey: ['preparedSpells', characterId] })

      // Feat
      if (state.asiOrFeat === 'feat' && state.pickedFeatId) {
        const featResult = await characterFeatsApi.add(characterId, { featIndex: state.pickedFeatId })
        snapshot.addedFeatId = featResult.id
        qc.invalidateQueries({ queryKey: ['character-feats', characterId] })
      }

      // Store snapshot and patch character
      charReq.lastLevelUpSnapshot = JSON.stringify(snapshot)
      await updateMutation.mutateAsync(charReq)

      onClose()
    } catch (e) {
      setError('Something went wrong. Please try again.')
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }, [character, state, effectiveClasses, characterId, allSpells, qc, updateMutation, onClose])

  // ── Level Down ───────────────────────────────────────────────────
  const handleLevelDown = useCallback(async () => {
    if (!character.lastLevelUpSnapshot) return
    setIsSubmitting(true)
    setError(null)
    try {
      const snap: LevelDownSnapshot = JSON.parse(character.lastLevelUpSnapshot)

      // Remove added spells/cantrips
      for (const spellId of [...snap.addedSpellIds, ...snap.addedCantripIds]) {
        await preparedSpellsApi.delete(characterId, spellId)
      }
      qc.invalidateQueries({ queryKey: ['preparedSpells', characterId] })

      // Remove added feat
      if (snap.addedFeatId) {
        await characterFeatsApi.remove(characterId, snap.addedFeatId)
        qc.invalidateQueries({ queryKey: ['character-feats', characterId] })
      }

      // Restore character state
      await updateMutation.mutateAsync({
        level: snap.prevLevel,
        maxHp: snap.prevMaxHp,
        classes: snap.prevClasses ?? undefined,
        characterClass: snap.prevCharacterClass,
        subclass: snap.prevSubclass,
        maxSpellsPerDay: snap.prevMaxSpellsPerDay,
        abilityScores: snap.prevAbilityScores,
        lastLevelUpSnapshot: '', // clears the snapshot
      })

      setShowLevelDown(false)
      onClose()
    } catch (e) {
      setError('Level Down failed. Please try again.')
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }, [character, characterId, qc, updateMutation, onClose])

  // ── Render ───────────────────────────────────────────────────────
  const canProceed = useMemo(() => canGoNext(step, state, asiOrFeatChoice), [step, state, asiOrFeatChoice])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 pt-5 pb-3 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">Level Up ▲</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">×</button>
          </div>
          {/* Progress bar */}
          <div className="flex gap-1">
            {steps.map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i < stepIdx ? 'bg-indigo-600' : i === stepIdx ? 'bg-indigo-400' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 'choose-class' && (
            <ChooseClassStep
              effectiveClasses={effectiveClasses}
              selectedIdx={state.targetClassIdx}
              onSelect={idx => {
                const cls = effectiveClasses[idx]
                const newClassLevel = cls.level + 1
                const newTotalLevel = character.level + 1
                setState(buildInitialState(idx, cls, newClassLevel, newTotalLevel, character))
              }}
            />
          )}

          {step === 'gain-hp' && (
            <GainHpStep
              targetClass={state.targetClass}
              conScore={character.abilityScores['Constitution'] ?? 10}
              hpGained={state.hpGained}
              onChange={hp => setState(s => ({ ...s, hpGained: hp }))}
            />
          )}

          {step === 'spell-slots-info' && (
            <SpellSlotsInfoStep
              targetClass={state.targetClass}
              prevLevel={effectiveClasses[state.targetClassIdx].level}
              newLevel={state.newClassLevel}
              prevSlots={character.maxSpellsPerDay}
              newSlots={state.newMaxSpellsPerDay ?? character.maxSpellsPerDay}
            />
          )}

          {step === 'pick-cantrips' && (
            <PickSpellsStep
              title="Pick Cantrip"
              instruction={`Choose ${state.requiredCantripPicks - state.pickedCantrips.length} cantrip${state.requiredCantripPicks - state.pickedCantrips.length !== 1 ? 's' : ''} for your ${state.targetClass}`}
              spells={allSpells.filter(s => {
                const isCantrip = s.spell_level === '0' || s.spell_level?.toLowerCase().includes('cantrip')
                const lvlForClass = getLevelForClass(s.spell_level, resolveClassName(state.targetClass))
                const forClass = isCantrip && lvlForClass === 0
                const notKnown = !knownSpellIds.has(s.id ?? s.name ?? '')
                const notPicked = !state.pickedCantrips.includes(s.id ?? s.name ?? '')
                return forClass && notKnown && notPicked
              })}
              picked={state.pickedCantrips}
              maxPicks={state.requiredCantripPicks}
              search={search}
              onSearchChange={setSearch}
              onToggle={spellId => {
                setState(s => {
                  const has = s.pickedCantrips.includes(spellId)
                  if (has) return { ...s, pickedCantrips: s.pickedCantrips.filter(x => x !== spellId) }
                  if (s.pickedCantrips.length >= s.requiredCantripPicks) return s
                  return { ...s, pickedCantrips: [...s.pickedCantrips, spellId] }
                })
              }}
            />
          )}

          {step === 'pick-spells' && (
            <PickSpellsStep
              title="Pick Spells"
              instruction={`Choose ${state.requiredSpellPicks - state.pickedSpells.length} spell${state.requiredSpellPicks - state.pickedSpells.length !== 1 ? 's' : ''} for your ${state.targetClass}`}
              spells={allSpells.filter(s => {
                const lvlForClass = getLevelForClass(s.spell_level, resolveClassName(state.targetClass))
                const isLeveled = lvlForClass !== null && lvlForClass > 0
                const notKnown = !knownSpellIds.has(s.id ?? s.name ?? '')
                const notPicked = !state.pickedSpells.includes(s.id ?? s.name ?? '')
                return isLeveled && notKnown && notPicked
              })}
              picked={state.pickedSpells}
              maxPicks={state.requiredSpellPicks}
              search={search}
              onSearchChange={setSearch}
              onToggle={spellId => {
                setState(s => {
                  const has = s.pickedSpells.includes(spellId)
                  if (has) return { ...s, pickedSpells: s.pickedSpells.filter(x => x !== spellId) }
                  if (s.pickedSpells.length >= s.requiredSpellPicks) return s
                  return { ...s, pickedSpells: [...s.pickedSpells, spellId] }
                })
              }}
            />
          )}

          {step === 'subclass' && (
            <SubclassStep
              targetClass={state.targetClass}
              picked={state.pickedSubclass}
              currentSubclass={effectiveClasses[state.targetClassIdx].subclass}
              onPick={sc => setState(s => ({ ...s, pickedSubclass: sc }))}
            />
          )}

          {step === 'asi-or-feat' && (
            <AsiOrFeatStep
              choice={asiOrFeatChoice}
              onChoiceChange={c => {
                setAsiOrFeatChoice(c)
                setState(s => ({ ...s, asiOrFeat: c, asiChoices: {}, asiPointsLeft: 2, pickedFeat: null, pickedFeatId: null }))
              }}
              asiChoices={state.asiChoices}
              asiPointsLeft={state.asiPointsLeft}
              abilityScores={character.abilityScores}
              onAsiChange={(key, delta) => {
                setState(s => {
                  const current = s.asiChoices[key] ?? 0
                  const newVal = Math.max(0, Math.min(2, current + delta))
                  const diff = newVal - current
                  if (diff > s.asiPointsLeft) return s
                  return {
                    ...s,
                    asiChoices: { ...s.asiChoices, [key]: newVal },
                    asiPointsLeft: s.asiPointsLeft - diff,
                  }
                })
              }}
              feats={allFeats.filter(f => !existingFeatIndices.has(f.index ?? f.name ?? ''))}
              pickedFeat={state.pickedFeat}
              search={search}
              onSearchChange={setSearch}
              onPickFeat={feat => setState(s => ({ ...s, pickedFeat: feat, pickedFeatId: feat.index ?? feat.name ?? '' }))}
            />
          )}

          {step === 'summary' && (
            <SummaryStep
              state={state}
              character={character}
              allSpells={allSpells}
              allFeats={allFeats}
            />
          )}

          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-3 border-t border-gray-800 flex-shrink-0 space-y-2">
          <div className="flex gap-2">
            {stepIdx > 0 && (
              <button
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors"
                onClick={goBack}
                disabled={isSubmitting}
              >
                ← Back
              </button>
            )}
            <div className="flex-1" />
            {step === 'summary' ? (
              <button
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-40"
                onClick={handleConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Confirming…' : 'Confirm Level Up ▲'}
              </button>
            ) : (
              <button
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
                onClick={goNext}
                disabled={!canProceed}
              >
                Next →
              </button>
            )}
          </div>

          {/* Level Down — only if snapshot exists */}
          {character.lastLevelUpSnapshot && !showLevelDown && (
            <button
              className="w-full text-xs text-gray-500 hover:text-red-400 transition-colors py-1"
              onClick={() => setShowLevelDown(true)}
            >
              ▼ Level Down (undo last level-up)
            </button>
          )}
          {showLevelDown && (
            <div className="bg-red-950/40 border border-red-700/50 rounded-xl p-3 space-y-2">
              <p className="text-xs text-red-300 font-medium">⚠️ Level Down is destructive and will revert all changes from the last Level Up.</p>
              <div className="flex gap-2">
                <button
                  className="flex-1 bg-red-700 hover:bg-red-600 text-white rounded-lg py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
                  onClick={handleLevelDown}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Reverting…' : 'Confirm Level Down ▼'}
                </button>
                <button
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded-lg py-1.5 text-xs font-medium transition-colors"
                  onClick={() => setShowLevelDown(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Helper functions ─────────────────────────────────────────────────────────

function getConMod(conScore: number) { return Math.floor((conScore - 10) / 2) }

function buildInitialState(
  idx: number,
  cls: CharacterClassEntry,
  newClassLevel: number,
  newTotalLevel: number,
  character: Character,
): WizardState {
  const die = HIT_DIE[cls.characterClass] ?? 8
  const conMod = getConMod(character.abilityScores['Constitution'] ?? 10)
  const avgHp = Math.floor(die / 2) + 1 + conMod

  const newSlots = getExpectedSpellSlots(cls.characterClass, newClassLevel)
  const prevSlots = getExpectedSpellSlots(cls.characterClass, cls.level)
  const mergedSlots = { ...character.maxSpellsPerDay }
  for (const [lvlStr, count] of Object.entries(newSlots)) {
    const lvl = parseInt(lvlStr)
    const prev = prevSlots[lvl] ?? 0
    const diff = count - prev
    if (diff > 0) mergedSlots[lvl] = (mergedSlots[lvl] ?? 0) + diff
  }

  // Cantrips
  const prevCantrips = getCantripCount(cls.characterClass, cls.level)
  const newCantrips = getCantripCount(cls.characterClass, newClassLevel)
  const cantripDiff = Math.max(0, newCantrips - prevCantrips)

  // Spells (known-casters only)
  let spellDiff = 0
  if (KNOWN_CASTERS.has(cls.characterClass)) {
    const prev = getSpellsKnown(cls.characterClass, cls.level) ?? 0
    const next = getSpellsKnown(cls.characterClass, newClassLevel) ?? 0
    spellDiff = Math.max(0, next - prev)
  }

  return {
    targetClassIdx: idx,
    targetClass: cls.characterClass,
    newClassLevel,
    newTotalLevel,
    hpGained: avgHp,
    pickedSpells: [],
    pickedCantrips: [],
    requiredSpellPicks: spellDiff,
    requiredCantripPicks: cantripDiff,
    asiOrFeat: null,
    asiChoices: {},
    asiPointsLeft: 2,
    pickedFeat: null,
    pickedFeatId: null,
    pickedSubclass: null,
    newMaxSpellsPerDay: mergedSlots,
  }
}

function computeSteps(state: WizardState, character: Character, effectiveClasses: CharacterClassEntry[]): WizardStepId[] {
  const steps: WizardStepId[] = []
  const cls = effectiveClasses[state.targetClassIdx]

  if (effectiveClasses.length > 1) steps.push('choose-class')
  steps.push('gain-hp')

  const isCaster = PREPARED_CASTERS.has(state.targetClass) || KNOWN_CASTERS.has(state.targetClass)
  const hasNewSlots = Object.keys(getExpectedSpellSlots(state.targetClass, state.newClassLevel)).some(lvl => {
    const newCount = getExpectedSpellSlots(state.targetClass, state.newClassLevel)[parseInt(lvl)] ?? 0
    const oldCount = getExpectedSpellSlots(state.targetClass, cls.level)[parseInt(lvl)] ?? 0
    return newCount > oldCount
  })
  if (isCaster && hasNewSlots) steps.push('spell-slots-info')
  if (state.requiredCantripPicks > 0) steps.push('pick-cantrips')
  if (state.requiredSpellPicks > 0) steps.push('pick-spells')

  // Subclass: only if current subclass is None and hitting the subclass level
  const currentSubclass = cls.subclass
  if (currentSubclass === 'None' && state.newClassLevel === SUBCLASS_LEVEL[state.targetClass]) {
    steps.push('subclass')
  }

  // ASI: check if newClassLevel is an ASI level
  const asiLevelsForClass = ASI_LEVELS[state.targetClass] ?? []
  if (asiLevelsForClass.includes(state.newClassLevel)) steps.push('asi-or-feat')

  steps.push('summary')
  return steps
}

function canGoNext(step: WizardStepId, state: WizardState, asiOrFeatChoice: 'asi' | 'feat' | null): boolean {
  if (step === 'gain-hp') return state.hpGained > 0
  if (step === 'pick-cantrips') return state.pickedCantrips.length >= state.requiredCantripPicks
  if (step === 'pick-spells') return state.pickedSpells.length >= state.requiredSpellPicks
  if (step === 'asi-or-feat') {
    if (!asiOrFeatChoice) return false
    if (asiOrFeatChoice === 'asi') return state.asiPointsLeft === 0
    return !!state.pickedFeatId
  }
  if (step === 'subclass') return !!state.pickedSubclass
  return true
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ChooseClassStep({ effectiveClasses, selectedIdx, onSelect }: {
  effectiveClasses: CharacterClassEntry[]
  selectedIdx: number
  onSelect: (idx: number) => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-300">Which class gains a level?</p>
      {effectiveClasses.map((e, i) => (
        <button
          key={e.characterClass}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-colors ${
            selectedIdx === i ? 'border-indigo-500 bg-indigo-900/30 text-white' : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
          }`}
          onClick={() => onSelect(i)}
        >
          <span className="font-medium">{e.characterClass}</span>
          <span className="text-gray-400">Level {e.level} → {e.level + 1}</span>
        </button>
      ))}
    </div>
  )
}

function GainHpStep({ targetClass, conScore, hpGained, onChange }: {
  targetClass: CharacterClass
  conScore: number
  hpGained: number
  onChange: (hp: number) => void
}) {
  const die = HIT_DIE[targetClass] ?? 8
  const conMod = getConMod(conScore)
  const avgHp = Math.floor(die / 2) + 1 + conMod

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Gain Hit Points</h3>
        <p className="text-xs text-gray-400">{targetClass} uses a d{die} hit die. CON modifier: {conMod >= 0 ? '+' : ''}{conMod}.</p>
      </div>
      <button
        className={`w-full py-3 rounded-xl border text-sm font-medium transition-colors ${hpGained === avgHp ? 'border-indigo-500 bg-indigo-900/30 text-white' : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'}`}
        onClick={() => onChange(avgHp)}
      >
        Take average: <span className="font-bold text-indigo-300">+{avgHp} HP</span>
        <span className="text-xs text-gray-500 ml-2">(⌊d{die}/2⌋+1 + {conMod >= 0 ? '+' : ''}{conMod})</span>
      </button>
      <div>
        <p className="text-xs text-gray-400 mb-1">Or enter manually:</p>
        <input
          type="number"
          min={1}
          max={die + Math.max(0, conMod)}
          value={hpGained}
          onChange={e => onChange(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-24 bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
        />
        <span className="text-xs text-gray-500 ml-2">HP gained (includes CON modifier)</span>
      </div>
    </div>
  )
}

function SpellSlotsInfoStep({ targetClass, prevLevel, newLevel, prevSlots, newSlots }: {
  targetClass: CharacterClass
  prevLevel: number
  newLevel: number
  prevSlots: Record<number, number>
  newSlots: Record<number, number>
}) {
  const rows: { level: number; prev: number; next: number; diff: number }[] = []
  const allLevels = new Set([...Object.keys(prevSlots), ...Object.keys(newSlots)].map(Number))
  allLevels.forEach(lvl => {
    const prev = prevSlots[lvl] ?? 0
    const next = newSlots[lvl] ?? 0
    if (prev > 0 || next > 0) rows.push({ level: lvl, prev, next, diff: next - prev })
  })
  rows.sort((a, b) => a.level - b.level)

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-white">Spell Slots Updated</h3>
        <p className="text-xs text-gray-400">
          {targetClass} level {prevLevel} → {newLevel}. Here's what changes:
        </p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500">
            <th className="text-left pb-1">Slot Level</th>
            <th className="text-center pb-1">Before</th>
            <th className="text-center pb-1">After</th>
            <th className="text-center pb-1">Change</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {rows.map(r => (
            <tr key={r.level} className="text-gray-300">
              <td className="py-1 text-gray-400">Level {r.level}</td>
              <td className="py-1 text-center">{r.prev}</td>
              <td className="py-1 text-center font-medium text-white">{r.next}</td>
              <td className={`py-1 text-center text-xs ${r.diff > 0 ? 'text-green-400' : r.diff < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                {r.diff > 0 ? `+${r.diff}` : r.diff < 0 ? `${r.diff}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {PREPARED_CASTERS.has(targetClass) && (
        <p className="text-xs text-indigo-300 bg-indigo-900/20 rounded-lg px-3 py-2">
          💡 {targetClass} is a prepared caster — manage your prepared spells on the Spells page after leveling up.
        </p>
      )}
    </div>
  )
}

function PickSpellsStep({ title, instruction, spells, picked, maxPicks, search, onSearchChange, onToggle }: {
  title: string
  instruction: string
  spells: Spell[]
  picked: string[]
  maxPicks: number
  search: string
  onSearchChange: (s: string) => void
  onToggle: (id: string) => void
}) {
  const filtered = spells.filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs text-gray-400">{instruction}</p>
        <p className="text-xs text-indigo-300 mt-1">{picked.length}/{maxPicks} selected</p>
      </div>
      <input
        type="text"
        placeholder="Search…"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
      />
      <div className="space-y-1 max-h-52 overflow-y-auto">
        {filtered.length === 0 && <p className="text-xs text-gray-500 py-2">No spells found.</p>}
        {filtered.slice(0, 60).map(s => {
          const id = s.id ?? s.name ?? ''
          const isSelected = picked.includes(id)
          const isDisabled = !isSelected && picked.length >= maxPicks
          return (
            <button
              key={id}
              disabled={isDisabled}
              onClick={() => onToggle(id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left ${
                isSelected ? 'bg-indigo-700/40 border border-indigo-500 text-white' : isDisabled ? 'bg-gray-800/50 border border-gray-700 text-gray-600' : 'bg-gray-800 border border-gray-700 text-gray-300 hover:border-gray-500'
              }`}
            >
              <span>{s.name}</span>
              <span className="text-gray-500 ml-2">Lv {s.spell_level === '0' ? 'C' : s.spell_level}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SubclassStep({ targetClass, picked, currentSubclass, onPick }: {
  targetClass: CharacterClass
  picked: string | null
  currentSubclass: string
  onPick: (subclass: string) => void
}) {
  const options = SUBCLASSES[targetClass] ?? []
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-white">Choose Subclass</h3>
        <p className="text-xs text-gray-400">{targetClass} — pick your specialization.</p>
        {currentSubclass !== 'None' && <p className="text-xs text-yellow-400">Current: {formatSubclass(currentSubclass, targetClass)}</p>}
      </div>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {options.map(s => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-colors ${
              picked === s ? 'border-indigo-500 bg-indigo-900/30 text-white font-medium' : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
            }`}
          >
            {formatSubclass(s, targetClass)}
          </button>
        ))}
      </div>
    </div>
  )
}

function AsiOrFeatStep({ choice, onChoiceChange, asiChoices, asiPointsLeft, abilityScores, onAsiChange, feats, pickedFeat, search, onSearchChange, onPickFeat }: {
  choice: 'asi' | 'feat' | null
  onChoiceChange: (c: 'asi' | 'feat') => void
  asiChoices: Record<string, number>
  asiPointsLeft: number
  abilityScores: Record<string, number>
  onAsiChange: (key: string, delta: number) => void
  feats: Feat[]
  pickedFeat: Feat | null
  search: string
  onSearchChange: (s: string) => void
  onPickFeat: (feat: Feat) => void
}) {
  const filteredFeats = feats.filter(f => !search || f.name?.toLowerCase().includes(search.toLowerCase()))
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white">Ability Score Improvement or Feat</h3>
      <div className="flex gap-2">
        <button
          className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${choice === 'asi' ? 'border-indigo-500 bg-indigo-900/30 text-white' : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'}`}
          onClick={() => onChoiceChange('asi')}
        >+2 Ability Score</button>
        <button
          className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${choice === 'feat' ? 'border-indigo-500 bg-indigo-900/30 text-white' : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'}`}
          onClick={() => onChoiceChange('feat')}
        >Take a Feat</button>
      </div>

      {choice === 'asi' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">Distribute {asiPointsLeft} point{asiPointsLeft !== 1 ? 's' : ''} remaining.</p>
          {ABILITY_KEYS.map(key => {
            const current = abilityScores[key] ?? 10
            const bonus = asiChoices[key] ?? 0
            return (
              <div key={key} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-300 w-28">{key}</span>
                <span className="text-sm text-gray-400">{current}</span>
                <div className="flex items-center gap-2">
                  <button
                    className="text-gray-400 hover:text-white w-6 h-6 flex items-center justify-center rounded bg-gray-700 text-sm disabled:opacity-30"
                    onClick={() => onAsiChange(key, -1)}
                    disabled={bonus === 0}
                  >−</button>
                  <span className={`w-6 text-center text-sm font-bold ${bonus > 0 ? 'text-green-400' : 'text-gray-500'}`}>{bonus > 0 ? `+${bonus}` : '—'}</span>
                  <button
                    className="text-gray-400 hover:text-white w-6 h-6 flex items-center justify-center rounded bg-gray-700 text-sm disabled:opacity-30"
                    onClick={() => onAsiChange(key, 1)}
                    disabled={asiPointsLeft === 0 || bonus >= 2}
                  >+</button>
                </div>
                <span className={`text-sm font-medium w-8 text-right ${bonus > 0 ? 'text-green-300' : 'text-gray-500'}`}>{current + bonus}</span>
              </div>
            )
          })}
        </div>
      )}

      {choice === 'feat' && (
        <div className="space-y-2">
          {pickedFeat && (
            <div className="bg-indigo-900/30 border border-indigo-600/50 rounded-lg px-3 py-2 text-xs text-indigo-200">
              ✓ {pickedFeat.name}
            </div>
          )}
          <input
            type="text"
            placeholder="Search feats…"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
          />
          <div className="space-y-1 max-h-44 overflow-y-auto">
            {filteredFeats.slice(0, 60).map(f => {
              const isPicked = pickedFeat?.index === f.index
              return (
                <button
                  key={f.index ?? f.name}
                  onClick={() => onPickFeat(f)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                    isPicked ? 'border-indigo-500 bg-indigo-900/30 text-white' : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  {f.name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryStep({ state, character, allSpells, allFeats }: {
  state: WizardState
  character: Character
  allSpells: Spell[]
  allFeats: Feat[]
}) {
  const resolvedSpells = state.pickedSpells.map(id => allSpells.find(s => (s.id ?? s.name) === id)?.name ?? id)
  const resolvedCantrips = state.pickedCantrips.map(id => allSpells.find(s => (s.id ?? s.name) === id)?.name ?? id)
  const featName = state.pickedFeat?.name ?? (state.pickedFeatId ? allFeats.find(f => f.index === state.pickedFeatId)?.name : null)

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white">Summary</h3>
      <p className="text-xs text-gray-400">Review your choices before confirming.</p>

      <div className="space-y-2 text-sm">
        <SummaryRow label="Class Level" value={`${state.targetClass} ${state.newClassLevel - 1} → ${state.newClassLevel}`} />
        <SummaryRow label="Total Level" value={`${character.level} → ${state.newTotalLevel}`} />
        <SummaryRow label="Max HP" value={`${character.maxHp} → ${character.maxHp + state.hpGained} (+${state.hpGained})`} highlight />
        {resolvedCantrips.length > 0 && <SummaryRow label="New Cantrips" value={resolvedCantrips.join(', ')} />}
        {resolvedSpells.length > 0 && <SummaryRow label="New Spells" value={resolvedSpells.join(', ')} />}
        {state.pickedSubclass && <SummaryRow label="Subclass" value={state.pickedSubclass} highlight />}
        {state.asiOrFeat === 'asi' && Object.keys(state.asiChoices).length > 0 && (
          <SummaryRow label="ASI" value={
            Object.entries(state.asiChoices)
              .filter(([, v]) => v > 0)
              .map(([k, v]) => `${k} +${v}`)
              .join(', ')
          } highlight />
        )}
        {featName && <SummaryRow label="New Feat" value={featName} highlight />}
      </div>
    </div>
  )
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex gap-2 justify-between py-1.5 border-b border-gray-800 last:border-0">
      <span className="text-gray-400 text-xs">{label}</span>
      <span className={`text-xs font-medium ${highlight ? 'text-indigo-300' : 'text-gray-200'}`}>{value}</span>
    </div>
  )
}
