import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query'
import { charactersApi } from '../api/characters'
import { inventoryApi } from '../api/inventory'
import { attacksApi } from '../api/attacks'
import { beastsApi } from '../api/beasts'
import { characterFeatsApi } from '../api/characterFeats'
import { classFeaturesApi } from '../api/classFeatures'
import { classResourcesApi } from '../api/classResources'
import { equipmentResourcesApi } from '../api/equipmentResources'
import { spellsPerDayApi } from '../api/spells'
import { racesApi } from '../api/races'
import { backgroundsApi } from '../api/backgrounds'
import EditableNumber from '../components/EditableNumber'
import AddClassModal from '../components/AddClassModal'
import LevelUpWizard from '../components/LevelUpWizard'
import { useLevelUpStore } from '../stores/levelUpStore'
// resizeImage import removed — avatar now goes through AvatarCropModal canvas pipeline
import { lookupArmor } from '../utils/armorTable'
import type { Character, UpdateCharacterRequest, CharacterAttack, AddAttackRequest, InventoryItem, CharacterFeat, ClassFeature, ClassResource, Race, EquipmentResource, CharacterClass, CharacterClassEntry } from '../types'
import { AbilityScoresSection, SavingThrowsSection, AttacksSection, BLANK_ATTACK, ClassResourcesSection, ClassFeaturesSection, ClassAbilitiesSection, FeatsSection } from '../components/stats'
import AvatarCropModal from '../components/stats/AvatarCropModal'
import { CLASS_SAVING_THROWS, ABILITY_KEYS, ABILITY_SHORT } from '../components/stats/statsConstants'
import { DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useUserPreferences } from '../hooks/useUserPreferences'
import { resolveClassName } from '../utils/spellUtils'

// D&D 5e SRD background skill proficiencies
const BACKGROUND_SKILLS: Record<string, string[]> = {
  'acolyte': ['Insight', 'Religion'],
  'charlatan': ['Deception', 'Sleight of Hand'],
  'criminal': ['Deception', 'Stealth'],
  'entertainer': ['Acrobatics', 'Performance'],
  'folk-hero': ['Animal Handling', 'Survival'],
  'guild-artisan': ['Insight', 'Persuasion'],
  'hermit': ['Medicine', 'Religion'],
  'noble': ['History', 'Persuasion'],
  'outlander': ['Athletics', 'Survival'],
  'sage': ['Arcana', 'History'],
  'sailor': ['Athletics', 'Perception'],
  'soldier': ['Athletics', 'Intimidation'],
  'urchin': ['Sleight of Hand', 'Stealth'],
}

// D&D 5e class skill options (player picks N from list; store chosen in classSkillProficiencies)
const CLASS_SKILL_OPTIONS: Record<string, { skills: string[]; pick: number }> = {
  Barbarian: { pick: 2, skills: ['Animal Handling', 'Athletics', 'Intimidation', 'Nature', 'Perception', 'Survival'] },
  Bard:      { pick: 3, skills: ['Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival'] },
  Cleric:    { pick: 2, skills: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'] },
  Druid:     { pick: 2, skills: ['Arcana', 'Animal Handling', 'Insight', 'Medicine', 'Nature', 'Perception', 'Religion', 'Survival'] },
  Fighter:   { pick: 2, skills: ['Acrobatics', 'Animal Handling', 'Athletics', 'History', 'Insight', 'Intimidation', 'Perception', 'Survival'] },
  Monk:      { pick: 2, skills: ['Acrobatics', 'Athletics', 'History', 'Insight', 'Religion', 'Stealth'] },
  Paladin:   { pick: 2, skills: ['Athletics', 'Insight', 'Intimidation', 'Medicine', 'Persuasion', 'Religion'] },
  Ranger:    { pick: 3, skills: ['Animal Handling', 'Athletics', 'Insight', 'Investigation', 'Nature', 'Perception', 'Stealth', 'Survival'] },
  Rogue:     { pick: 4, skills: ['Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation', 'Perception', 'Performance', 'Persuasion', 'Sleight of Hand', 'Stealth'] },
  Sorcerer:  { pick: 2, skills: ['Arcana', 'Deception', 'Insight', 'Intimidation', 'Persuasion', 'Religion'] },
  Warlock:   { pick: 2, skills: ['Arcana', 'Deception', 'History', 'Intimidation', 'Investigation', 'Nature', 'Religion'] },
  Wizard:    { pick: 2, skills: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Religion'] },
  Artificer: { pick: 2, skills: ['Arcana', 'History', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Sleight of Hand'] },
}




const DND5E_SKILLS = [
  { name: 'Acrobatics', ability: 'Dexterity' },
  { name: 'Animal Handling', ability: 'Wisdom' },
  { name: 'Arcana', ability: 'Intelligence' },
  { name: 'Athletics', ability: 'Strength' },
  { name: 'Deception', ability: 'Charisma' },
  { name: 'History', ability: 'Intelligence' },
  { name: 'Insight', ability: 'Wisdom' },
  { name: 'Intimidation', ability: 'Charisma' },
  { name: 'Investigation', ability: 'Intelligence' },
  { name: 'Medicine', ability: 'Wisdom' },
  { name: 'Nature', ability: 'Intelligence' },
  { name: 'Perception', ability: 'Wisdom' },
  { name: 'Performance', ability: 'Charisma' },
  { name: 'Persuasion', ability: 'Charisma' },
  { name: 'Religion', ability: 'Intelligence' },
  { name: 'Sleight of Hand', ability: 'Dexterity' },
  { name: 'Stealth', ability: 'Dexterity' },
  { name: 'Survival', ability: 'Wisdom' },
]

// Spellcasting ability by class (D&D 5e)
const CASTER_ABILITY: Record<string, string> = {
  Bard: 'Charisma', Cleric: 'Wisdom', Druid: 'Wisdom',
  Paladin: 'Charisma', Ranger: 'Wisdom', Sorcerer: 'Charisma',
  Warlock: 'Charisma', Wizard: 'Intelligence', Artificer: 'Intelligence',
}

const SUBCLASSES:Record<string, string[]> = {
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

const DND5E_CLASSES: CharacterClass[] = [
  'Artificer','Barbarian','Bard','Cleric','Druid',
  'Fighter','Monk','Paladin','Ranger','Rogue',
  'Sorcerer','Warlock','Wizard',
]

/** Convert "WizardEvocation" → "Evocation", "BardCollegeOfLore" → "College Of Lore" */
function formatSubclass(value: string, cls: string): string {
  if (!value || value === 'None') return '—'
  // Strip class prefix
  const stripped = value.startsWith(cls) ? value.slice(cls.length) : value
  // Split on capital letters
  return stripped.replace(/([A-Z])/g, ' $1').trim()
}

function profBonus(level: number): string {
  const pb = Math.floor((level - 1) / 4) + 2
  return `+${pb}`
}


function getFeatModifier(feats: (CharacterFeat | ClassFeature)[], type: string): number {
  return feats.flatMap(f => f.modifiers).filter(m => m.type === type).reduce((s, m) => s + m.value, 0)
}

// Returns the best movement bonus from class features (e.g. Monk Unarmored Movement)
function getMovementBonus(classFeatures: ClassFeature[]): number {
  const vals = classFeatures.flatMap(f => f.modifiers).filter(m => m.type === 'movement').map(m => m.value)
  return vals.length ? Math.max(...vals) : 0
}

function calculateAC(
  characterClass: string,
  abilityScores: Record<string, number>,
  inventory: InventoryItem[],
  baseArmorClass: number,
  feats: CharacterFeat[],
  classFeatures: ClassFeature[] = [],
): { total: number; breakdown: string; isAutoCalc: boolean } {
  const dexMod = Math.floor(((abilityScores['Dexterity'] ?? 10) - 10) / 2)
  const conMod = Math.floor(((abilityScores['Constitution'] ?? 10) - 10) / 2)
  const wisMod = Math.floor(((abilityScores['Wisdom'] ?? 10) - 10) / 2)

  const equipped = inventory.filter(i => i.isEquipped)
  // Find the chest/armor slot item — also accept items where lookupArmor matches (legacy items without armorType set)
  const armorItem = equipped.find(i =>
    (i.equippedSlot === 'Chest' || i.equippedSlot === 'Armor') &&
    ((i.armorType && i.armorType !== 'None') || lookupArmor(i.name) !== undefined)
  )
  const shieldBonus = equipped
    .filter(i => i.equippedSlot !== 'Chest' && i.equippedSlot !== 'Armor' && i.acBonus != null)
    .reduce((s, i) => s + (i.acBonus ?? 0), 0)

  // Medium Armor Master feat raises the DEX cap on medium armor from +2 to +3
  const medArmorMaxDex = feats.flatMap(f => f.modifiers)
    .find(m => m.type === 'medium_armor_max_dex')?.value ?? 2

  // Flat AC bonuses from feats
  const featAcBonus = getFeatModifier(feats, 'ac')

  if (armorItem) {
    // Resolve AC base and armor type — prefer stored values, fall back to ARMOR_TABLE lookup
    const armorLookup = lookupArmor(armorItem.name)
    const resolvedType = (armorItem.armorType && armorItem.armorType !== 'None') ? armorItem.armorType : armorLookup?.type
    const base = armorItem.acBonus ?? armorLookup?.ac ?? 0
    let dexContrib = 0
    let armorLabel = armorItem.name || resolvedType
    if (resolvedType === 'Light') {
      dexContrib = dexMod
    } else if (resolvedType === 'Medium') {
      dexContrib = Math.min(dexMod, medArmorMaxDex)
      if (medArmorMaxDex > 2) armorLabel += ' (+3 DEX cap)'
    }
    // no dex for Heavy
    const total = base + dexContrib + shieldBonus + baseArmorClass + featAcBonus
    const parts: string[] = [`${base} (${armorLabel})`]
    if (dexContrib !== 0) parts.push(`${dexContrib >= 0 ? '+' : ''}${dexContrib} DEX`)
    if (shieldBonus > 0) parts.push(`+${shieldBonus} shield`)
    if (baseArmorClass !== 0) parts.push(`${baseArmorClass >= 0 ? '+' : ''}${baseArmorClass} bonus`)
    if (featAcBonus !== 0) parts.push(`${featAcBonus >= 0 ? '+' : ''}${featAcBonus} feats`)
    return { total, breakdown: parts.join(' '), isAutoCalc: true }
  }

  // No armor equipped — unarmored calculation (base 10 + DEX + any non-armor AC bonuses)
  const classFeatureAcBase = classFeatures.flatMap(f => f.modifiers)
    .find(m => m.type === 'unarmored_ac_base')?.value ?? null

  let unarmoredBase = classFeatureAcBase ?? 10
  let classNote = ''
  if (!classFeatureAcBase) {
    if (characterClass === 'Barbarian') { unarmoredBase += conMod; classNote = ` +${conMod} CON` }
    else if (characterClass === 'Monk') { unarmoredBase += wisMod; classNote = ` +${wisMod} WIS` }
  }
  const unarmoredLabel = classFeatureAcBase ? `Draconic (${unarmoredBase})` : null
  const total = unarmoredBase + dexMod + shieldBonus + baseArmorClass + featAcBonus
  const baseDisplay = unarmoredLabel ? `${unarmoredBase} (${unarmoredLabel})` : `${unarmoredBase}${classNote}`
  const parts: string[] = [baseDisplay, `${dexMod >= 0 ? '+' : ''}${dexMod} DEX`]
  if (shieldBonus > 0) parts.push(`+${shieldBonus} bonus`)
  if (baseArmorClass !== 0) parts.push(`${baseArmorClass >= 0 ? '+' : ''}${baseArmorClass} bonus`)
  if (featAcBonus !== 0) parts.push(`${featAcBonus >= 0 ? '+' : ''}${featAcBonus} feats`)
  return { total, breakdown: parts.join(' '), isAutoCalc: true }
}

function RaceSelector({ characterId, currentRace, currentRaceChoices, currentSkillProficiencies }: {
  characterId: string
  currentRace?: string
  currentRaceChoices?: Record<string, number>
  currentSkillProficiencies: string[]
}) {
  const qc = useQueryClient()
  const { data: allRaces = [] } = useQuery({ queryKey: ['races'], queryFn: () => racesApi.getAll() })

  // Subraces: races whose parent_race differs from their own index
  const subraceSet = useMemo(() => {
    const s = new Set<string>()
    allRaces.forEach(r => { if (r.parent_race && r.parent_race !== r.index) s.add(r.index) })
    return s
  }, [allRaces])

  // Map of parent_race → child races
  const parentGroups = useMemo(() => {
    const m = new Map<string, Race[]>()
    allRaces.forEach(r => {
      if (r.parent_race && r.parent_race !== r.index) {
        const arr = m.get(r.parent_race) ?? []
        arr.push(r)
        m.set(r.parent_race, arr)
      }
    })
    return m
  }, [allRaces])

  // Top-level races shown in the Race dropdown (not subraces of another)
  const topLevelRaces = useMemo(() =>
    allRaces.filter(r => !subraceSet.has(r.index)), [allRaces, subraceSet])

  // Virtual parents: parent_race values not present as a race index (e.g. "dwarf", "elf")
  const virtualParents = useMemo(() => {
    const raceIndexes = new Set(allRaces.map(r => r.index))
    return [...new Set(
      allRaces
        .filter(r => r.parent_race && r.parent_race !== r.index)
        .map(r => r.parent_race!)
        .filter(p => !raceIndexes.has(p))
    )]
  }, [allRaces])

  const [selectedParent, setSelectedParent] = useState('')
  const [selectedSubrace, setSelectedSubrace] = useState('')

  useEffect(() => {
    if (!allRaces.length) return
    if (!currentRace) { setSelectedParent(''); setSelectedSubrace(''); return }
    const raceObj = allRaces.find(r => r.index === currentRace)
    if (!raceObj) return
    if (raceObj.parent_race && raceObj.parent_race !== raceObj.index) {
      setSelectedParent(raceObj.parent_race)
      setSelectedSubrace(raceObj.index)
    } else {
      setSelectedParent(raceObj.index)
      setSelectedSubrace('')
    }
  }, [currentRace, allRaces])

  const ABILITY_CHOICE_KEYS = ['Strength','Dexterity','Constitution','Intelligence','Wisdom','Charisma']

  const mutation = useMutation({
    mutationFn: ({ race, skillProficiencies }: { race: string | undefined; skillProficiencies: string[] }) =>
      charactersApi.update(characterId, { race, raceChoices: {}, skillProficiencies }),
    onSuccess: (updated) => {
      qc.setQueryData<Character>(['character', characterId], updated)
      qc.invalidateQueries({ queryKey: ['character', characterId] })
    },
  })
  const choiceMutation = useMutation({
    mutationFn: ({ raceChoices, skillProficiencies }: { raceChoices: Record<string, number>; skillProficiencies: string[] }) =>
      charactersApi.update(characterId, { raceChoices, skillProficiencies }),
    onSuccess: (updated) => {
      qc.setQueryData<Character>(['character', characterId], updated)
      qc.invalidateQueries({ queryKey: ['character', characterId] })
    },
  })

  const subraceOptions = parentGroups.get(selectedParent) ?? []
  const selectedRace = allRaces.find(r => r.index === currentRace)
  const choiceModifier = selectedRace?.modifiers.find(m => m.type === 'ability_score_choice')
  const choiceCount = choiceModifier?.condition === 'choose_2' ? 2 : choiceModifier ? 1 : 0
  const skillChoiceModifier = selectedRace?.modifiers.find(m => m.type === 'skill_choice')
  const choices = currentRaceChoices ?? {}
  const chosenKeys = Object.keys(choices).filter(k => (choices[k] ?? 0) > 0 && ABILITY_CHOICE_KEYS.includes(k))
  const chosenSkill = Object.keys(choices).find(k => !ABILITY_CHOICE_KEYS.includes(k) && (choices[k] ?? 0) > 0)

  const getRaceSkillsFromChoices = (raceChoices: Record<string, number>) =>
    Object.keys(raceChoices).filter(k => !ABILITY_CHOICE_KEYS.includes(k) && (raceChoices[k] ?? 0) > 0)

  const handleParentChange = (parentValue: string) => {
    setSelectedParent(parentValue)
    setSelectedSubrace('')
    // Strip any previously chosen race skill from skillProficiencies
    const oldRaceSkills = getRaceSkillsFromChoices(currentRaceChoices ?? {})
    const cleanedSkills = currentSkillProficiencies.filter(s => !oldRaceSkills.includes(s))
    if (!parentValue) {
      mutation.mutate({ race: undefined, skillProficiencies: cleanedSkills })
    } else if (!virtualParents.includes(parentValue)) {
      mutation.mutate({ race: parentValue, skillProficiencies: cleanedSkills })
    }
    // Virtual parent (dwarf, elf, etc.) — wait for subrace selection
  }

  const handleSubraceChange = (subraceValue: string) => {
    setSelectedSubrace(subraceValue)
    const oldRaceSkills = getRaceSkillsFromChoices(currentRaceChoices ?? {})
    const cleanedSkills = currentSkillProficiencies.filter(s => !oldRaceSkills.includes(s))
    if (subraceValue) mutation.mutate({ race: subraceValue, skillProficiencies: cleanedSkills })
  }

  const handleChoiceToggle = (ability: string) => {
    const next = { ...choices }
    if (next[ability]) { delete next[ability] }
    else if (chosenKeys.length < choiceCount) { next[ability] = choiceModifier?.value ?? 1 }
    choiceMutation.mutate({ raceChoices: next, skillProficiencies: currentSkillProficiencies })
  }

  const handleSkillChoiceToggle = (skill: string) => {
    const next = { ...choices }
    // Remove any previous skill choice
    getRaceSkillsFromChoices(next).forEach(k => delete next[k])
    let newSkillProfs = currentSkillProficiencies.filter(s => getRaceSkillsFromChoices(currentRaceChoices ?? {}).includes(s) ? false : true)
    if (chosenSkill === skill) {
      // Deselect: just remove it
      newSkillProfs = currentSkillProficiencies.filter(s => s !== skill)
    } else {
      // Select new skill
      next[skill] = 1
      newSkillProfs = [...currentSkillProficiencies.filter(s => s !== chosenSkill), skill]
    }
    choiceMutation.mutate({ raceChoices: next, skillProficiencies: newSkillProfs })
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <p className="text-xs text-gray-400 mb-1">Race</p>
          <select
            className="w-full bg-gray-800 text-white rounded-lg px-2 py-1.5 border border-gray-700 focus:border-indigo-500 focus:outline-none text-xs"
            value={selectedParent}
            onChange={e => handleParentChange(e.target.value)}
            disabled={mutation.isPending}
          >
            <option value="">— None —</option>
            {topLevelRaces.map(r => (
              <option key={r.index} value={r.index}>{r.name}</option>
            ))}
            {virtualParents.map(p => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <p className="text-xs text-gray-400 mb-1">Subrace</p>
          <select
            className="w-full bg-gray-800 text-white rounded-lg px-2 py-1.5 border border-gray-700 focus:border-indigo-500 focus:outline-none text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            value={selectedSubrace}
            disabled={subraceOptions.length === 0 || mutation.isPending}
            onChange={e => handleSubraceChange(e.target.value)}
          >
            <option value="">— None —</option>
            {subraceOptions.map(r => (
              <option key={r.index} value={r.index}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>
      {choiceCount > 0 && chosenKeys.length < choiceCount && (
        <div className="mt-1">
          <div className="text-xs text-gray-400 mb-1">
            Choose {choiceCount} ability score{choiceCount > 1 ? 's' : ''} (+{choiceModifier?.value ?? 1} each):
            <span className="text-yellow-400 ml-1">{chosenKeys.length}/{choiceCount}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'].map(ab => {
              const isChosen = !!choices[ab]
              const isFull = chosenKeys.length >= choiceCount && !isChosen
              return (
                <button
                  key={ab}
                  onClick={() => !isFull && handleChoiceToggle(ab)}
                  disabled={isFull || choiceMutation.isPending}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    isChosen
                      ? 'bg-indigo-600 text-white'
                      : isFull
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {ab.slice(0, 3)}
                </button>
              )
            })}
          </div>
        </div>
      )}
      {skillChoiceModifier && (
        <div className="mt-1">
          <div className="text-xs text-gray-400 mb-1">
            Choose 1 bonus skill proficiency:
            {chosenSkill && <span className="text-green-400 ml-1">{chosenSkill} ✓</span>}
          </div>
          <div className="flex flex-wrap gap-1">
            {DND5E_SKILLS.map(s => {
              const isChosen = chosenSkill === s.name
              return (
                <button
                  key={s.name}
                  onClick={() => handleSkillChoiceToggle(s.name)}
                  disabled={choiceMutation.isPending}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    isChosen
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {s.name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function BackgroundSelector({ characterId, currentBackground, currentSkillProficiencies }: {
  characterId: string
  currentBackground?: string
  currentSkillProficiencies: string[]
}) {
  const qc = useQueryClient()
  const { data: backgrounds = [] } = useQuery({ queryKey: ['backgrounds'], queryFn: () => backgroundsApi.getAll() })

  const bgMutation = useMutation({
    mutationFn: async ({ background, skillProficiencies }: { background?: string; skillProficiencies: string[] }) => {
      await charactersApi.updateCharacteristics(characterId, { background: background || undefined })
      return charactersApi.update(characterId, { skillProficiencies })
    },
    onSuccess: (updated) => {
      qc.setQueryData<Character>(['character', characterId], updated)
      qc.invalidateQueries({ queryKey: ['character', characterId] })
    },
  })

  const handleChange = (newBgIndex: string) => {
    const oldBgSkills = currentBackground ? (BACKGROUND_SKILLS[currentBackground] ?? []) : []
    const newBgSkills = newBgIndex ? (BACKGROUND_SKILLS[newBgIndex] ?? []) : []
    let updatedSkills = currentSkillProficiencies.filter(s => !oldBgSkills.includes(s))
    newBgSkills.forEach(s => { if (!updatedSkills.includes(s)) updatedSkills.push(s) })
    bgMutation.mutate({ background: newBgIndex || undefined, skillProficiencies: updatedSkills })
  }

  const bgSkills = currentBackground ? (BACKGROUND_SKILLS[currentBackground] ?? []) : []

  return (
    <div>
      <select
        className="w-full bg-gray-800 text-white rounded-lg px-2 py-1.5 border border-gray-700 focus:border-indigo-500 focus:outline-none text-xs"
        value={currentBackground ?? ''}
        onChange={e => handleChange(e.target.value)}
        disabled={bgMutation.isPending}
      >
        <option value="">— None —</option>
        {backgrounds.map(b => (
          <option key={b.index} value={b.index}>{b.name}</option>
        ))}
      </select>
      {bgSkills.length > 0 && (
        <p className="text-xs text-amber-400/80 mt-0.5">Grants: {bgSkills.join(', ')}</p>
      )}
    </div>
  )
}

function ClassSkillsSelector({ characterId, characterClass, classSkillProficiencies, allSkillProficiencies }: {
  characterId: string
  characterClass: string
  classSkillProficiencies: string[]
  allSkillProficiencies: string[]
}) {
  const qc = useQueryClient()
  const classOpts = CLASS_SKILL_OPTIONS[characterClass]
  const [open, setOpen] = useState(false)

  const mutation = useMutation({
    mutationFn: (classSkills: string[]) => {
      // Add newly chosen class skills to the overall skill proficiencies too
      const merged = [...new Set([...allSkillProficiencies, ...classSkills])]
      return charactersApi.update(characterId, { classSkillProficiencies: classSkills, skillProficiencies: merged })
    },
    onSuccess: (updated) => {
      qc.setQueryData<Character>(['character', characterId], updated)
      qc.invalidateQueries({ queryKey: ['character', characterId] })
    },
  })

  if (!classOpts) return null

  const toggle = (skill: string) => {
    const current = classSkillProficiencies
    const isSelected = current.includes(skill)
    let next: string[]
    if (isSelected) {
      next = current.filter(s => s !== skill)
    } else if (current.length < classOpts.pick) {
      next = [...current, skill]
    } else {
      // At limit — swap: deselect first, add new
      next = [...current.slice(1), skill]
    }
    mutation.mutate(next)
  }

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
      >
        Class skills ({classSkillProficiencies.length}/{classOpts.pick}) {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="mt-1.5 p-2 bg-gray-800 rounded-lg space-y-0.5">
          <p className="text-[10px] text-gray-500 mb-1">Pick {classOpts.pick} from {characterClass}</p>
          {classOpts.skills.map(skill => {
            const chosen = classSkillProficiencies.includes(skill)
            return (
              <button
                key={skill}
                onClick={() => toggle(skill)}
                className={`w-full flex items-center gap-2 px-2 py-1 rounded text-xs text-left transition-colors ${chosen ? 'text-indigo-300' : 'text-gray-400 hover:text-white'}`}
              >
                <span className={`w-2.5 h-2.5 rounded-full border flex-shrink-0 ${chosen ? 'bg-indigo-500 border-indigo-500' : 'border-gray-500'}`} />
                {skill}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

type StatsSectionId = 'identity' | 'combat' | 'attacks' | 'ability-saves-skills' | 'feats' | 'class-resources' | 'class-features' | 'class-abilities'

const STATS_SECTIONS: { id: StatsSectionId; label: string }[] = [
  { id: 'identity', label: 'Identity' },
  { id: 'combat', label: 'Combat' },
  { id: 'attacks', label: 'Attacks' },
  { id: 'ability-saves-skills', label: 'Ability Scores & Skills' },
  { id: 'feats', label: 'Active Feats' },
  { id: 'class-resources', label: 'Class Resources' },
  { id: 'class-features', label: 'Class Features' },
  { id: 'class-abilities', label: 'Class Abilities' },
]

const DEFAULT_SECTION_ORDER: StatsSectionId[] = STATS_SECTIONS.map(s => s.id)

function SortableSection({
  id,
  label,
  editMode,
  collapsed,
  onToggleCollapse,
  actions,
  children,
}: {
  id: string
  label: string
  editMode: boolean
  collapsed: boolean
  onToggleCollapse: () => void
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-50 z-50 relative' : undefined}>
      <div className="bg-gray-900 rounded-2xl overflow-hidden">
        {editMode ? (
          <div
            className="flex items-center gap-2 px-4 py-2.5 cursor-grab active:cursor-grabbing touch-none select-none bg-gray-800/60"
            {...attributes}
            {...listeners}
          >
            <span className="text-gray-400 text-base shrink-0">⠿</span>
            <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold flex-1">{label}</span>
          </div>
        ) : (
          <div
            role="button"
            className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-800/50 transition-colors cursor-pointer"
            onClick={onToggleCollapse}
          >
            <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold flex-1">{label}</span>
            {actions && (
              <div
                className="flex items-center gap-1.5"
                onClick={e => e.stopPropagation()}
              >
                {actions}
              </div>
            )}
            <span
              className={`text-gray-600 text-xs transition-transform duration-300 shrink-0 ${collapsed ? '-rotate-90' : 'rotate-0'}`}
            >▼</span>
          </div>
        )}
        <div className={`grid transition-all duration-300 ${collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
          <div className="overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StatsPage({ embedded, editMode: editModeProp, onSetEditMode }: { embedded?: boolean; editMode?: boolean; onSetEditMode?: (v: boolean) => void } = {}) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const nameRef = useRef<HTMLInputElement>(null)

  const { data: character, isLoading } = useQuery({
    queryKey: ['character', id],
    queryFn: () => charactersApi.get(id!),
    enabled: !!id,
  })

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory', id],
    queryFn: () => inventoryApi.getAll(id!),
    enabled: !!id,
  })

  const { data: customAttacks = [] } = useQuery({
    queryKey: ['attacks', id],
    queryFn: () => attacksApi.getAll(id!),
    enabled: !!id,
  })

  const { data: allBeasts = [] } = useQuery({
    queryKey: ['beasts'],
    queryFn: () => beastsApi.getBeasts(),
  })

  const { data: charFeats = [] } = useQuery({
    queryKey: ['character-feats', id],
    queryFn: () => characterFeatsApi.getAll(id!),
    enabled: !!id,
  })

  // Derive a normalized classes[] that always has at least one entry.
  // Single-class characters (classes = null) get a synthetic single-entry array.
  const effectiveClasses = useMemo((): CharacterClassEntry[] => {
    if (!character) return []
    if (character.classes && character.classes.length > 0) return character.classes
    return [{
      characterClass: character.characterClass as CharacterClass,
      subclass: character.subclass ?? 'None',
      level: character.level,
      cantripsKnown: 0,
    }]
  }, [character])

  const { data: classFeatures = [] } = useQuery({
    queryKey: ['class-features', character?.characterClass, character?.level, character?.subclass],
    queryFn: () => classFeaturesApi.getForCharacter(
      character!.characterClass,
      character!.level,
      character!.subclass !== 'None' ? character!.subclass?.toLowerCase() : undefined,
    ),
    // Only used as fallback when effectiveClasses is not yet populated
    enabled: !!character && effectiveClasses.length === 0,
  })

  // Fetch features for every class entry in parallel (works for single and multiclass)
  const multiclassFeatureQueries = useQueries({
    queries: effectiveClasses.map(entry => ({
      queryKey: ['class-features', entry.characterClass, entry.level, entry.subclass],
      queryFn: () => classFeaturesApi.getForCharacter(
        entry.characterClass,
        entry.level,
        entry.subclass !== 'None' ? entry.subclass.toLowerCase() : undefined,
      ),
      enabled: !!character,
    })),
  })
  const allClassFeatures: ClassFeature[] = effectiveClasses.length > 0
    ? multiclassFeatureQueries.flatMap(q => q.data ?? [])
    : classFeatures

  const { data: race } = useQuery<Race>({
    queryKey: ['race', character?.race],
    queryFn: () => racesApi.getOne(character!.race!),
    enabled: !!character?.race,
  })

  const { data: classResources = [] } = useQuery({
    queryKey: ['classResources', id],
    queryFn: () => classResourcesApi.getAll(id!),
    enabled: !!id,
    retry: false,
  })

  const resourceMutation = useMutation({
    mutationFn: async ({ action, key, amount, currentExhaustion }: { action: 'use' | 'restore' | 'long-rest' | 'short-rest' | 'sync', key?: string, amount?: number, currentExhaustion?: number }): Promise<ClassResource[]> => {
      if (action === 'use') return classResourcesApi.use(id!, key!, amount).then(r => [r])
      if (action === 'restore') return classResourcesApi.restore(id!, key!, amount).then(r => [r])
      if (action === 'long-rest') {
        const [resources] = await Promise.all([
          classResourcesApi.longRest(id!),
          equipmentResourcesApi.rest(id!, 'long'),
          spellsPerDayApi.longRest(id!),
          charactersApi.update(id!, {
            deathSaveSuccesses: 0,
            deathSaveFailures: 0,
            exhaustionLevel: Math.max(0, (currentExhaustion ?? 0) - 1),
          }),
        ])
        return resources
      }
      if (action === 'short-rest') {
        const [resources] = await Promise.all([
          classResourcesApi.shortRest(id!),
          equipmentResourcesApi.rest(id!, 'short'),
        ])
        return resources
      }
      return classResourcesApi.sync(id!)
    },
    onSuccess: (updated, { action }) => {
      qc.setQueryData<ClassResource[]>(['classResources', id], old => {
        if (!old) return updated
        const map = new Map(updated.map(r => [r.resourceKey, r]))
        return old.map(r => map.get(r.resourceKey) ?? r)
      })
      if (action === 'long-rest' || action === 'short-rest') {
        qc.invalidateQueries({ queryKey: ['equipment-resources', id] })
        qc.invalidateQueries({ queryKey: ['spellsPerDay', id] })
      }
      if (action === 'long-rest') {
        qc.invalidateQueries({ queryKey: ['character', id] })
      }
    },
  })

  useEffect(() => {
    if (id) classResourcesApi.sync(id)
      .then(updated => qc.setQueryData<ClassResource[]>(['classResources', id], old => {
        if (!old) return updated
        const map = new Map(updated.map(r => [r.resourceKey, r]))
        return old.map(r => map.get(r.resourceKey) ?? r)
      }))
      .catch(() => {/* endpoint not yet available */})
  }, [id, character?.characterClass, character?.level]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: equipmentResourcesRaw } = useQuery<EquipmentResource[]>({
    queryKey: ['equipment-resources', id],
    queryFn: () => equipmentResourcesApi.getAll(id!),
    enabled: !!id,
    retry: false,
  })
  const equipmentResources: EquipmentResource[] = Array.isArray(equipmentResourcesRaw) ? equipmentResourcesRaw : []

  const equipResMutation = useMutation({
    mutationFn: async ({ action, usageId }: { action: 'use' | 'restore' | 'rest-short' | 'rest-long', usageId?: string }) => {
      if (action === 'use') await equipmentResourcesApi.use(id!, usageId!)
      else if (action === 'restore') await equipmentResourcesApi.restore(id!, usageId!)
      else if (action === 'rest-short') await equipmentResourcesApi.rest(id!, 'short')
      else await equipmentResourcesApi.rest(id!, 'long')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipment-resources', id] }),
  })

  // Local draft state — only set when something is dirty
  const [draft, setDraft] = useState<UpdateCharacterRequest & { currentHp?: number; maxHp?: number } | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [editingConcentration, setEditingConcentration] = useState(false)
  const [concentrationInput, setConcentrationInput] = useState('')
  const [pendingCropSrc, setPendingCropSrc] = useState<string | null>(null)
  const [showAddClassModal, setShowAddClassModal] = useState(false)
  const levelUpActive = useLevelUpStore(s => s.isActive)
  const [showLevelUpWizard, setShowLevelUpWizard] = useState(false)

  // Auto-reopen wizard when returning to StatsPage with an in-progress level-up
  useEffect(() => {
    if (levelUpActive) setShowLevelUpWizard(true)
  }, [levelUpActive])

  const { preferences, updatePreferences } = useUserPreferences()
  const [sectionOrder, setSectionOrder] = useState<StatsSectionId[]>(DEFAULT_SECTION_ORDER)
  const [collapsedSections, setCollapsedSections] = useState<string[]>([])
  const [editModeInternal, setEditModeInternal] = useState(false)
  const editMode = editModeProp !== undefined ? editModeProp : editModeInternal
  const setEditMode = (v: boolean) => {
    if (onSetEditMode) onSetEditMode(v)
    else setEditModeInternal(v)
  }

  useEffect(() => {
    if (!preferences) return
    const saved = preferences.statsSectionOrder ?? []
    const merged: StatsSectionId[] = [
      ...saved.filter((id): id is StatsSectionId => DEFAULT_SECTION_ORDER.includes(id as StatsSectionId)),
      ...DEFAULT_SECTION_ORDER.filter(id => !saved.includes(id)),
    ]
    setSectionOrder(merged)
    setCollapsedSections(preferences.statsSectionCollapsed ?? [])
  }, [preferences]) // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setSectionOrder(prev => {
      const oldIdx = prev.indexOf(active.id as StatsSectionId)
      const newIdx = prev.indexOf(over.id as StatsSectionId)
      const next = arrayMove(prev, oldIdx, newIdx)
      updatePreferences({ statsSectionOrder: next })
      return next
    })
  }

  const toggleCollapse = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = prev.includes(sectionId) ? prev.filter(s => s !== sectionId) : [...prev, sectionId]
      updatePreferences({ statsSectionCollapsed: next })
      return next
    })
  }

  useEffect(() => {
    if (editingName) nameRef.current?.focus()
  }, [editingName])


  const updateMutation = useMutation({
    mutationFn: (req: UpdateCharacterRequest) => charactersApi.update(id!, req),
    onSuccess: (updated) => {
      qc.setQueryData<Character>(['character', id], updated)
      qc.invalidateQueries({ queryKey: ['character', id] })
    },
  })

  const hpMutation = useMutation({
    mutationFn: ({ currentHp, maxHp }: { currentHp: number; maxHp?: number }) =>
      charactersApi.updateHp(id!, currentHp, maxHp),
    onSuccess: (updated) => {
      qc.setQueryData<Character>(['character', id], updated)
      qc.invalidateQueries({ queryKey: ['character', id] })
    },
  })

  const avatarMutation = useMutation({
    mutationFn: (file: File) => charactersApi.uploadAvatar(id!, file),
    onSuccess: (updated) => {
      qc.setQueryData<Character>(['character', id], updated)
      qc.invalidateQueries({ queryKey: ['character', id] })
    },
  })

  const wildShapeMutation = useMutation({
    mutationFn: (req: Parameters<typeof beastsApi.updateWildShape>[1]) =>
      beastsApi.updateWildShape(id!, req),
    onSuccess: (updated) => {
      qc.setQueryData<Character>(['character', id], updated)
      qc.invalidateQueries({ queryKey: ['character', id] })
    },
  })

  // ── Attack form state ──────────────────────────────────────────
  const [showAttackForm, setShowAttackForm] = useState(false)
  const [editingAttack, setEditingAttack] = useState<CharacterAttack | null>(null)
  const [attackForm, setAttackForm] = useState<AddAttackRequest>(BLANK_ATTACK)
  const [deathSavesOpen, setDeathSavesOpen] = useState(false)
  const [conditionsOpen, setConditionsOpen] = useState(false)

  const addAttackMutation = useMutation({
    mutationFn: (req: AddAttackRequest) => attacksApi.add(id!, req),
    onSuccess: (newAttack) => {
      qc.setQueryData<CharacterAttack[]>(['attacks', id], old => [...(old ?? []), newAttack])
      qc.invalidateQueries({ queryKey: ['attacks', id] })
      setShowAttackForm(false)
      setAttackForm(BLANK_ATTACK)
    },
  })
  const updateAttackMutation = useMutation({
    mutationFn: ({ attackId, req }: { attackId: string; req: AddAttackRequest }) =>
      attacksApi.update(id!, attackId, req),
    onSuccess: (updated) => {
      qc.setQueryData<CharacterAttack[]>(['attacks', id], old => old?.map(a => a.id === updated.id ? updated : a) ?? [])
      qc.invalidateQueries({ queryKey: ['attacks', id] })
      setEditingAttack(null)
      setAttackForm(BLANK_ATTACK)
    },
  })
  const deleteAttackMutation = useMutation({
    mutationFn: (attackId: string) => attacksApi.remove(id!, attackId),
    onSuccess: (_void, attackId) => {
      qc.setQueryData<CharacterAttack[]>(['attacks', id], old => old?.filter(a => a.id !== attackId) ?? [])
      qc.invalidateQueries({ queryKey: ['attacks', id] })
    },
  })

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPendingCropSrc(url)
    }
    e.target.value = ''
  }

  const handleCropSave = async (dataUrl: string) => {
    setPendingCropSrc(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    // Convert data URL to File
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
    avatarMutation.mutate(file)
  }

  const handleCropCancel = () => {
    setPendingCropSrc(prev => { if (prev) URL.revokeObjectURL(prev); return null })
  }

  // Auto-fill saving throws from class when a character first loads with no saves set
  useEffect(() => {
    if (!character) return
    const classSaves = CLASS_SAVING_THROWS[character.characterClass]
    if (classSaves && (character.savingThrowProficiencies ?? []).length === 0) {
      updateMutation.mutate({ savingThrowProficiencies: classSaves })
    }
    // Only run when the character ID changes (new character loaded)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.id])

  // ── Callbacks that must be declared before any early return ──────────────
  // (React requires hooks to be called in the same order every render)

  const save = useCallback(async (pendingDraft: NonNullable<typeof draft>) => {
    if (!character) return
    const { currentHp, maxHp, ...charUpdate } = pendingDraft
    const tasks: Promise<unknown>[] = []
    if (Object.keys(charUpdate).length > 0) tasks.push(updateMutation.mutateAsync(charUpdate))
    if (currentHp !== undefined || maxHp !== undefined) {
      tasks.push(hpMutation.mutateAsync({
        currentHp: currentHp ?? character.currentHp,
        maxHp: maxHp ?? character.maxHp,
      }))
    }
    try {
      await Promise.all(tasks)
      setDraft(null)
      setEditingName(false)
    } catch {
      // Errors surfaced via mutation.isError; draft kept so a retry is possible
    }
  }, [character, updateMutation, hpMutation]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateClassEntry = useCallback((idx: number, patch: Partial<CharacterClassEntry>) => {
    if (!character) return
    const updated = effectiveClasses.map((e, i) => i === idx ? { ...e, ...patch } : e)
    const totalLevel = updated.reduce((s, e) => s + e.level, 0)
    const req: UpdateCharacterRequest = { classes: updated, level: totalLevel }
    // Keep primary characterClass/subclass in sync with first class entry
    if (idx === 0) {
      if (patch.characterClass) req.characterClass = patch.characterClass
      if (patch.subclass !== undefined) req.subclass = patch.subclass
    }
    updateMutation.mutate(req)
    qc.setQueryData<Character>(['character', id], c => c ? { ...c, classes: updated, level: totalLevel, ...(req.characterClass ? { characterClass: req.characterClass } : {}), ...(req.subclass !== undefined ? { subclass: req.subclass } : {}) } : c)
    qc.invalidateQueries({ queryKey: ['character', id] })
  }, [character, effectiveClasses, id, qc, updateMutation])

  const handleAddClass = useCallback((entry: CharacterClassEntry) => {
    if (!character) return
    const newClasses = [...effectiveClasses, entry]
    const totalLevel = newClasses.reduce((s, e) => s + e.level, 0)
    updateMutation.mutate({ classes: newClasses, level: totalLevel })
    qc.setQueryData<Character>(['character', id], c => c ? { ...c, classes: newClasses, level: totalLevel } : c)
    qc.invalidateQueries({ queryKey: ['character', id] })
    setShowAddClassModal(false)
  }, [character, effectiveClasses, id, qc, updateMutation])

  const handleRemoveClass = useCallback((idx: number) => {
    if (effectiveClasses.length <= 1) return
    const newClasses = effectiveClasses.filter((_, i) => i !== idx)
    const totalLevel = newClasses.reduce((s, e) => s + e.level, 0)
    const req: UpdateCharacterRequest = { classes: newClasses, level: totalLevel }
    // When back to single-class, sync primary fields
    if (newClasses.length === 1) {
      req.characterClass = newClasses[0].characterClass
      req.subclass = newClasses[0].subclass
    }
    updateMutation.mutate(req)
    qc.setQueryData<Character>(['character', id], c => c ? { ...c, ...req } : c)
    qc.invalidateQueries({ queryKey: ['character', id] })
  }, [effectiveClasses, id, qc, updateMutation])

  if (isLoading || !character) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Loading…</div>
  )

  const d = {
    name: draft?.name ?? character.name,
    level: draft?.level ?? character.level,
    subclass: draft?.subclass ?? character.subclass,
    characterClass: (draft?.characterClass ?? character.characterClass) as CharacterClass,
    abilityScores: draft?.abilityScores ?? character.abilityScores,
    baseArmorClass: draft?.baseArmorClass ?? character.baseArmorClass,
    currentHp: draft?.currentHp ?? character.currentHp,
    maxHp: draft?.maxHp ?? character.maxHp,
    savingThrowProficiencies: draft?.savingThrowProficiencies ?? character.savingThrowProficiencies ?? [],
    skillProficiencies: draft?.skillProficiencies ?? character.skillProficiencies ?? [],
    skillExpertise: draft?.skillExpertise ?? character.skillExpertise ?? [],
    activeConditions: draft?.activeConditions ?? character.activeConditions ?? [],
    deathSaveSuccesses: draft?.deathSaveSuccesses ?? character.deathSaveSuccesses ?? 0,
    deathSaveFailures: draft?.deathSaveFailures ?? character.deathSaveFailures ?? 0,
    exhaustionLevel: draft?.exhaustionLevel ?? character.exhaustionLevel ?? 0,
    concentrationSpell: draft?.concentrationSpell !== undefined ? draft.concentrationSpell : character.concentrationSpell,
  }

  const getRacialBonus = (key: string) => {
    if (!race) return 0
    const fixed = race.modifiers
      .filter(m => m.type === 'ability_score' && m.ability?.toLowerCase() === key.toLowerCase())
      .reduce((sum, m) => sum + m.value, 0)
    const chosen = character.raceChoices?.[key] ?? 0
    return fixed + chosen
  }

  const getAsiBonus = (key: string) =>
    charFeats
      .filter(f => f.featIndex === 'ability-score-improvement' && f.notes)
      .reduce((sum, f) => {
        try { return sum + (JSON.parse(f.notes!).asiChoices?.[key] ?? 0) } catch { return sum }
      }, 0)

  const totalAbilityScore = (key: string) =>
    (d.abilityScores[key] ?? 10) + getRacialBonus(key) + getAsiBonus(key)

  const totalScores = Object.fromEntries(ABILITY_KEYS.map(k => [k, totalAbilityScore(k)]))

  const acInfo = calculateAC(character.characterClass, totalScores, inventory, d.baseArmorClass, charFeats, allClassFeatures)

  const patch = (fields: Partial<typeof d>) => {
    const newDraft = { ...(draft ?? {}), ...fields }
    setDraft(newDraft)
    save(newDraft)
  }

  const abilityMod = (key: string) => Math.floor((totalAbilityScore(key) - 10) / 2)
  const featInitBonus = getFeatModifier(charFeats, 'initiative')
  const featPassivePercBonus = getFeatModifier(charFeats, 'passive_perception')
  const featHpPerLevel = getFeatModifier([...charFeats, ...allClassFeatures], 'hp_per_level')
  const movementBonus = getMovementBonus(allClassFeatures)
  const charismaModifier = abilityMod('Charisma')
  const savingThrowChaBonus = getFeatModifier(allClassFeatures, 'saving_throw_cha_mod') * charismaModifier
  const equippedSavingThrowBonus = inventory
    .filter(i => i.isEquipped)
    .reduce((s, i) => s + (i.savingThrowBonus ?? 0), 0)
  const profBonusNum = Math.floor((d.level - 1) / 4) + 2
  const hasJackOfAllTrades = allClassFeatures.some(f => f.index === 'bard-jack-of-all-trades')
  const jackBonus = hasJackOfAllTrades ? Math.floor(profBonusNum / 2) : 0
  const perceptionSkillBonus = d.skillExpertise.includes('Perception')
    ? profBonusNum * 2
    : d.skillProficiencies.includes('Perception')
    ? profBonusNum
    : jackBonus
  const passivePerception = 10 + abilityMod('Wisdom') + perceptionSkillBonus + featPassivePercBonus
  const initiative = abilityMod('Dexterity') + featInitBonus
  const maxHpWithFeats = d.maxHp + featHpPerLevel * d.level

  const toggleSaveProficiency = (key: string) => {
    const updated = d.savingThrowProficiencies.includes(key)
      ? d.savingThrowProficiencies.filter(k => k !== key)
      : [...d.savingThrowProficiencies, key]
    patch({ savingThrowProficiencies: updated })
  }

  const toggleSkillProficiency = (name: string) => {
    const isProficient = d.skillProficiencies.includes(name)
    const isExpert = d.skillExpertise.includes(name)
    const bgSkills = character.background ? (BACKGROUND_SKILLS[character.background] ?? []) : []
    const classSkills = character.classSkillProficiencies ?? []
    const isLocked = bgSkills.includes(name) || classSkills.includes(name)

    if (!isProficient) {
      // Not proficient → proficient
      patch({ skillProficiencies: [...d.skillProficiencies, name] })
    } else if (!isExpert) {
      // Proficient → expert
      patch({ skillExpertise: [...d.skillExpertise, name] })
    } else if (isLocked) {
      // Expert (locked) → remove expertise only, stay proficient
      patch({ skillExpertise: d.skillExpertise.filter(n => n !== name) })
    } else {
      // Expert (unlocked) → remove both
      patch({ skillProficiencies: d.skillProficiencies.filter(n => n !== name), skillExpertise: d.skillExpertise.filter(n => n !== name) })
    }
  }

  const fmtMod = (n: number) => n >= 0 ? `+${n}` : `${n}`
  const skillList = DND5E_SKILLS
  const saveList = ABILITY_KEYS.map(k => ({ name: k, ability: k }))

  const castingAbility = CASTER_ABILITY[character.characterClass]
  const castingAbilityMod = castingAbility ? abilityMod(castingAbility) : null
  const spellSaveDC = castingAbilityMod !== null ? 8 + profBonusNum + castingAbilityMod : null
  const spellAttackBonus = castingAbilityMod !== null ? profBonusNum + castingAbilityMod : null

  // sneak_attack_dice entries each represent the TOTAL at that tier; take the highest, not sum
  const sneakAttackDice = allClassFeatures
    .flatMap(f => f.modifiers)
    .filter(m => m.type === 'sneak_attack_dice')
    .reduce((max, m) => Math.max(max, m.value), 0)

  const maxSkillProficiencies = null // No cap for D&D 5e / Custom — free selection
  const atSkillLimit = maxSkillProficiencies !== null && d.skillProficiencies.length >= maxSkillProficiencies

  const subclassList = SUBCLASSES[d.characterClass] ?? []

  // Expertise: all proficient skills across all sources (for the skill picker)
  const bgSkillsForExpertise = character.background ? (BACKGROUND_SKILLS[character.background] ?? []) : []
  const allProficientSkills = Array.from(new Set([
    ...d.skillProficiencies,
    ...(character.classSkillProficiencies ?? []),
    ...bgSkillsForExpertise,
  ])).sort()
  const expertiseFeatureIndices = new Set(['rogue-expertise', 'rogue-expertise-2', 'bard-expertise'])
  const totalExpertiseSlots = allClassFeatures.filter(f => expertiseFeatureIndices.has(f.index)).length * 2
  const toggleExpertise = (skill: string) => {
    const already = d.skillExpertise.includes(skill)
    patch({
      skillExpertise: already
        ? d.skillExpertise.filter(s => s !== skill)
        : [...d.skillExpertise, skill],
    })
  }

  const hpPct = maxHpWithFeats > 0 ? Math.max(0, Math.min(100, (d.currentHp / maxHpWithFeats) * 100)) : 0
  const hpColour = hpPct > 50 ? 'bg-green-500' : hpPct > 25 ? 'bg-amber-500' : 'bg-red-500'

  const getSectionActions = (sectionId: StatsSectionId): React.ReactNode => {
    switch (sectionId) {
      case 'feats':
        return (
          <button onClick={() => navigate(`/characters/${id}/feats`)} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Manage →</button>
        )
      case 'class-resources':
        if (classResources.length === 0) return undefined
        return (
          <>
            <button
              onClick={() => resourceMutation.mutate({ action: 'short-rest' })}
              disabled={resourceMutation.isPending}
              className="text-[10px] px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 disabled:opacity-40 transition-colors"
              title="Short Rest"
            >⏱ Short</button>
            <button
              onClick={() => resourceMutation.mutate({ action: 'long-rest', currentExhaustion: d.exhaustionLevel })}
              disabled={resourceMutation.isPending}
              className="text-[10px] px-2 py-0.5 rounded bg-indigo-700 hover:bg-indigo-600 text-white disabled:opacity-40 transition-colors"
              title="Long Rest"
            >🌙 Long</button>
          </>
        )
      default:
        return undefined
    }
  }

  // ── Multiclass helpers ────────────────────────────────────────────
  /** True when character has more than one class entry */
  const isMulticlass = effectiveClasses.length > 1

  const renderSection = (sectionId: StatsSectionId): React.ReactNode => {
    switch (sectionId) {
      case 'identity':
        return (
          <div className="px-4 pb-4 pt-1">
            {/* Outer flex: fields left, avatar right spanning full height */}
            <div className="flex gap-3 items-stretch">
              {/* Fields column */}
              <div className="flex-1 space-y-2">
                {/* Name + Level row */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-0.5">Name</p>
                    {editingName ? (
                      <input
                        ref={nameRef}
                        className="w-full bg-gray-800 text-white text-sm font-bold rounded-lg px-3 py-1.5 border border-indigo-500 focus:outline-none"
                        value={d.name}
                        onChange={e => patch({ name: e.target.value })}
                        onBlur={() => setEditingName(false)}
                        onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
                      />
                    ) : (
                      <button
                        className="text-sm font-bold hover:text-indigo-300 transition-colors text-left"
                        onClick={() => setEditingName(true)}
                      >
                        {d.name} <span className="text-gray-600 text-xs font-normal">✏</span>
                      </button>
                    )}
                  </div>
                  <div className="w-16 shrink-0">
                    <p className="text-xs text-gray-400 mb-0.5">Level</p>
                    {isMulticlass ? (
                      <p className="font-bold text-lg text-white">{d.level}</p>
                    ) : (
                      <EditableNumber value={d.level} onChange={v => patch({ level: v })} min={1} max={20} label="Level" className="font-bold text-lg" />
                    )}
                  </div>
                </div>

                {/* Race + Subrace */}
                {character.gameType === 'dnd5e' && (
                  <RaceSelector characterId={character.id} currentRace={character.race} currentRaceChoices={character.raceChoices} currentSkillProficiencies={character.skillProficiencies ?? []} />
                )}

                {/* Class + Subclass — multiclass or single-class */}
                {isMulticlass ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">Classes</p>
                      {character.gameType === 'dnd5e' && (
                        <button
                          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                          onClick={() => setShowAddClassModal(true)}
                        >
                          + Add Class
                        </button>
                      )}
                    </div>
                    {effectiveClasses.map((entry, idx) => {
                      const subclassOpts = SUBCLASSES[entry.characterClass] ?? []
                      return (
                        <div key={entry.characterClass} className="flex gap-1.5 items-center bg-gray-800/60 rounded-lg px-2 py-1.5">
                          <span className="text-xs font-medium text-white flex-shrink-0 w-20 truncate">{entry.characterClass}</span>
                          <div className="flex-shrink-0">
                            <EditableNumber
                              value={entry.level}
                              onChange={v => updateClassEntry(idx, { level: v })}
                              min={1} max={20}
                              label={`${entry.characterClass} Level`}
                              className="text-sm font-bold"
                            />
                          </div>
                          <select
                            className="flex-1 min-w-0 bg-gray-700 text-white rounded px-1.5 py-1 text-xs border border-gray-600 focus:border-indigo-500 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                            value={entry.subclass}
                            disabled={subclassOpts.length === 0}
                            onChange={e => updateClassEntry(idx, { subclass: e.target.value })}
                          >
                            <option value="None">— None —</option>
                            {subclassOpts.map(s => (
                              <option key={s} value={s}>{formatSubclass(s, entry.characterClass)}</option>
                            ))}
                          </select>
                          {effectiveClasses.length > 1 && (
                            <button
                              className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0 text-sm leading-none"
                              onClick={() => handleRemoveClass(idx)}
                              title={`Remove ${entry.characterClass}`}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <p className="text-xs text-gray-400 mb-0.5">Class</p>
                        {character.gameType === 'dnd5e' ? (
                          <select
                            className="w-full bg-gray-800 text-white rounded-lg px-2 py-1.5 border border-gray-700 focus:border-indigo-500 focus:outline-none text-xs font-medium"
                            value={d.characterClass}
                            onChange={e => {
                              const cls = e.target.value as CharacterClass
                              patch({ characterClass: cls, subclass: 'None' })
                            }}
                          >
                            {DND5E_CLASSES.map(cls => (
                              <option key={cls} value={cls}>{cls}</option>
                            ))}
                          </select>
                        ) : (
                          <p className="font-medium text-sm">{character.characterClass}</p>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-400 mb-1">Subclass</p>
                        <select
                          className="w-full bg-gray-800 text-white rounded-lg px-2 py-1.5 border border-gray-700 focus:border-indigo-500 focus:outline-none text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                          value={d.subclass ?? 'None'}
                          disabled={subclassList.length === 0}
                          onChange={e => patch({ subclass: e.target.value })}
                        >
                          <option value="None">— None —</option>
                          {subclassList.map(s => (
                            <option key={s} value={s}>{formatSubclass(s, d.characterClass)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {character.gameType === 'dnd5e' && (
                      <button
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                        onClick={() => setShowAddClassModal(true)}
                      >
                        + Add Class
                      </button>
                    )}
                  </div>
                )}

                {/* Background */}
                {character.gameType === 'dnd5e' && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Background</p>
                    <BackgroundSelector characterId={character.id} currentBackground={character.background} currentSkillProficiencies={d.skillProficiencies} />
                  </div>
                )}

                {/* Level Up / Level Down buttons */}
                {character.gameType === 'dnd5e' && (
                  <button
                    className="w-full mt-1 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl text-sm font-medium transition-colors"
                    onClick={() => setShowLevelUpWizard(true)}
                  >
                    ▲ Level Up
                  </button>
                )}
              </div>

              {/* Avatar column — fixed square circle, bottom-aligned with fields */}
              <div className="shrink-0 self-end">
                <label className="relative cursor-pointer group block w-44 h-44" title="Click to upload avatar">
                  <div className="w-full h-full rounded-full bg-gray-800 border-2 border-gray-700 overflow-hidden flex items-center justify-center group-hover:border-indigo-500 transition-colors">
                    {character.avatarBase64 ? (
                      <img src={character.avatarBase64} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl select-none">🧙</span>
                    )}
                    {avatarMutation.isPending && (
                      <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white">...</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-full transition-colors flex items-center justify-center">
                      <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity font-medium">Change</span>
                    </div>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
              </div>
            </div>

            {/* Avatar crop modal */}
            {pendingCropSrc && (
              <AvatarCropModal
                imageSrc={pendingCropSrc}
                onSave={handleCropSave}
                onCancel={handleCropCancel}
              />
            )}

            {/* Add Class modal */}
            {showAddClassModal && (
              <AddClassModal
                existingClasses={effectiveClasses}
                abilityScores={character.abilityScores}
                gameType={character.gameType}
                onConfirm={handleAddClass}
                onCancel={() => setShowAddClassModal(false)}
              />
            )}

            {/* Level Up Wizard */}
            {showLevelUpWizard && (
              <LevelUpWizard
                character={character}
                characterId={character.id}
                onClose={() => setShowLevelUpWizard(false)}
              />
            )}
          </div>
        )

      case 'combat':
        return (
          <div className="px-4 pb-4 pt-1 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-400">Hit Points</span>
                <div className="flex items-center gap-1 text-sm">
                  <EditableNumber value={d.currentHp} onChange={v => patch({ currentHp: Math.min(v, maxHpWithFeats) })} min={0} max={maxHpWithFeats} label="Current HP" className="w-12 text-center font-bold text-lg" />
                  <span className="text-gray-500">/</span>
                  <EditableNumber value={d.maxHp} onChange={v => patch({ maxHp: v, currentHp: Math.min(d.currentHp, v) })} min={0} label="Max HP" className="w-12 text-center text-gray-400" />
                  {featHpPerLevel > 0 && (
                    <span className="text-xs text-indigo-400 ml-1">(+{featHpPerLevel * d.level} feats)</span>
                  )}
                </div>
              </div>
              <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className={`h-full ${hpColour} rounded-full transition-all`} style={{ width: `${hpPct}%` }} />
              </div>
            </div>

            <div>
              <button onClick={() => setDeathSavesOpen(v => !v)} className="w-full flex items-center justify-between mb-1 group">
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Death Saves</span>
                <span className={`text-gray-600 text-xs transition-transform duration-300 ${deathSavesOpen ? 'rotate-0' : '-rotate-90'}`}>▼</span>
              </button>
              <div className={`grid transition-all duration-300 ${deathSavesOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-6 pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400 w-16">Successes</span>
                      {[0, 1, 2].map(i => (
                        <button key={i} onClick={() => patch({ deathSaveSuccesses: d.deathSaveSuccesses > i ? i : i + 1 })} className={`w-4 h-4 rounded-full border-2 transition-colors ${i < d.deathSaveSuccesses ? 'bg-green-500 border-green-500' : 'border-green-800 hover:border-green-600'}`} title={`Success ${i + 1}`} />
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400 w-14">Failures</span>
                      {[0, 1, 2].map(i => (
                        <button key={i} onClick={() => patch({ deathSaveFailures: d.deathSaveFailures > i ? i : i + 1 })} className={`w-4 h-4 rounded-full border-2 transition-colors ${i < d.deathSaveFailures ? 'bg-red-500 border-red-500' : 'border-red-800 hover:border-red-600'}`} title={`Failure ${i + 1}`} />
                      ))}
                      {d.deathSaveFailures >= 3 && <span className="text-red-400 text-xs ml-1">💀 Dead</span>}
                    </div>
                    {d.deathSaveSuccesses >= 3 && <span className="text-green-400 text-xs">🛡️ Stable</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Armor Class</p>
                <p className="text-xl font-bold">{acInfo.total}</p>
                <p className="text-xs text-indigo-400 mt-0.5">{acInfo.breakdown}</p>
                {!acInfo.isAutoCalc && <p className="text-xs text-yellow-600 mt-0.5">Set armor type for DEX calc</p>}
                <div className="mt-1.5">
                  <label className="text-xs text-gray-400">Bonus</label>
                  <EditableNumber value={d.baseArmorClass} onChange={v => patch({ baseArmorClass: v })} min={-10} label="AC Bonus" className="text-xs font-medium text-gray-300 ml-1" />
                </div>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Initiative</p>
                <p className="text-xl font-bold">{initiative >= 0 ? `+${initiative}` : initiative}</p>
                <p className="text-xs text-gray-400 mt-0.5">DEX{featInitBonus !== 0 ? ` ${featInitBonus >= 0 ? '+' : ''}${featInitBonus} feat` : ''}</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Prof. Bonus</p>
                <p className="text-xl font-bold">{profBonus(d.level)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Lv {d.level}</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Passive Perception</p>
                <p className="text-xl font-bold">{passivePerception}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  10 + WIS
                  {d.skillExpertise.includes('Perception') ? ' + exp' : d.skillProficiencies.includes('Perception') ? ' + prof' : hasJackOfAllTrades ? ' + ½prof' : ''}
                  {featPassivePercBonus !== 0 ? ` +${featPassivePercBonus} feat` : ''}
                </p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Speed</p>
                <p className="text-xl font-bold">{(race?.speed ?? 30) + movementBonus} ft</p>
                <p className="text-xs text-gray-400 mt-0.5">{race?.speed ?? 30}{movementBonus > 0 ? ` +${movementBonus} class` : ''}</p>
              </div>
              {spellSaveDC !== null && (
                <>
                  <div className="bg-gray-800 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">Spell Save DC</p>
                    <p className="text-xl font-bold">{spellSaveDC}</p>
                    <p className="text-xs text-gray-400 mt-0.5">8 + prof + {ABILITY_SHORT[castingAbility!]}</p>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">Spell Attack</p>
                    <p className="text-xl font-bold">{fmtMod(spellAttackBonus!)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">prof + {ABILITY_SHORT[castingAbility!]}</p>
                  </div>
                </>
              )}
            </div>

            {spellSaveDC !== null && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400">Concentrating:</span>
                {d.concentrationSpell && !editingConcentration ? (
                  <div className="flex items-center gap-1 bg-purple-900/40 border border-purple-700/60 rounded-lg px-2 py-0.5">
                    <span className="text-xs text-purple-300 cursor-pointer" onClick={() => { setConcentrationInput(d.concentrationSpell ?? ''); setEditingConcentration(true) }}>{d.concentrationSpell}</span>
                    <button onClick={() => patch({ concentrationSpell: '' })} className="text-gray-500 hover:text-white text-sm leading-none ml-1">×</button>
                  </div>
                ) : editingConcentration ? (
                  <input
                    value={concentrationInput}
                    onChange={e => setConcentrationInput(e.target.value)}
                    onBlur={() => { patch({ concentrationSpell: concentrationInput || '' }); setEditingConcentration(false) }}
                    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditingConcentration(false) }}
                    autoFocus
                    placeholder="Spell name..."
                    className="bg-gray-800 border border-purple-700/60 rounded-lg px-2 py-0.5 text-xs text-purple-300 outline-none focus:border-purple-500 w-36"
                  />
                ) : (
                  <button onClick={() => { setConcentrationInput(''); setEditingConcentration(true) }} className="text-xs text-gray-600 hover:text-purple-400 transition-colors border border-dashed border-gray-700 rounded-lg px-2 py-0.5">+ Set spell</button>
                )}
              </div>
            )}

            <div>
              <button onClick={() => setConditionsOpen(v => !v)} className="w-full flex items-center justify-between mb-1 group">
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Conditions</span>
                <span className={`text-gray-600 text-xs transition-transform duration-300 ${conditionsOpen ? 'rotate-0' : '-rotate-90'}`}>▼</span>
              </button>
              <div className={`grid transition-all duration-300 ${conditionsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <div className="flex flex-wrap gap-1 pt-1">
                    {(['Blinded','Charmed','Deafened','Frightened','Grappled','Incapacitated','Invisible','Paralyzed','Petrified','Poisoned','Prone','Restrained','Stunned','Unconscious'] as const).map(c => {
                      const active = d.activeConditions.includes(c)
                      return (
                        <button
                          key={c}
                          onClick={() => patch({ activeConditions: active ? d.activeConditions.filter(x => x !== c) : [...d.activeConditions, c] })}
                          className={`text-[10px] px-1.5 py-0.5 rounded-md border transition-colors ${active ? 'bg-red-900/60 border-red-600 text-red-300' : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-500'}`}
                        >{c}</button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">Exhaustion</span>
              <div className="flex items-center gap-1">
                <button onClick={() => patch({ exhaustionLevel: Math.max(0, d.exhaustionLevel - 1) })} disabled={d.exhaustionLevel === 0} className="w-6 h-6 rounded bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 flex items-center justify-center text-sm">−</button>
                <span className={`text-sm font-bold w-6 text-center ${d.exhaustionLevel === 0 ? 'text-gray-500' : d.exhaustionLevel >= 5 ? 'text-red-400' : 'text-amber-400'}`}>{d.exhaustionLevel}</span>
                <button onClick={() => patch({ exhaustionLevel: Math.min(6, d.exhaustionLevel + 1) })} disabled={d.exhaustionLevel === 6} className="w-6 h-6 rounded bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 flex items-center justify-center text-sm">+</button>
              </div>
              {d.exhaustionLevel > 0 && (
                <span className="text-[10px] text-gray-500">
                  {['','Disadv. checks','Speed halved','Disadv. attacks+saves','Max HP halved','Speed 0','Death'][d.exhaustionLevel]}
                </span>
              )}
            </div>
          </div>
        )

      case 'attacks':
        return (
          <AttacksSection
            bare
            character={character}
            inventory={inventory}
            customAttacks={customAttacks}
            allBeasts={allBeasts}
            abilityScores={totalScores}
            profBonusNum={profBonusNum}
            sneakAttackDice={sneakAttackDice}
            showAttackForm={showAttackForm}
            setShowAttackForm={setShowAttackForm}
            editingAttack={editingAttack}
            setEditingAttack={setEditingAttack}
            attackForm={attackForm}
            setAttackForm={setAttackForm}
            onAddAttack={(req) => addAttackMutation.mutate(req)}
            onUpdateAttack={(args) => updateAttackMutation.mutate(args)}
            onDeleteAttack={(attackId) => deleteAttackMutation.mutate(attackId)}
            addAttackPending={addAttackMutation.isPending}
            updateAttackPending={updateAttackMutation.isPending}
          />
        )

      case 'ability-saves-skills':
        return (
          <div className="px-4 pb-4 pt-2">
            <div className="flex gap-3 items-start">
              <div className="flex-1 min-w-0 flex flex-col gap-3">
                <AbilityScoresSection
                  bare
                  character={character}
                  race={race}
                  abilityScores={d.abilityScores}
                  getRacialBonus={getRacialBonus}
                  getAsiBonus={getAsiBonus}
                  patch={patch}
                />
                <SavingThrowsSection
                  bare
                  character={character}
                  saveList={saveList}
                  savingThrowProficiencies={d.savingThrowProficiencies}
                  abilityMod={abilityMod}
                  profBonusNum={profBonusNum}
                  savingThrowChaBonus={savingThrowChaBonus}
                  equippedSavingThrowBonus={equippedSavingThrowBonus}
                  toggleSaveProficiency={toggleSaveProficiency}
                  patch={patch}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Skills</h2>
                  <span className={`text-xs font-semibold ${atSkillLimit ? 'text-amber-400' : 'text-gray-500'}`}>
                    {maxSkillProficiencies !== null
                      ? `${d.skillProficiencies.length}/${maxSkillProficiencies}`
                      : `${d.skillProficiencies.length} selected`}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {skillList.map(({ name, ability }) => {
                    const isProficient = d.skillProficiencies.includes(name)
                    const isExpert = d.skillExpertise.includes(name)
                    const bgSkills = character.background ? (BACKGROUND_SKILLS[character.background] ?? []) : []
                    const classSkills = character.classSkillProficiencies ?? []
                    const isFromBackground = bgSkills.includes(name)
                    const isFromClass = classSkills.includes(name)
                    const disabled = !isProficient && atSkillLimit
                    const total = abilityMod(ability) + (isExpert ? profBonusNum * 2 : isProficient ? profBonusNum : jackBonus)
                    const dotColour = isExpert
                      ? isFromBackground ? 'bg-amber-300 border-amber-300'
                      : isFromClass ? 'bg-purple-300 border-purple-300'
                      : 'bg-cyan-400 border-cyan-400'
                      : isProficient
                      ? isFromBackground ? 'bg-amber-500 border-amber-500'
                      : isFromClass ? 'bg-purple-500 border-purple-500'
                      : 'bg-indigo-500 border-indigo-500'
                      : hasJackOfAllTrades ? 'border-yellow-700 bg-yellow-900/40'
                      : 'border-gray-500'
                    const scoreColour = isExpert
                      ? isFromBackground ? 'text-amber-200'
                      : isFromClass ? 'text-purple-200'
                      : 'text-cyan-300'
                      : isProficient
                      ? isFromBackground ? 'text-amber-300'
                      : isFromClass ? 'text-purple-300'
                      : 'text-indigo-300'
                      : hasJackOfAllTrades ? 'text-yellow-600'
                      : 'text-gray-300'
                    return (
                      <button
                        key={name}
                        onClick={() => !disabled && toggleSkillProficiency(name)}
                        disabled={disabled}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left ${disabled ? 'opacity-35 cursor-not-allowed' : 'hover:bg-gray-800'}`}
                      >
                        <span className={`w-3 h-3 rounded-full border-2 flex-shrink-0 transition-all ${dotColour}${isExpert ? ' ring-2 ring-offset-1 ring-offset-gray-900 ring-white/50' : ''}`} />
                        <span className="flex-1 text-xs truncate">{name}</span>
                        {isFromBackground && isProficient && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-amber-900/60 text-amber-400">bg</span>
                        )}
                        {isFromClass && isProficient && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-purple-900/60 text-purple-400">cl</span>
                        )}
                        {isExpert && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-cyan-900/60 text-cyan-400">ex</span>
                        )}
                        <span className={`text-xs font-semibold w-6 text-right flex-shrink-0 ${scoreColour}`}>{fmtMod(total)}</span>
                      </button>
                    )
                  })}
                </div>
                {character.gameType === 'dnd5e' && CLASS_SKILL_OPTIONS[character.characterClass] && (
                  <div className="mt-2 pt-2 border-t border-gray-800">
                    <ClassSkillsSelector
                      characterId={character.id}
                      characterClass={character.characterClass}
                      classSkillProficiencies={character.classSkillProficiencies ?? []}
                      allSkillProficiencies={d.skillProficiencies}
                    />
                  </div>
                )}
                <p className="text-xs text-gray-600 mt-2 text-center">Prof {fmtMod(profBonusNum)}</p>
              </div>
            </div>
          </div>
        )

      case 'feats':
        return charFeats.length > 0
          ? <FeatsSection bare charFeats={charFeats} characterId={character.id} />
          : <p className="px-4 pb-4 pt-2 text-xs text-gray-500">No active feats.</p>

      case 'class-resources':
        return (classResources.length > 0 || equipmentResources.length > 0)
          ? (
            <ClassResourcesSection
              bare
              classResources={classResources}
              equipmentResources={equipmentResources}
              classFeatures={allClassFeatures}
              characterLevel={d.level}
              onResourceAction={(args) => resourceMutation.mutate(args)}
              resourcePending={resourceMutation.isPending}
              onEquipResAction={(args) => equipResMutation.mutate(args)}
              equipResPending={equipResMutation.isPending}
            />
          )
          : <p className="px-4 pb-4 pt-2 text-xs text-gray-500">No class resources.</p>

      case 'class-features': {
        const hasDruid = effectiveClasses.some(c => resolveClassName(c.characterClass) === 'druid')
        if (!hasDruid) return null
        return (
          <ClassFeaturesSection
            bare
            character={character}
            allBeasts={allBeasts}
            onWildShapeAction={(req) => wildShapeMutation.mutate(req)}
            wildShapePending={wildShapeMutation.isPending}
          />
        )
      }

      case 'class-abilities':
        return character.gameType === 'dnd5e'
          ? (
            <ClassAbilitiesSection
              bare
              classFeatures={allClassFeatures}
              skillExpertise={d.skillExpertise}
              allProficientSkills={allProficientSkills}
              totalExpertiseSlots={totalExpertiseSlots}
              onToggleExpertise={toggleExpertise}
            />
          )
          : null
    }
  }

  return (
    <div className={embedded ? 'bg-gray-950 text-white flex flex-col' : 'min-h-screen bg-gray-950 text-white flex flex-col'}>
      {!embedded && (
        <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/characters/${id}`)} aria-label="Go back" className="text-gray-400 hover:text-white">←</button>
          {editingName ? (
            <input
              ref={nameRef}
              className="flex-1 bg-gray-800 text-white text-lg font-bold rounded-lg px-3 py-1.5 border border-indigo-500 focus:outline-none"
              value={d.name}
              onChange={e => patch({ name: e.target.value })}
              onBlur={() => setEditingName(false)}
              onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
            />
          ) : (
            <button
              className="flex-1 text-left text-lg font-bold hover:text-indigo-300 transition-colors truncate"
              onClick={() => setEditingName(true)}
              title="Click to edit name"
            >
              {d.name} <span className="text-gray-600 text-sm font-normal">✏</span>
            </button>
          )}
        </header>
      )}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">
          {!embedded && (
            <div className="flex justify-end">
              {editMode ? (
                <button onClick={() => setEditMode(false)} className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors font-medium">
                  ✓ Done
                </button>
              ) : (
                <button onClick={() => setEditMode(true)} className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
                  ✎ Edit Layout
                </button>
              )}
            </div>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
              {sectionOrder.map(sectionId => {
                const meta = STATS_SECTIONS.find(s => s.id === sectionId)
                if (!meta) return null
                const content = renderSection(sectionId)
                if (content === null) return null
                return (
                  <SortableSection
                    key={sectionId}
                    id={sectionId}
                    label={meta.label}
                    editMode={editMode}
                    collapsed={collapsedSections.includes(sectionId)}
                    onToggleCollapse={() => toggleCollapse(sectionId)}
                    actions={getSectionActions(sectionId)}
                  >
                    {content}
                  </SortableSection>
                )
              })}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  )
}
