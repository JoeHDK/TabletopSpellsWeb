import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { resizeImage } from '../utils/resizeImage'
import { lookupArmor } from '../utils/armorTable'
import type { Character, UpdateCharacterRequest, CharacterAttack, AddAttackRequest, InventoryItem, CharacterFeat, ClassFeature, ClassResource, Race, EquipmentResource } from '../types'
import { AbilityScoresSection, SavingThrowsSection, AttacksSection, BLANK_ATTACK, ClassResourcesSection, ClassFeaturesSection, FeatsSection } from '../components/stats'
import { CLASS_SAVING_THROWS, ABILITY_KEYS, ABILITY_SHORT } from '../components/stats/statsConstants'

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

const PF1E_SKILLS = [
  { name: 'Acrobatics', ability: 'Dexterity' },
  { name: 'Appraise', ability: 'Intelligence' },
  { name: 'Bluff', ability: 'Charisma' },
  { name: 'Climb', ability: 'Strength' },
  { name: 'Diplomacy', ability: 'Charisma' },
  { name: 'Disable Device', ability: 'Dexterity' },
  { name: 'Disguise', ability: 'Charisma' },
  { name: 'Escape Artist', ability: 'Dexterity' },
  { name: 'Fly', ability: 'Dexterity' },
  { name: 'Handle Animal', ability: 'Charisma' },
  { name: 'Heal', ability: 'Wisdom' },
  { name: 'Intimidate', ability: 'Charisma' },
  { name: 'Know: Arcana', ability: 'Intelligence' },
  { name: 'Know: History', ability: 'Intelligence' },
  { name: 'Know: Nature', ability: 'Intelligence' },
  { name: 'Know: Planes', ability: 'Intelligence' },
  { name: 'Know: Religion', ability: 'Intelligence' },
  { name: 'Linguistics', ability: 'Intelligence' },
  { name: 'Perception', ability: 'Wisdom' },
  { name: 'Perform', ability: 'Charisma' },
  { name: 'Ride', ability: 'Dexterity' },
  { name: 'Sense Motive', ability: 'Wisdom' },
  { name: 'Sleight of Hand', ability: 'Dexterity' },
  { name: 'Spellcraft', ability: 'Intelligence' },
  { name: 'Stealth', ability: 'Dexterity' },
  { name: 'Survival', ability: 'Wisdom' },
  { name: 'Swim', ability: 'Strength' },
  { name: 'Use Magic Device', ability: 'Charisma' },
]

const PF1E_SAVES = [
  { name: 'Fortitude', ability: 'Constitution' },
  { name: 'Reflex', ability: 'Dexterity' },
  { name: 'Will', ability: 'Wisdom' },
]

// Pathfinder 1e: base skill ranks per level (add INT mod × level for total)
const PF1E_SKILL_RANKS_PER_LEVEL: Record<string, number> = {
  Alchemist: 4, Barbarian: 4, Bard: 6, Cleric: 2, Druid: 4,
  Fighter: 2, Inquisitor: 6, Magus: 2, Mesmerist: 6, Monk: 4,
  Occultist: 4, Oracle: 4, Paladin: 2, Psychic: 2, Ranger: 6,
  Rogue: 8, Shaman: 4, Sorcerer: 2, Spiritualist: 4, Summoner: 2,
  Witch: 2, Wizard: 2,
}

// Spellcasting ability by class (D&D 5e and Pathfinder 1e)
const CASTER_ABILITY: Record<string, string> = {
  // D&D 5e
  Bard: 'Charisma', Cleric: 'Wisdom', Druid: 'Wisdom',
  Paladin: 'Charisma', Ranger: 'Wisdom', Sorcerer: 'Charisma',
  Warlock: 'Charisma', Wizard: 'Intelligence', Artificer: 'Intelligence',
  // Pathfinder 1e
  Alchemist: 'Intelligence', Inquisitor: 'Wisdom', Magus: 'Intelligence',
  Mesmerist: 'Charisma', Occultist: 'Intelligence', Oracle: 'Charisma',
  Psychic: 'Intelligence', Shaman: 'Wisdom', Spiritualist: 'Wisdom',
  Summoner: 'Charisma', Witch: 'Intelligence',
}

const SUBCLASSES:Record<string, string[]> = {
  Barbarian: ['BarbarianPathOfTheBerserker','BarbarianPathOfTheTotemWarrior','BarbarianPathOfTheWildMagic','BarbarianPathOfTheZealot','BarbarianPathOfTheAncestralGuardian','BarbarianPathOfTheRune','BarbarianPathOfTheBeast','BarbarianPathOfTheWildHunt'],
  Bard: ['BardCollegeOfLore','BardCollegeOfPerformance','BardCollegeOfGlamour','BardCollegeOfWhispers','BardCollegeOfSwords','BardCollegeOfEloquence','BardCollegeOfSpirits','BardCollegeOfPuppets'],
  Cleric: ['ClericAirDomain','ClericAnimalDomain','ClericArcanaDomain','ClericDeathDomain','ClericForgeDomain','ClericGraveDomain','ClericKnowledgeDomain','ClericLifeDomain','ClericLightDomain','ClericNatureDomain','ClericTempestDomain','ClericTrickeryDomain','ClericWarDomain','ClericTwilightDomain','ClericLoveDomain','ClericOrderDomain'],
  Druid: ['DruidCircleOfTheLand','DruidCircleOfTheMoon','DruidCircleOfSpores','DruidCircleOfDreams','DruidCircleOfTheShepherd','DruidCircleOfWildFire','DruidCircleOfStar','DruidCircleOfTheTaiga'],
  Fighter: ['FighterChampion','FighterBattleMaster','FighterEldritchKnight','FighterArcaneArcher','FighterCavalier','FighterRune','FighterPsiWarrior'],
  Monk: ['MonkWayOfTheOpenHand','MonkWayOfTheLongDeath','MonkWayOfTheFourElements','MonkWayOfShadow','MonkWayOfTheSunSoul','MonkWayOfMercy','MonkWayOfTheKensei','MonkWayOfTheAstralSelf'],
  Paladin: ['PaladinOathOfDevotion','PaladinOathOfTheAncients','PaladinOathOfVengeance','PaladinOathOfConquest','PaladinOathOfRedemption','PaladinOathOfTheeWatchers','PaladinOathOfTheCrown'],
  Ranger: ['RangerHunter','RangerBeastMaster','RangerGloomStalker','RangerFeyWanderer','RangerSwiftBlade'],
  Rogue: ['RogueAssassin','RogueThief','RogueTrickster','RogueArcaneConundrum','RogueSoulknife','RogueShadowdancer','RogueInquisitive','RogueSwashbuckler'],
  Sorcerer: ['SorcererDraconicBloodline','SorcererWildMagic','SorcererStormSorcery','SorcererShadowMagic','SorcererDivineSource','SorcererAbberantMind'],
  Warlock: ['WarlockArchfey','WarlockFiend','WarlockGreatOldOne','WarlockCelestial','WarlockHexblade','WarlockUndying'],
  Wizard: ['WizardAbjuration','WizardConjuration','WizardDivination','WizardEnchantment','WizardEvocation','WizardIllusion','WizardNecromancy','WizardTransmutation','WizardChronoturgy','WizardGravityMastery','WizardWar','WizardBladesingers'],
  Artificer: ['ArtificerAlchemist','ArtificerArtillerist','ArtificerBattlesmith'],
}

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

function RaceSelector({ characterId, currentRace }: { characterId: string; currentRace?: string }) {
  const qc = useQueryClient()
  const { data: allRaces = [] } = useQuery({ queryKey: ['races'], queryFn: () => racesApi.getAll() })
  const mutation = useMutation({
    mutationFn: (race: string | undefined) => charactersApi.update(characterId, { race }),
    onSuccess: (updated) => {
      qc.setQueryData<Character>(['character', characterId], updated)
      qc.invalidateQueries({ queryKey: ['race'] })
    },
  })
  return (
    <select
      className="w-full bg-gray-800 text-white rounded-lg px-2 py-1.5 border border-gray-700 focus:border-indigo-500 focus:outline-none text-xs"
      value={currentRace ?? ''}
      onChange={e => mutation.mutate(e.target.value || undefined)}
      disabled={mutation.isPending}
    >
      <option value="">— None —</option>
      {allRaces.map(r => (
        <option key={r.index} value={r.index}>{r.name}</option>
      ))}
    </select>
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

export default function StatsPage({ embedded }: { embedded?: boolean } = {}) {
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

  const { data: equipmentResources = [] } = useQuery<EquipmentResource[]>({
    queryKey: ['equipment-resources', id],
    queryFn: () => equipmentResourcesApi.getAll(id!),
    enabled: !!id,
  })

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

  useEffect(() => {
    if (editingName) nameRef.current?.focus()
  }, [editingName])

  const isDirty = draft !== null

  const updateMutation = useMutation({
    mutationFn: (req: UpdateCharacterRequest) => charactersApi.update(id!, req),
    onSuccess: (updated) => {
      qc.setQueryData<Character>(['character', id], updated)
    },
  })

  const hpMutation = useMutation({
    mutationFn: ({ currentHp, maxHp }: { currentHp: number; maxHp?: number }) =>
      charactersApi.updateHp(id!, currentHp, maxHp),
    onSuccess: (updated) => {
      qc.setQueryData<Character>(['character', id], updated)
    },
  })

  const avatarMutation = useMutation({
    mutationFn: (file: File) => charactersApi.uploadAvatar(id!, file),
    onSuccess: (updated) => {
      qc.setQueryData<Character>(['character', id], updated)
    },
  })

  const wildShapeMutation = useMutation({
    mutationFn: (req: Parameters<typeof beastsApi.updateWildShape>[1]) =>
      beastsApi.updateWildShape(id!, req),
    onSuccess: (updated) => {
      qc.setQueryData<Character>(['character', id], updated)
    },
  })

  // ── Attack form state ──────────────────────────────────────────
  const [showAttackForm, setShowAttackForm] = useState(false)
  const [editingAttack, setEditingAttack] = useState<CharacterAttack | null>(null)
  const [attackForm, setAttackForm] = useState<AddAttackRequest>(BLANK_ATTACK)

  const addAttackMutation = useMutation({
    mutationFn: (req: AddAttackRequest) => attacksApi.add(id!, req),
    onSuccess: (newAttack) => {
      qc.setQueryData<CharacterAttack[]>(['attacks', id], old => [...(old ?? []), newAttack])
      setShowAttackForm(false)
      setAttackForm(BLANK_ATTACK)
    },
  })
  const updateAttackMutation = useMutation({
    mutationFn: ({ attackId, req }: { attackId: string; req: AddAttackRequest }) =>
      attacksApi.update(id!, attackId, req),
    onSuccess: (updated) => {
      qc.setQueryData<CharacterAttack[]>(['attacks', id], old => old?.map(a => a.id === updated.id ? updated : a) ?? [])
      setEditingAttack(null)
      setAttackForm(BLANK_ATTACK)
    },
  })
  const deleteAttackMutation = useMutation({
    mutationFn: (attackId: string) => attacksApi.remove(id!, attackId),
    onSuccess: (_void, attackId) => {
      qc.setQueryData<CharacterAttack[]>(['attacks', id], old => old?.filter(a => a.id !== attackId) ?? [])
    },
  })

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const resized = await resizeImage(file, 256, 0.85)
      avatarMutation.mutate(resized)
    }
    e.target.value = ''
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

  if (isLoading || !character) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Loading…</div>
  )

  const d = {
    name: draft?.name ?? character.name,
    level: draft?.level ?? character.level,
    subclass: draft?.subclass ?? character.subclass,
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

  const getRacialBonus = (key: string) =>
    race?.modifiers
      .filter(m => m.type === 'ability_score' && m.ability?.toLowerCase() === key.toLowerCase())
      .reduce((sum, m) => sum + m.value, 0) ?? 0

  const getAsiBonus = (key: string) =>
    charFeats
      .filter(f => f.featIndex === 'ability-score-improvement' && f.notes)
      .reduce((sum, f) => {
        try { return sum + (JSON.parse(f.notes!).asiChoices?.[key] ?? 0) } catch { return sum }
      }, 0)

  const totalAbilityScore = (key: string) =>
    (d.abilityScores[key] ?? 10) + getRacialBonus(key) + getAsiBonus(key)

  const totalScores = Object.fromEntries(ABILITY_KEYS.map(k => [k, totalAbilityScore(k)]))

  const acInfo = calculateAC(character.characterClass, totalScores, inventory, d.baseArmorClass, charFeats, classFeatures)

  const patch = (fields: Partial<typeof d>) => setDraft(prev => ({ ...prev, ...fields }))

  const handleSave = useCallback(async () => {
    if (!draft) return
    const { currentHp, maxHp, ...charUpdate } = draft
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
      // Errors are surfaced via updateMutation.isError / hpMutation.isError; draft kept for retry
    }
  }, [draft, character, updateMutation, hpMutation]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save 1.5 s after the last edit
  useEffect(() => {
    if (!isDirty) return
    const timer = setTimeout(() => { handleSave() }, 1500)
    return () => clearTimeout(timer)
  }, [draft]) // eslint-disable-line react-hooks/exhaustive-deps

  const abilityMod = (key: string) => Math.floor((totalAbilityScore(key) - 10) / 2)
  const featInitBonus = getFeatModifier(charFeats, 'initiative')
  const featPassivePercBonus = getFeatModifier(charFeats, 'passive_perception')
  const featHpPerLevel = getFeatModifier([...charFeats, ...classFeatures], 'hp_per_level')
  const movementBonus = getMovementBonus(classFeatures)
  const charismaModifier = abilityMod('Charisma')
  const savingThrowChaBonus = getFeatModifier(classFeatures, 'saving_throw_cha_mod') * charismaModifier
  const equippedSavingThrowBonus = inventory
    .filter(i => i.isEquipped)
    .reduce((s, i) => s + (i.savingThrowBonus ?? 0), 0)
  const passivePerception = 10 + abilityMod('Wisdom') + featPassivePercBonus
  const initiative = abilityMod('Dexterity') + featInitBonus
  const profBonusNum = Math.floor((d.level - 1) / 4) + 2
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
  const skillList = character.gameType === 'pathfinder1e' ? PF1E_SKILLS : DND5E_SKILLS
  const saveList = character.gameType === 'pathfinder1e' ? PF1E_SAVES : ABILITY_KEYS.map(k => ({ name: k, ability: k }))

  const castingAbility = CASTER_ABILITY[character.characterClass]
  const castingAbilityMod = castingAbility ? abilityMod(castingAbility) : null
  const spellSaveDC = castingAbilityMod !== null ? 8 + profBonusNum + castingAbilityMod : null
  const spellAttackBonus = castingAbilityMod !== null ? profBonusNum + castingAbilityMod : null

  const sneakAttackDice = getFeatModifier([...charFeats, ...classFeatures], 'sneak_attack_dice')

  const maxSkillProficiencies = character.gameType === 'pathfinder1e'
    ? (PF1E_SKILL_RANKS_PER_LEVEL[character.characterClass] ?? 2) * d.level
      + Math.max(0, abilityMod('Intelligence')) * d.level
    : null // No cap for D&D 5e — free selection
  const atSkillLimit = maxSkillProficiencies !== null && d.skillProficiencies.length >= maxSkillProficiencies

  const subclassList = SUBCLASSES[character.characterClass] ?? []

  const hpPct = maxHpWithFeats > 0 ? Math.max(0, Math.min(100, (d.currentHp / maxHpWithFeats) * 100)) : 0
  const hpColour = hpPct > 50 ? 'bg-green-500' : hpPct > 25 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className={embedded ? 'bg-gray-950 text-white flex flex-col' : 'min-h-screen bg-gray-950 text-white flex flex-col'}>
      {/* Header */}
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
          {isDirty && (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => { setDraft(null); setEditingName(false) }}
                className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors"
              >
                Revert
              </button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending || hpMutation.isPending}
                className="text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                {updateMutation.isPending || hpMutation.isPending ? 'Saving…' : 'Save now'}
              </button>
            </div>
          )}
        </header>
      )}
      {embedded && isDirty && (
        <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center justify-end gap-2">
          <button
            onClick={() => { setDraft(null); setEditingName(false) }}
            className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors"
          >
            Revert
          </button>
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending || hpMutation.isPending}
            className="text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            {updateMutation.isPending || hpMutation.isPending ? 'Saving…' : 'Save now'}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* Identity */}
        <section className="bg-gray-900 rounded-2xl p-4">
          <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Identity</h2>
          <div className="flex gap-4">

            {/* Left: stats */}
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Class</p>
                  <p className="font-medium text-sm">{character.characterClass}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Level</p>
                  <EditableNumber
                    value={d.level}
                    onChange={v => patch({ level: v })}
                    min={1} max={20}
                    label="Level"
                    className="font-bold text-lg"
                  />
                </div>

              </div>

              {/* Race (D&D 5e only) */}
              {character.gameType === 'dnd5e' && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Race</p>
                  <RaceSelector characterId={character.id} currentRace={character.race} />
                </div>
              )}

              {/* Background (D&D 5e only) */}
              {character.gameType === 'dnd5e' && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Background</p>
                  <BackgroundSelector
                    characterId={character.id}
                    currentBackground={character.background}
                    currentSkillProficiencies={d.skillProficiencies}
                  />
                </div>
              )}

              {/* Subclass */}
              <div>
                <p className="text-xs text-gray-400 mb-1">Subclass</p>
                {subclassList.length > 0 ? (
                  <select
                    className="w-full bg-gray-800 text-white rounded-lg px-2 py-1.5 border border-gray-700 focus:border-indigo-500 focus:outline-none text-xs"
                    value={d.subclass ?? 'None'}
                    onChange={e => patch({ subclass: e.target.value })}
                  >
                    <option value="None">— None —</option>
                    {subclassList.map(s => (
                      <option key={s} value={s}>{formatSubclass(s, character.characterClass)}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-gray-400">{formatSubclass(d.subclass ?? '', character.characterClass)}</p>
                )}
              </div>
            </div>

            {/* Right: avatar */}
            <div className="flex flex-col items-center justify-center gap-2 shrink-0">
              <label className="relative cursor-pointer group" title="Click to upload avatar">
                <div className="w-24 h-24 rounded-full bg-gray-800 border-2 border-gray-700 overflow-hidden flex items-center justify-center group-hover:border-indigo-500 transition-colors">
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
              <p className="text-xs text-gray-600">Tap to change</p>
            </div>

          </div>
        </section>

        {/* Combat */}
        <section className="bg-gray-900 rounded-2xl p-4 space-y-4">
          <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Combat</h2>

          {/* HP */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-400">Hit Points</span>
              <div className="flex items-center gap-1 text-sm">
                <EditableNumber
                  value={d.currentHp}
                  onChange={v => patch({ currentHp: Math.min(v, maxHpWithFeats) })}
                  min={0} max={maxHpWithFeats}
                  label="Current HP"
                  className="w-12 text-center font-bold text-lg"
                />
                <span className="text-gray-500">/</span>
                <EditableNumber
                  value={d.maxHp}
                  onChange={v => patch({ maxHp: v, currentHp: Math.min(d.currentHp, v) })}
                  min={0}
                  label="Max HP"
                  className="w-12 text-center text-gray-400"
                />
                {featHpPerLevel > 0 && (
                  <span className="text-xs text-indigo-400 ml-1">(+{featHpPerLevel * d.level} feats)</span>
                )}
              </div>
            </div>
            <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
              <div className={`h-full ${hpColour} rounded-full transition-all`} style={{ width: `${hpPct}%` }} />
            </div>
          </div>

          {/* Death Saving Throws */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 w-16">Successes</span>
              {[0, 1, 2].map(i => (
                <button
                  key={i}
                  onClick={() => patch({ deathSaveSuccesses: d.deathSaveSuccesses > i ? i : i + 1 })}
                  className={`w-4 h-4 rounded-full border-2 transition-colors ${i < d.deathSaveSuccesses ? 'bg-green-500 border-green-500' : 'border-green-800 hover:border-green-600'}`}
                  title={`Success ${i + 1}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 w-14">Failures</span>
              {[0, 1, 2].map(i => (
                <button
                  key={i}
                  onClick={() => patch({ deathSaveFailures: d.deathSaveFailures > i ? i : i + 1 })}
                  className={`w-4 h-4 rounded-full border-2 transition-colors ${i < d.deathSaveFailures ? 'bg-red-500 border-red-500' : 'border-red-800 hover:border-red-600'}`}
                  title={`Failure ${i + 1}`}
                />
              ))}
              {d.deathSaveFailures >= 3 && <span className="text-red-400 text-xs ml-1">💀 Dead</span>}
            </div>
            {d.deathSaveSuccesses >= 3 && <span className="text-green-400 text-xs">🛡️ Stable</span>}
          </div>

          {/* AC, Initiative, Proficiency, Passive Perception (+ spell stats for casters) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Armor Class</p>
              <p className="text-xl font-bold">{acInfo.total}</p>
              <p className="text-xs text-indigo-400 mt-0.5">{acInfo.breakdown}</p>
              {!acInfo.isAutoCalc && (
                <p className="text-xs text-yellow-600 mt-0.5">Set armor type for DEX calc</p>
              )}
              <div className="mt-1.5">
                <label className="text-xs text-gray-400">Bonus</label>
                <EditableNumber
                  value={d.baseArmorClass}
                  onChange={v => patch({ baseArmorClass: v })}
                  min={-10}
                  label="AC Bonus"
                  className="text-xs font-medium text-gray-300 ml-1"
                />
              </div>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Initiative</p>
              <p className="text-xl font-bold">{initiative >= 0 ? `+${initiative}` : initiative}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                DEX{featInitBonus !== 0 ? ` ${featInitBonus >= 0 ? '+' : ''}${featInitBonus} feat` : ''}
              </p>
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
                10 + WIS{featPassivePercBonus !== 0 ? ` +${featPassivePercBonus} feat` : ''}
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Speed</p>
              <p className="text-xl font-bold">{(race?.speed ?? 30) + movementBonus} ft</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {race?.speed ?? 30}{movementBonus > 0 ? ` +${movementBonus} class` : ''}
              </p>
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

          {/* Concentration (casters only) */}
          {spellSaveDC !== null && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400">Concentrating:</span>
              {d.concentrationSpell && !editingConcentration ? (
                <div className="flex items-center gap-1 bg-purple-900/40 border border-purple-700/60 rounded-lg px-2 py-0.5">
                  <span
                    className="text-xs text-purple-300 cursor-pointer"
                    onClick={() => { setConcentrationInput(d.concentrationSpell ?? ''); setEditingConcentration(true) }}
                  >{d.concentrationSpell}</span>
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
                <button
                  onClick={() => { setConcentrationInput(''); setEditingConcentration(true) }}
                  className="text-xs text-gray-600 hover:text-purple-400 transition-colors border border-dashed border-gray-700 rounded-lg px-2 py-0.5"
                >+ Set spell</button>
              )}
            </div>
          )}

          {/* Conditions */}
          <div>
            <p className="text-xs text-gray-400 mb-1.5">Conditions</p>
            <div className="flex flex-wrap gap-1">
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

          {/* Exhaustion stepper */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Exhaustion</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => patch({ exhaustionLevel: Math.max(0, d.exhaustionLevel - 1) })}
                disabled={d.exhaustionLevel === 0}
                className="w-6 h-6 rounded bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 flex items-center justify-center text-sm"
              >−</button>
              <span className={`text-sm font-bold w-6 text-center ${d.exhaustionLevel === 0 ? 'text-gray-500' : d.exhaustionLevel >= 5 ? 'text-red-400' : 'text-amber-400'}`}>{d.exhaustionLevel}</span>
              <button
                onClick={() => patch({ exhaustionLevel: Math.min(6, d.exhaustionLevel + 1) })}
                disabled={d.exhaustionLevel === 6}
                className="w-6 h-6 rounded bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 flex items-center justify-center text-sm"
              >+</button>
            </div>
            {d.exhaustionLevel > 0 && (
              <span className="text-[10px] text-gray-500">
                {['','Disadv. checks','Speed halved','Disadv. attacks+saves','Max HP halved','Speed 0','Death'][d.exhaustionLevel]}
              </span>
            )}
          </div>
        </section>

        {/* Active Feats */}
        <FeatsSection charFeats={charFeats} characterId={character.id} />

        {/* Class Resources + Equipment Resources */}
        <ClassResourcesSection
          classResources={classResources}
          equipmentResources={equipmentResources}
          classFeatures={classFeatures}
          characterLevel={d.level}
          onResourceAction={(args) => resourceMutation.mutate({ ...args, currentExhaustion: args.action === 'long-rest' ? d.exhaustionLevel : undefined })}
          resourcePending={resourceMutation.isPending}
          onEquipResAction={(args) => equipResMutation.mutate(args)}
          equipResPending={equipResMutation.isPending}
        />

        {/* Wild Shape */}
        <ClassFeaturesSection
          character={character}
          allBeasts={allBeasts}
          onWildShapeAction={(req) => wildShapeMutation.mutate(req)}
          wildShapePending={wildShapeMutation.isPending}
        />

        {/* Attacks */}
        <AttacksSection
          character={character}
          inventory={inventory}
          customAttacks={customAttacks}
          allBeasts={allBeasts}
          abilityScores={d.abilityScores}
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

        {/* Ability Scores + Saves + Skills */}
        <div className="flex gap-3 items-start">

          {/* Left column: Ability Scores stacked above Saves */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">

            <AbilityScoresSection
              character={character}
              race={race}
              abilityScores={d.abilityScores}
              getRacialBonus={getRacialBonus}
              getAsiBonus={getAsiBonus}
              patch={patch}
              isDirty={isDirty}
            />

            <SavingThrowsSection
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

          {/* Skills */}
          <section className="bg-gray-900 rounded-2xl p-3 flex-1 min-w-0">
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
                const lockedByBackground = isFromBackground && isProficient
                const lockedByClass = isFromClass && isProficient
                const locked = lockedByBackground || lockedByClass
                const disabled = !isProficient && atSkillLimit
                const total = abilityMod(ability) + (isExpert ? profBonusNum * 2 : isProficient ? profBonusNum : 0)
                const dotColour = isExpert
                  ? isFromBackground ? 'bg-amber-300 border-amber-300'
                  : isFromClass ? 'bg-purple-300 border-purple-300'
                  : 'bg-cyan-400 border-cyan-400'
                  : isProficient
                  ? isFromBackground ? 'bg-amber-500 border-amber-500'
                  : isFromClass ? 'bg-purple-500 border-purple-500'
                  : 'bg-indigo-500 border-indigo-500'
                  : 'border-gray-500'
                const scoreColour = isExpert
                  ? isFromBackground ? 'text-amber-200'
                  : isFromClass ? 'text-purple-200'
                  : 'text-cyan-300'
                  : isProficient
                  ? isFromBackground ? 'text-amber-300'
                  : isFromClass ? 'text-purple-300'
                  : 'text-indigo-300'
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
          </section>

        </div>
      </div>{/* grid */}
      </div>{/* overflow-y-auto */}

    </div>
  )
}
