import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '../api/characters'
import { racesApi } from '../api/races'
import { backgroundsApi, type Background } from '../api/backgrounds'
import { featsApi } from '../api/feats'
import { characterFeatsApi } from '../api/characterFeats'
import { spellsApi, preparedSpellsApi } from '../api/spells'
import FeatureChoicePicker from '../components/FeatureChoicePicker'
import type { CharacterClass, Feat, FeatPrerequisite, Race, Spell } from '../types'
import { getExpectedSpellSlots } from '../utils/spellSlotsTable'
import {
  HIT_DIE, SUBCLASS_LEVEL, KNOWN_CASTERS, MAX_SPELL_LEVEL_TABLE,
  getCantripCount, getSpellsKnown,
  CLASS_SKILL_LIST, ALL_DND5E_SKILLS,
  CLASS_STARTING_SKILL_COUNT, CLASS_STARTING_SAVING_THROWS,
  SUBCLASSES, formatSubclass,
} from '../utils/multiclassTables'
import { getAbilityModStr } from '../utils/abilityModifiers'
import {
  applyFeatureChoiceSelections,
  getFeatureChoiceDefinitions,
  withDynamicFeatureChoiceOptions,
} from '../utils/featureChoices'
import { getLevelForClass, resolveClassName } from '../utils/spellUtils'

// ── Constants ────────────────────────────────────────────────────────────────

const DND5E_CLASSES: CharacterClass[] = [
  'Artificer', 'Barbarian', 'Bard', 'Cleric', 'Druid',
  'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue',
  'Sorcerer', 'Warlock', 'Wizard',
]

const ABILITY_KEYS = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma']

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8]

const POINT_BUY_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 }

const WIZARD_STARTING_SPELLS = 6

// ── Step types ────────────────────────────────────────────────────────────────

type StepId =
  | 'choose-class'
  | 'choose-race'
  | 'ability-scores'
  | 'race-choices'
  | 'pick-background'
  | 'pick-skills'
  | 'pick-cantrips'
  | 'pick-spells'
  | 'subclass'
  | 'feature-choices'
  | 'enter-name'
  | 'summary'

const STEP_LABELS: Record<StepId, string> = {
  'choose-class': 'Class',
  'choose-race': 'Race',
  'ability-scores': 'Scores',
  'race-choices': 'Race Choices',
  'pick-background': 'Background',
  'pick-skills': 'Skills',
  'pick-cantrips': 'Cantrips',
  'pick-spells': 'Spells',
  'subclass': 'Subclass',
  'feature-choices': 'Choices',
  'enter-name': 'Name',
  'summary': 'Review',
}

// ── State ─────────────────────────────────────────────────────────────────────

interface CreationState {
  characterClass: CharacterClass
  race: Race | null
  raceAsiChoices: Record<string, number>
  raceSkillChoices: string[]
  raceFeatId: string | null
  abilityMode: 'pointbuy' | 'standard' | 'manual'
  baseScores: Record<string, number>
  standardAssignments: Record<string, number | null>
  background: Background | null
  pickedSkills: string[]
  pickedCantrips: string[]
  pickedSpells: string[]
  subclass: string | null
  featureChoices: Record<string, string[]>
  name: string
}

function defaultState(): CreationState {
  return {
    characterClass: 'Fighter',
    race: null,
    raceAsiChoices: {},
    raceSkillChoices: [],
    raceFeatId: null,
    abilityMode: 'pointbuy',
    baseScores: Object.fromEntries(ABILITY_KEYS.map(k => [k, 8])),
    standardAssignments: Object.fromEntries(ABILITY_KEYS.map(k => [k, null as number | null])),
    background: null,
    pickedSkills: [],
    pickedCantrips: [],
    pickedSpells: [],
    subclass: null,
    featureChoices: {},
    name: '',
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CLASS_ARMOR_PROFICIENCIES: Record<CharacterClass, string[]> = {
  Artificer: ['Light Armor', 'Medium Armor', 'Shield'],
  Barbarian: ['Light Armor', 'Medium Armor', 'Shield'],
  Bard: ['Light Armor'],
  Cleric: ['Light Armor', 'Medium Armor', 'Shield'],
  Druid: ['Light Armor', 'Medium Armor', 'Shield'],
  Fighter: ['Light Armor', 'Medium Armor', 'Heavy Armor', 'Shield'],
  Monk: [],
  Paladin: ['Light Armor', 'Medium Armor', 'Heavy Armor', 'Shield'],
  Ranger: ['Light Armor', 'Medium Armor', 'Shield'],
  Rogue: ['Light Armor'],
  Sorcerer: [],
  Warlock: ['Light Armor'],
  Wizard: [],
}

function getRaceAbilityChoiceCount(race: Race): number {
  const mod = race.modifiers.find(m => m.type === 'ability_score_choice')
  if (!mod) return 0
  return mod.condition === 'choose_2' ? 2 : 1
}

function getRaceSkillChoiceCount(race: Race): number {
  const mod = race.modifiers.find(m => m.type === 'skill_choice')
  if (!mod) return 0
  return mod.condition === 'choose_2' ? 2 : 1
}

function getRaceAbilityChoiceOptions(race: Race): string[] {
  const fixedAbilities = new Set(
    race.modifiers
      .filter(m => m.type === 'ability_score' && m.ability && m.ability.trim() !== '')
      .map(m => m.ability as string),
  )
  return ABILITY_KEYS.filter(ability => !fixedAbilities.has(ability))
}

function hasRaceSkillChoice(race: Race): boolean {
  return getRaceSkillChoiceCount(race) > 0
}

function hasRaceFeatChoice(race: Race): boolean {
  return race.index === 'variant-human'
}

function hasRaceChoices(race: Race): boolean {
  return getRaceAbilityChoiceCount(race) > 0 || hasRaceSkillChoice(race) || hasRaceFeatChoice(race)
}

function buildRaceChoices(state: CreationState): Record<string, number> {
  const choices = { ...state.raceAsiChoices }
  for (const skill of state.raceSkillChoices) choices[skill] = 1
  return choices
}

function meetsFeatPrerequisite(
  prerequisite: FeatPrerequisite,
  finalScores: Record<string, number>,
  proficiencies: Set<string>,
): boolean {
  if (prerequisite.type === 'ability_score') {
    if (!prerequisite.ability || prerequisite.minimum_score == null) return true
    return (finalScores[prerequisite.ability] ?? 0) >= prerequisite.minimum_score
  }
  if (prerequisite.type === 'proficiency') {
    return prerequisite.proficiency ? proficiencies.has(prerequisite.proficiency) : true
  }
  return true
}

function isFeatQualified(feat: Feat, state: CreationState, finalScores: Record<string, number>): boolean {
  if (feat.index === 'ability-score-improvement') return false
  if (feat.required_class && feat.required_class.toLowerCase() !== state.characterClass.toLowerCase()) return false
  if (feat.required_subclass) {
    if (!state.subclass) return false
    if (feat.required_subclass.toLowerCase() !== state.subclass.toLowerCase()) return false
  }
  if ((feat.required_min_level ?? 1) > 1) return false

  const proficiencies = new Set(CLASS_ARMOR_PROFICIENCIES[state.characterClass] ?? [])
  return feat.prerequisites.every(prerequisite => meetsFeatPrerequisite(prerequisite, finalScores, proficiencies))
}

function needsSpellPick(cls: CharacterClass): boolean {
  if (KNOWN_CASTERS.has(cls)) return (getSpellsKnown(cls, 1) ?? 0) > 0
  return cls === 'Wizard'
}

function startingSpellCount(cls: CharacterClass): number {
  if (KNOWN_CASTERS.has(cls)) return getSpellsKnown(cls, 1) ?? 0
  if (cls === 'Wizard') return WIZARD_STARTING_SPELLS
  return 0
}

function findSpellIdByName(spells: Spell[], name: string): string | null {
  const match = spells.find(spell => spell.name?.toLowerCase() === name.toLowerCase())
  return match ? (match.id ?? match.name ?? null) : null
}

function computeSteps(state: CreationState): StepId[] {
  const steps: StepId[] = ['choose-class', 'choose-race', 'ability-scores', 'pick-background', 'pick-skills']
  if (getCantripCount(state.characterClass, 1) > 0) steps.push('pick-cantrips')
  if (needsSpellPick(state.characterClass)) steps.push('pick-spells')
  if (SUBCLASS_LEVEL[state.characterClass] === 1) steps.push('subclass')
  if (state.race && hasRaceChoices(state.race)) steps.push('race-choices')
  if (getFeatureChoiceDefinitions({ targetClass: state.characterClass, subclass: state.subclass, level: 1, previousLevel: 0 }).length > 0) {
    steps.push('feature-choices')
  }
  steps.push('enter-name', 'summary')
  return steps
}

function getFinalScores(state: CreationState): Record<string, number> {
  const base =
    state.abilityMode === 'standard'
      ? Object.fromEntries(ABILITY_KEYS.map(k => [k, state.standardAssignments[k] ?? 8]))
      : { ...state.baseScores }
  const result = { ...base }
  if (state.race) {
    for (const mod of state.race.modifiers) {
      if (mod.ability && mod.ability.trim() !== '') {
        result[mod.ability] = (result[mod.ability] ?? 10) + mod.value
      }
    }
    for (const [ability, bonus] of Object.entries(state.raceAsiChoices)) {
      result[ability] = (result[ability] ?? 10) + bonus
    }
  }
  return result
}

function canGoNext(stepId: StepId, state: CreationState): boolean {
  switch (stepId) {
    case 'choose-class': return true
    case 'choose-race': return true
    case 'race-choices': {
      if (!state.race) return true
      const abilityChoicesComplete = Object.keys(state.raceAsiChoices).length >= getRaceAbilityChoiceCount(state.race)
      const skillChoiceComplete = state.raceSkillChoices.length >= getRaceSkillChoiceCount(state.race)
      const featChoiceComplete = !hasRaceFeatChoice(state.race) || !!state.raceFeatId
      return abilityChoicesComplete && skillChoiceComplete && featChoiceComplete
    }
    case 'ability-scores':
      if (state.abilityMode === 'standard')
        return Object.values(state.standardAssignments).every(v => v !== null)
      return true
    case 'pick-background': return true
    case 'pick-skills':
      return state.pickedSkills.length >= CLASS_STARTING_SKILL_COUNT[state.characterClass]
    case 'pick-cantrips':
      return state.pickedCantrips.length >= getCantripCount(state.characterClass, 1)
    case 'pick-spells':
      return state.pickedSpells.length >= startingSpellCount(state.characterClass)
    case 'subclass': return !!state.subclass
    case 'feature-choices': return true
    case 'enter-name': return state.name.trim().length > 0
    default: return true
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PointBuyPanel({ scores, onChange }: {
  scores: Record<string, number>
  onChange: (s: Record<string, number>) => void
}) {
  const totalSpent = ABILITY_KEYS.reduce((sum, k) => sum + (POINT_BUY_COST[scores[k]] ?? 0), 0)
  const remaining = 27 - totalSpent
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Point Buy (27 pts)</p>
        <span className={`text-sm font-bold ${remaining === 0 ? 'text-green-400' : remaining < 0 ? 'text-red-400' : 'text-indigo-300'}`}>
          {remaining} left
        </span>
      </div>
      {ABILITY_KEYS.map(ability => {
        const score = scores[ability]
        const cost = POINT_BUY_COST[score] ?? 0
        const canDec = score > 8
        const canInc = score < 15 && remaining >= ((POINT_BUY_COST[score + 1] ?? 0) - cost)
        return (
          <div key={ability} className="flex items-center gap-2">
            <span className="text-sm text-gray-300 w-24 shrink-0">{ability.slice(0, 3).toUpperCase()}</span>
            <button
              onClick={() => canDec && onChange({ ...scores, [ability]: score - 1 })}
              disabled={!canDec}
              className="w-7 h-7 rounded-lg border border-gray-700 text-gray-300 hover:border-indigo-500 disabled:opacity-30 text-sm"
            >−</button>
            <span className="w-8 text-center text-white font-bold">{score}</span>
            <button
              onClick={() => canInc && onChange({ ...scores, [ability]: score + 1 })}
              disabled={!canInc}
              className="w-7 h-7 rounded-lg border border-gray-700 text-gray-300 hover:border-indigo-500 disabled:opacity-30 text-sm"
            >+</button>
            <span className="text-xs text-gray-500 ml-1">({cost} pts)</span>
            <span className="text-xs text-gray-400 ml-auto">{getAbilityModStr(score)}</span>
          </div>
        )
      })}
    </div>
  )
}

function StandardArrayPanel({ assignments, onChange }: {
  assignments: Record<string, number | null>
  onChange: (a: Record<string, number | null>) => void
}) {
  const usedValues = Object.values(assignments).filter(v => v !== null) as number[]
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-white">Standard Array</p>
        <div className="flex gap-2 mt-1 flex-wrap">
          {STANDARD_ARRAY.map(v => (
            <span key={v} className={`px-2 py-0.5 rounded text-sm font-bold border ${usedValues.includes(v) ? 'border-gray-700 text-gray-600' : 'border-indigo-600 text-indigo-300'}`}>{v}</span>
          ))}
        </div>
      </div>
      {ABILITY_KEYS.map(ability => (
        <div key={ability} className="flex items-center gap-2">
          <span className="text-sm text-gray-300 w-24 shrink-0">{ability.slice(0, 3).toUpperCase()}</span>
          <select
            value={assignments[ability] ?? ''}
            onChange={e => {
              const newVal = e.target.value ? parseInt(e.target.value) : null
              const updated = { ...assignments }
              if (newVal !== null) {
                for (const k of ABILITY_KEYS) {
                  if (updated[k] === newVal) updated[k] = null
                }
              }
              updated[ability] = newVal
              onChange(updated)
            }}
            className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-1.5 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
          >
            <option value="">— Pick —</option>
            {STANDARD_ARRAY.map(v => (
              <option key={v} value={v} disabled={usedValues.includes(v) && assignments[ability] !== v}>{v}</option>
            ))}
          </select>
          {assignments[ability] !== null && (
            <span className="text-xs text-gray-400 w-8">{getAbilityModStr(assignments[ability]!)}</span>
          )}
        </div>
      ))}
    </div>
  )
}

function SpellPickList({ spells, picked, maxPicks, search, onSearchChange, onToggle }: {
  spells: Spell[]
  picked: string[]
  maxPicks: number
  search: string
  onSearchChange: (s: string) => void
  onToggle: (id: string) => void
}) {
  const filtered = spells.filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()))
  return (
    <>
      <p className="text-xs text-indigo-300">{picked.length}/{maxPicks} chosen</p>
      <input
        type="text"
        placeholder="Search…"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
      />
      <div className="space-y-1 max-h-52 overflow-y-auto">
        {filtered.length === 0 && <p className="text-xs text-gray-500 py-2">No spells found.</p>}
        {filtered.slice(0, 80).map(s => {
          const id = s.id ?? s.name ?? ''
          const isSelected = picked.includes(id)
          const disabled = !isSelected && picked.length >= maxPicks
          return (
            <button
              key={id}
              disabled={disabled}
              onClick={() => onToggle(id)}
              className={`w-full flex justify-between px-3 py-2 rounded-xl border text-xs transition-colors ${
                isSelected ? 'border-indigo-500 bg-indigo-900/30 text-white' : disabled ? 'border-gray-700/40 text-gray-600 cursor-not-allowed bg-gray-800/30' : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
              }`}
            >
              <span>{s.name}</span>
              {s.spell_level !== '0' && <span className="text-gray-500">Lv {s.spell_level}</span>}
            </button>
          )
        })}
      </div>
    </>
  )
}

function FeatPickList({ feats, pickedId, search, onSearchChange, onPick }: {
  feats: Feat[]
  pickedId: string | null
  search: string
  onSearchChange: (s: string) => void
  onPick: (id: string) => void
}) {
  const filtered = feats.filter(f => !search || f.name?.toLowerCase().includes(search.toLowerCase()))
  return (
    <>
      {pickedId && (
        <p className="text-xs text-indigo-300">
          Selected: <span className="font-medium">{feats.find(f => f.index === pickedId)?.name ?? pickedId}</span>
        </p>
      )}
      <input
        type="text"
        placeholder="Search feats…"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
      />
      <div className="space-y-1 max-h-56 overflow-y-auto">
        {filtered.length === 0 && <p className="text-xs text-gray-500 py-2">No qualified feats found.</p>}
        {filtered.slice(0, 60).map(feat => {
          const isSelected = pickedId === feat.index
          return (
            <button
              key={feat.index}
              onClick={() => onPick(feat.index)}
              className={`w-full text-left px-3 py-2 rounded-xl border text-xs transition-colors ${
                isSelected ? 'border-indigo-500 bg-indigo-900/30 text-white' : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
              }`}
            >
              <div className="font-medium">{feat.name}</div>
              {feat.prerequisites.length > 0 && (
                <div className="mt-1 text-[11px] text-gray-400">
                  Requires: {feat.prerequisites.map(p =>
                    p.type === 'ability_score' ? `${p.ability} ${p.minimum_score}+` : p.proficiency ?? p.ability ?? p.type,
                  ).join(', ')}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CharacterCreationPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [state, setState] = useState<CreationState>(defaultState)
  const [stepId, setStepId] = useState<StepId>('choose-class')
  const [spellSearch, setSpellSearch] = useState('')
  const [cantripSearch, setCantripSearch] = useState('')
  const [featSearch, setFeatSearch] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const steps = useMemo(() => computeSteps(state), [state])
  const stepIdx = useMemo(() => {
    const i = steps.indexOf(stepId)
    return i >= 0 ? i : 0
  }, [steps, stepId])
  const step = steps[stepIdx]

  // Queries
  const { data: allRaces = [] } = useQuery({ queryKey: ['races'], queryFn: () => racesApi.getAll() })
  const { data: allBackgrounds = [] } = useQuery({ queryKey: ['backgrounds'], queryFn: backgroundsApi.getAll })
  const { data: allFeats = [] } = useQuery({
    queryKey: ['feats'],
    queryFn: () => featsApi.getAll(),
    staleTime: Infinity,
  })
  const { data: allSpells = [] } = useQuery({
    queryKey: ['spells', 'dnd5e'],
    queryFn: () => spellsApi.getAll('dnd5e'),
    staleTime: Infinity,
  })

  const maxSpellLevel = MAX_SPELL_LEVEL_TABLE[state.characterClass]?.[0] ?? 1

  const classCantrips = useMemo(() => {
    const cls = resolveClassName(state.characterClass)
    return allSpells.filter(s => {
      const lvl = getLevelForClass(s.spell_level, cls)
      return lvl === 0
    })
  }, [allSpells, state.characterClass])

  const classSpells = useMemo(() => {
    const cls = resolveClassName(state.characterClass)
    return allSpells.filter(s => {
      const lvl = getLevelForClass(s.spell_level, cls)
      return lvl !== null && lvl > 0 && lvl <= maxSpellLevel
    })
  }, [allSpells, state.characterClass, maxSpellLevel])

  const finalScores = useMemo(() => getFinalScores(state), [state])
  const conMod = Math.floor(((finalScores['Constitution'] ?? 10) - 10) / 2)
  const startingHp = (HIT_DIE[state.characterClass] ?? 8) + conMod
  const startingSlots = useMemo(() => getExpectedSpellSlots(state.characterClass, 1), [state.characterClass])
  const backgroundSkills = state.background?.skillProficiencies ?? []
  const raceChoices = useMemo(() => buildRaceChoices(state), [state])
  const raceSkillOptions = useMemo(
    () => ALL_DND5E_SKILLS.filter(skill => !backgroundSkills.includes(skill) && !state.pickedSkills.includes(skill)),
    [backgroundSkills, state.pickedSkills],
  )
  const qualifiedRaceFeats = useMemo(
    () => allFeats.filter(feat => isFeatQualified(feat, state, finalScores)),
    [allFeats, state, finalScores],
  )
  const expertiseSkillOptions = useMemo(
    () => Array.from(new Set([
      ...state.pickedSkills,
      ...backgroundSkills,
      ...state.raceSkillChoices,
    ])).sort().map(skill => ({ id: skill, name: skill })),
    [backgroundSkills, state.pickedSkills, state.raceSkillChoices],
  )
  const knownSpellNames = useMemo(
    () => Array.from(new Set([
      ...state.pickedCantrips
        .map(spellId => allSpells.find(spell => (spell.id ?? spell.name) === spellId)?.name)
        .filter((name): name is string => !!name),
      ...state.pickedSpells
        .map(spellId => allSpells.find(spell => (spell.id ?? spell.name) === spellId)?.name)
        .filter((name): name is string => !!name),
    ])),
    [allSpells, state.pickedCantrips, state.pickedSpells],
  )
  const featureChoiceDefinitions = useMemo(() => {
    const baseDefinitions = getFeatureChoiceDefinitions({
      targetClass: state.characterClass,
      subclass: state.subclass,
      level: 1,
      previousLevel: 0,
      pendingSelections: state.featureChoices,
      knownSpellNames,
    })
    return withDynamicFeatureChoiceOptions(
      baseDefinitions,
      Object.fromEntries(baseDefinitions.flatMap(definition => {
        if (definition.kind === 'expertise') {
          return [[definition.id, expertiseSkillOptions] as const]
        }
        if (definition.id === 'warlock-pact-of-the-tome-cantrips-choice') {
          const cantripOptions = allSpells
            .filter(spell => spell.name && (spell.spell_level ?? '').toLowerCase().includes('cantrip'))
            .filter(spell => !knownSpellNames.includes(spell.name))
            .map(spell => ({
              id: spell.name,
              name: spell.name,
              description: spell.school ? `${spell.school} cantrip` : undefined,
            }))
            .sort((left, right) => left.name.localeCompare(right.name))
          return [[definition.id, cantripOptions] as const]
        }
        return []
      })),
    )
  }, [allSpells, expertiseSkillOptions, knownSpellNames, state.characterClass, state.featureChoices, state.subclass])
  const selectedRaceFeat = useMemo(
    () => allFeats.find(feat => feat.index === state.raceFeatId) ?? null,
    [allFeats, state.raceFeatId],
  )
  const canProceed = useMemo(
    () => step === 'feature-choices'
      ? featureChoiceDefinitions.every(definition => (state.featureChoices[definition.id] ?? []).length === definition.count)
      : canGoNext(step, state),
    [featureChoiceDefinitions, state, step],
  )

  useEffect(() => {
    if (state.raceFeatId && !qualifiedRaceFeats.some(feat => feat.index === state.raceFeatId)) {
      setState(prev => ({ ...prev, raceFeatId: null }))
    }
  }, [qualifiedRaceFeats, state.raceFeatId])

  useEffect(() => {
    const validRaceSkillChoices = state.raceSkillChoices.filter(skill => raceSkillOptions.includes(skill))
    if (validRaceSkillChoices.length !== state.raceSkillChoices.length) {
      setState(prev => ({ ...prev, raceSkillChoices: validRaceSkillChoices }))
    }
  }, [raceSkillOptions, state.raceSkillChoices])

  const goNext = useCallback(() => {
    const idx = steps.indexOf(stepId)
    if (idx >= 0 && idx < steps.length - 1) setStepId(steps[idx + 1])
  }, [steps, stepId])

  const goBack = useCallback(() => {
    const idx = steps.indexOf(stepId)
    if (idx > 0) setStepId(steps[idx - 1])
    else navigate('/characters')
  }, [steps, stepId, navigate])

  const setClass = useCallback((cls: CharacterClass) => {
    setState(s => ({
      ...s,
      characterClass: cls,
      subclass: null,
      featureChoices: {},
      pickedCantrips: [],
      pickedSpells: [],
    }))
    // If currently past choose-class, go back to first step so user re-flows
    if (stepId !== 'choose-class') setStepId('choose-class')
  }, [stepId])

  const toggleSpell = useCallback((id: string) => {
    setState(s => {
      const list = s.pickedSpells
      return { ...s, pickedSpells: list.includes(id) ? list.filter(x => x !== id) : [...list, id] }
    })
  }, [])

  const toggleCantrip = useCallback((id: string) => {
    setState(s => {
      const list = s.pickedCantrips
      return { ...s, pickedCantrips: list.includes(id) ? list.filter(x => x !== id) : [...list, id] }
    })
  }, [])

  const handleConfirm = useCallback(async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const appliedFeatureChoices = applyFeatureChoiceSelections(featureChoiceDefinitions, state.featureChoices)
      const newChar = await charactersApi.create({
        name: state.name.trim(),
        characterClass: state.characterClass,
        subclass: state.subclass ?? undefined,
        gameType: 'dnd5e',
        level: 1,
        abilityScores: finalScores,
        race: state.race?.index,
      })

      const savingThrows = CLASS_STARTING_SAVING_THROWS[state.characterClass]
      const allSkillProfs = [...new Set([...state.pickedSkills, ...state.raceSkillChoices])]
      const classSkillProfs = [...backgroundSkills]
      const finalSkillProfs = [...new Set([...allSkillProfs, ...appliedFeatureChoices.skillProficiencies])]

      await charactersApi.update(newChar.id, {
        maxHp: startingHp,
        savingThrowProficiencies: savingThrows,
        skillProficiencies: finalSkillProfs,
        classSkillProficiencies: classSkillProfs,
        skillExpertise: appliedFeatureChoices.skillExpertise.length > 0 ? appliedFeatureChoices.skillExpertise : undefined,
        featureChoices: appliedFeatureChoices.persistedFeatureChoices.length > 0 ? appliedFeatureChoices.persistedFeatureChoices : undefined,
        raceChoices: Object.keys(raceChoices).length > 0 ? raceChoices : undefined,
        maxSpellsPerDay: Object.keys(startingSlots).length > 0 ? startingSlots : undefined,
      })

      if (state.background) {
        await charactersApi.updateCharacteristics(newChar.id, { background: state.background.index })
      }

      const allSpellPicks = [...state.pickedCantrips, ...state.pickedSpells]
      const featureCantripIds = appliedFeatureChoices.spellNames
        .map(name => findSpellIdByName(allSpells, name))
        .filter((spellId): spellId is string => !!spellId && !allSpellPicks.includes(spellId))
      for (const spellId of [...allSpellPicks, ...featureCantripIds]) {
        const spell = allSpells.find(s => (s.id ?? s.name) === spellId)
        const isCantrip = spell?.spell_level === '0' || spell?.spell_level === 'Cantrip'
        await preparedSpellsApi.upsert(newChar.id, spellId, {
          spellId,
          isPrepared: isCantrip,
          isAlwaysPrepared: false,
          isFavorite: false,
          isDomainSpell: false,
        })
      }

      if (state.raceFeatId) {
        await characterFeatsApi.add(newChar.id, { featIndex: state.raceFeatId, takenAtLevel: 1 })
        qc.invalidateQueries({ queryKey: ['character-feats', newChar.id] })
      }

      qc.invalidateQueries({ queryKey: ['characters'] })
      qc.invalidateQueries({ queryKey: ['character', newChar.id] })
      navigate(`/characters/${newChar.id}`)
    } catch (e) {
      setError('Something went wrong. Please try again.')
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }, [allSpells, backgroundSkills, featureChoiceDefinitions, finalScores, navigate, qc, raceChoices, startingHp, startingSlots, state])

  // ── Step content ────────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {

      case 'choose-class':
        return (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">Choose your class</p>
            <div className="grid grid-cols-2 gap-2">
              {DND5E_CLASSES.map(cls => (
                <button
                  key={cls}
                  onClick={() => setClass(cls)}
                  className={`px-3 py-3 rounded-xl border text-sm font-medium transition-colors text-left ${
                    state.characterClass === cls
                      ? 'border-indigo-500 bg-indigo-900/30 text-white'
                      : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>
        )

      case 'choose-race':
        return (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">Choose your race (optional)</p>
            <button
              onClick={() => setState(s => ({ ...s, race: null, raceAsiChoices: {}, raceSkillChoices: [], raceFeatId: null }))}
              className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                !state.race ? 'border-indigo-500 bg-indigo-900/30 text-white' : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
              }`}
            >
              — No race —
            </button>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {allRaces.map(r => (
                <button
                  key={r.index}
                  onClick={() => setState(s => ({ ...s, race: r, raceAsiChoices: {}, raceSkillChoices: [], raceFeatId: null }))}
                  className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                    state.race?.index === r.index ? 'border-indigo-500 bg-indigo-900/30 text-white' : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <span className="font-medium">{r.name}</span>
                  {r.modifiers.length > 0 && (
                    <span className="ml-2 text-xs text-gray-400">
                      {r.modifiers
                        .filter(m => m.type === 'ability_score' && m.ability && m.ability.trim() !== '')
                        .map(m => `${m.ability!.slice(0, 3)} ${m.value > 0 ? '+' : ''}${m.value}`)
                        .join(', ')}
                      {hasRaceChoices(r) && ' +choice'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )

      case 'race-choices': {
        if (!state.race) return null
        const abilityChoiceCount = getRaceAbilityChoiceCount(state.race)
        const skillChoiceCount = getRaceSkillChoiceCount(state.race)
        const abilityChoiceOptions = getRaceAbilityChoiceOptions(state.race)
        const chosen = Object.keys(state.raceAsiChoices)
        return (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-white">{state.race.name} — Race Choices</p>
              <p className="text-xs text-gray-400 mt-1">Complete any choices granted by your race.</p>
            </div>
            {abilityChoiceCount > 0 && (
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-semibold text-gray-300">Ability Score Choices</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Choose {abilityChoiceCount} ability score{abilityChoiceCount > 1 ? 's' : ''} to receive +1 each.
                  </p>
                  <p className="text-xs text-indigo-300 mt-1">{chosen.length}/{abilityChoiceCount} chosen</p>
                </div>
                <div className="space-y-1">
                  {abilityChoiceOptions.map(ability => {
                    const isChosen = chosen.includes(ability)
                    const disabled = !isChosen && chosen.length >= abilityChoiceCount
                    return (
                      <button
                        key={ability}
                        disabled={disabled}
                        onClick={() => {
                          if (isChosen) {
                            const updated = { ...state.raceAsiChoices }
                            delete updated[ability]
                            setState(s => ({ ...s, raceAsiChoices: updated }))
                          } else if (!disabled) {
                            setState(s => ({ ...s, raceAsiChoices: { ...s.raceAsiChoices, [ability]: 1 } }))
                          }
                        }}
                        className={`w-full text-left px-4 py-2 rounded-xl border text-sm transition-colors ${
                          isChosen ? 'border-indigo-500 bg-indigo-900/30 text-white' : disabled ? 'border-gray-700/40 bg-gray-800/30 text-gray-600 cursor-not-allowed' : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        {ability}{isChosen ? ' (+1)' : ''}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {skillChoiceCount > 0 && (
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-semibold text-gray-300">Bonus Skill Proficiency</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Choose {skillChoiceCount} bonus skill {skillChoiceCount > 1 ? 'proficiencies' : 'proficiency'}.
                  </p>
                  <p className="text-xs text-indigo-300 mt-1">{state.raceSkillChoices.length}/{skillChoiceCount} chosen</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {raceSkillOptions.map(skill => {
                    const isSelected = state.raceSkillChoices.includes(skill)
                    const disabled = !isSelected && state.raceSkillChoices.length >= skillChoiceCount
                    return (
                      <button
                        key={skill}
                        disabled={disabled}
                        onClick={() => setState(s => ({
                          ...s,
                          raceSkillChoices: isSelected
                            ? s.raceSkillChoices.filter(choice => choice !== skill)
                            : disabled ? s.raceSkillChoices : [...s.raceSkillChoices, skill],
                        }))}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : disabled
                              ? 'bg-gray-800/30 text-gray-600 cursor-not-allowed'
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {skill}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {hasRaceFeatChoice(state.race) && (
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-semibold text-gray-300">Feat Choice</p>
                  <p className="text-xs text-gray-400 mt-1">Choose 1 feat you qualify for at level 1.</p>
                </div>
                <FeatPickList
                  feats={qualifiedRaceFeats}
                  pickedId={state.raceFeatId}
                  search={featSearch}
                  onSearchChange={setFeatSearch}
                  onPick={id => setState(s => ({ ...s, raceFeatId: s.raceFeatId === id ? null : id }))}
                />
              </div>
            )}
          </div>
        )
      }

      case 'ability-scores':
        return (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(['pointbuy', 'standard', 'manual'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setState(s => ({ ...s, abilityMode: mode }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    state.abilityMode === mode ? 'border-indigo-500 bg-indigo-900/20 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {mode === 'pointbuy' ? 'Point Buy' : mode === 'standard' ? 'Standard' : 'Manual'}
                </button>
              ))}
            </div>

            {state.abilityMode === 'pointbuy' && (
              <PointBuyPanel
                scores={state.baseScores}
                onChange={scores => setState(s => ({ ...s, baseScores: scores }))}
              />
            )}
            {state.abilityMode === 'standard' && (
              <StandardArrayPanel
                assignments={state.standardAssignments}
                onChange={assignments => setState(s => ({ ...s, standardAssignments: assignments }))}
              />
            )}
            {state.abilityMode === 'manual' && (
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Enter scores manually (1–30)</p>
                {ABILITY_KEYS.map(ability => (
                  <div key={ability} className="flex items-center gap-2">
                    <span className="text-sm text-gray-300 w-24 shrink-0">{ability.slice(0, 3).toUpperCase()}</span>
                    <input
                      type="number" min={1} max={30}
                      value={state.baseScores[ability]}
                      onChange={e => setState(s => ({ ...s, baseScores: { ...s.baseScores, [ability]: parseInt(e.target.value) || 10 } }))}
                      className="w-20 bg-gray-800 text-white rounded-lg px-3 py-1.5 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm text-center"
                    />
                    <span className="text-xs text-gray-400">{getAbilityModStr(state.baseScores[ability])}</span>
                  </div>
                ))}
              </div>
            )}

            {state.race && (
              <div className="bg-gray-800/60 rounded-xl px-4 py-3 border border-gray-700/50">
                <p className="text-xs font-semibold text-gray-400 mb-2">After racial bonuses:</p>
                <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                  {ABILITY_KEYS.map(k => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-gray-400">{k.slice(0, 3).toUpperCase()}</span>
                      <span className="text-white font-bold">{finalScores[k]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      case 'pick-background':
        return (
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Choose a background (optional)</p>
            <button
              onClick={() => setState(s => ({ ...s, background: null }))}
              className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                !state.background ? 'border-indigo-500 bg-indigo-900/30 text-white' : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
              }`}
            >
              — No background —
            </button>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {allBackgrounds.map(bg => (
                <button
                  key={bg.index}
                  onClick={() => setState(s => ({ ...s, background: bg }))}
                  className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                    state.background?.index === bg.index ? 'border-indigo-500 bg-indigo-900/30 text-white' : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <span className="font-medium">{bg.name}</span>
                  {bg.skillProficiencies.length > 0 && (
                    <span className="ml-2 text-xs text-gray-400">+{bg.skillProficiencies.join(', ')}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )

      case 'pick-skills': {
        const needed = CLASS_STARTING_SKILL_COUNT[state.characterClass]
        const skillPool = state.characterClass === 'Bard' ? ALL_DND5E_SKILLS : (CLASS_SKILL_LIST[state.characterClass] ?? [])
        const available = skillPool.filter(s => !backgroundSkills.includes(s) && !state.raceSkillChoices.includes(s))
        return (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-white">Class Skills — {state.characterClass}</p>
              <p className="text-xs text-gray-400 mt-0.5">Pick {needed} from the list below</p>
              <p className="text-xs text-indigo-300 mt-1">{state.pickedSkills.length}/{needed} chosen</p>
            </div>
            {backgroundSkills.length > 0 && (
              <div className="bg-gray-800/50 rounded-xl px-3 py-2 text-xs text-gray-400">
                From background: <span className="text-green-400">{backgroundSkills.join(', ')}</span>
              </div>
            )}
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {available.map(skill => {
                const isSelected = state.pickedSkills.includes(skill)
                const disabled = !isSelected && state.pickedSkills.length >= needed
                return (
                  <button
                    key={skill}
                    disabled={disabled}
                    onClick={() => setState(s => ({
                      ...s,
                      pickedSkills: isSelected
                        ? s.pickedSkills.filter(k => k !== skill)
                        : disabled ? s.pickedSkills : [...s.pickedSkills, skill],
                    }))}
                    className={`w-full text-left px-3 py-2 rounded-xl border text-sm transition-colors ${
                      isSelected ? 'border-indigo-500 bg-indigo-900/30 text-white' : disabled ? 'border-gray-700/40 text-gray-600 bg-gray-800/30 cursor-not-allowed' : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {skill}
                  </button>
                )
              })}
            </div>
          </div>
        )
      }

      case 'pick-cantrips': {
        const needed = getCantripCount(state.characterClass, 1)
        return (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-white">Starting Cantrips</p>
              <p className="text-xs text-gray-400 mt-0.5">Pick {needed} cantrip{needed > 1 ? 's' : ''}</p>
            </div>
            <SpellPickList
              spells={classCantrips}
              picked={state.pickedCantrips}
              maxPicks={needed}
              search={cantripSearch}
              onSearchChange={setCantripSearch}
              onToggle={toggleCantrip}
            />
          </div>
        )
      }

      case 'pick-spells': {
        const needed = startingSpellCount(state.characterClass)
        const isWizard = state.characterClass === 'Wizard'
        return (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-white">
                {isWizard ? 'Spellbook — Starting Spells' : 'Known Spells'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {isWizard ? `Choose ${needed} spells for your spellbook` : `You know ${needed} spell${needed > 1 ? 's' : ''} at level 1`}
              </p>
            </div>
            <SpellPickList
              spells={classSpells}
              picked={state.pickedSpells}
              maxPicks={needed}
              search={spellSearch}
              onSearchChange={setSpellSearch}
              onToggle={toggleSpell}
            />
          </div>
        )
      }

      case 'subclass': {
        const options = SUBCLASSES[state.characterClass] ?? []
        return (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-white">Choose Subclass</p>
              <p className="text-xs text-gray-400 mt-0.5">{state.characterClass} — pick your specialization</p>
            </div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {options.map(s => (
                <button
                  key={s}
                  onClick={() => setState(prev => ({ ...prev, subclass: s, featureChoices: {} }))}
                  className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                    state.subclass === s ? 'border-indigo-500 bg-indigo-900/30 text-white font-medium' : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  {formatSubclass(s, state.characterClass)}
                </button>
              ))}
            </div>
          </div>
        )
      }

      case 'feature-choices':
        return (
          <FeatureChoicePicker
            title="Feature Choices"
            description="Finish the class and subclass choices granted at level 1."
            definitions={featureChoiceDefinitions}
            choices={state.featureChoices}
            onToggle={(definitionId, optionId) => {
              setState(current => {
                const definition = featureChoiceDefinitions.find(item => item.id === definitionId)
                if (!definition) return current
                const selected = current.featureChoices[definitionId] ?? []
                if (selected.includes(optionId)) {
                  return {
                    ...current,
                    featureChoices: {
                      ...current.featureChoices,
                      [definitionId]: selected.filter(id => id !== optionId),
                    },
                  }
                }
                if (selected.length >= definition.count) return current
                return {
                  ...current,
                  featureChoices: {
                    ...current.featureChoices,
                    [definitionId]: [...selected, optionId],
                  },
                }
              })
            }}
          />
        )

      case 'enter-name':
        return (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-white">Character Name</p>
              <p className="text-xs text-gray-400 mt-0.5">Give your character a name</p>
            </div>
            <input
              autoFocus
              type="text"
              placeholder="e.g. Aldric Blackwood"
              value={state.name}
              onChange={e => setState(s => ({ ...s, name: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter' && state.name.trim()) goNext() }}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-indigo-500 focus:outline-none text-base"
            />
          </div>
        )

      case 'summary': {
        const spellNames = (ids: string[]) =>
          ids.map(id => allSpells.find(s => (s.id ?? s.name) === id)?.name ?? id).join(', ')
        const featureChoiceSummary = featureChoiceDefinitions
          .map(definition => {
            const selected = state.featureChoices[definition.id] ?? []
            if (selected.length === 0) return null
            return `${definition.prompt}: ${selected.join(', ')}`
          })
          .filter((value): value is string => !!value)
        return (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-white">Review your character</p>

            <div className="bg-gray-800 rounded-xl px-4 py-3 space-y-1.5">
              <SummaryRow label="Name" value={state.name} />
              <SummaryRow label="Class" value={state.characterClass} />
              {state.subclass && <SummaryRow label="Subclass" value={formatSubclass(state.subclass, state.characterClass)} />}
              {state.race && <SummaryRow label="Race" value={state.race.name} />}
              {state.raceSkillChoices.length > 0 && <SummaryRow label="Race Skills" value={state.raceSkillChoices.join(', ')} />}
              {selectedRaceFeat && <SummaryRow label="Race Feat" value={selectedRaceFeat.name} />}
              {state.background && <SummaryRow label="Background" value={state.background.name} />}
              <SummaryRow label="Starting HP" value={`${startingHp}`} />
            </div>

            <div className="bg-gray-800 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-gray-400 mb-2">Ability Scores</p>
              <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                {ABILITY_KEYS.map(k => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-gray-400">{k.slice(0, 3).toUpperCase()}</span>
                    <span className="text-white font-bold">
                      {finalScores[k]} <span className="text-gray-400 font-normal">({getAbilityModStr(finalScores[k])})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1 text-xs text-gray-400">
              <p><span className="text-gray-300 font-semibold">Saving Throws: </span>{CLASS_STARTING_SAVING_THROWS[state.characterClass].join(', ')}</p>
              {(state.pickedSkills.length > 0 || backgroundSkills.length > 0 || state.raceSkillChoices.length > 0) && (
                <p><span className="text-gray-300 font-semibold">Skills: </span>{[...state.pickedSkills, ...backgroundSkills, ...state.raceSkillChoices].join(', ')}</p>
              )}
              {state.pickedCantrips.length > 0 && (
                <p><span className="text-gray-300 font-semibold">Cantrips: </span>{spellNames(state.pickedCantrips)}</p>
              )}
              {state.pickedSpells.length > 0 && (
                <p>
                  <span className="text-gray-300 font-semibold">{state.characterClass === 'Wizard' ? 'Spellbook: ' : 'Known Spells: '}</span>
                  {spellNames(state.pickedSpells)}
                </p>
              )}
              {featureChoiceSummary.length > 0 && (
                <p><span className="text-gray-300 font-semibold">Feature Choices: </span>{featureChoiceSummary.join(' | ')}</p>
              )}
            </div>

            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>
        )
      }

      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <h1 className="text-lg font-bold text-indigo-400">⚔️ New Character</h1>
        <button onClick={() => navigate('/characters')} className="text-gray-400 hover:text-white transition-colors text-sm">
          Cancel
        </button>
      </header>

      {/* Progress bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex-shrink-0">
        <div className="flex gap-0.5 mb-1.5">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < stepIdx ? 'bg-indigo-600' : i === stepIdx ? 'bg-indigo-400' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400 text-center">
          Step {stepIdx + 1} of {steps.length} — <span className="text-gray-300 font-medium">{STEP_LABELS[step]}</span>
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 max-w-lg mx-auto w-full">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="bg-gray-900 border-t border-gray-800 px-6 py-4 flex gap-3 flex-shrink-0">
        <button
          onClick={goBack}
          className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-xl text-sm font-medium transition-colors"
        >
          {stepIdx === 0 ? 'Cancel' : '← Back'}
        </button>
        {step === 'summary' ? (
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Creating…' : '✦ Create Character'}
          </button>
        ) : (
          <button
            onClick={goNext}
            disabled={!canProceed}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  )
}
