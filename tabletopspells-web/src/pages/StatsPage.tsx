import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '../api/characters'
import { inventoryApi } from '../api/inventory'
import { attacksApi } from '../api/attacks'
import { beastsApi } from '../api/beasts'
import { characterFeatsApi } from '../api/characterFeats'
import { classFeaturesApi } from '../api/classFeatures'
import { racesApi } from '../api/races'
import EditableNumber from '../components/EditableNumber'
import BeastPickerModal from '../components/BeastPickerModal'
import { resizeImage } from '../utils/resizeImage'
import { resolveClassName } from '../utils/spellUtils'
import type { UpdateCharacterRequest, CharacterAttack, AddAttackRequest, AbilityModKey, Beast, InventoryItem, CharacterFeat, ClassFeature, Race } from '../types'

const ABILITY_KEYS = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma']
const ABILITY_SHORT: Record<string, string> = {
  Strength: 'STR', Dexterity: 'DEX', Constitution: 'CON',
  Intelligence: 'INT', Wisdom: 'WIS', Charisma: 'CHA',
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

// D&D 5e: fixed skill proficiency count at character creation
const DND5E_SKILL_LIMIT: Record<string, number> = {
  Barbarian: 2, Bard: 3, Cleric: 2, Druid: 2, Fighter: 2,
  Monk: 2, Paladin: 2, Ranger: 3, Rogue: 4, Sorcerer: 2,
  Warlock: 2, Wizard: 2, Artificer: 2,
}

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

function mod(score: number): string {
  const m = Math.floor((score - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}

function profBonus(level: number): string {
  const pb = Math.floor((level - 1) / 4) + 2
  return `+${pb}`
}

function crLabel(cr: number): string {
  if (cr === 0.125) return '1/8'
  if (cr === 0.25) return '1/4'
  if (cr === 0.5) return '1/2'
  return String(cr)
}

function getWildShapeLimits(level: number, subclass: string): { maxCr: number; allowFly: boolean; allowSwim: boolean } {
  const isMoon = subclass === 'DruidCircleOfTheMoon'
  let maxCr: number
  if (isMoon) {
    maxCr = level >= 6 ? Math.floor(level / 3) : 1
  } else {
    maxCr = level >= 8 ? 1 : level >= 4 ? 0.5 : 0.25
  }
  const allowFly = level >= 8
  const allowSwim = level >= 4
  return { maxCr, allowFly, allowSwim }
}

function getFeatModifier(feats: (CharacterFeat | ClassFeature)[], type: string): number {
  return feats.flatMap(f => f.modifiers).filter(m => m.type === type).reduce((s, m) => s + m.value, 0)
}

// Returns the highest sneak attack dice count applicable given class features
function getSneakAttackDice(classFeatures: ClassFeature[]): number {
  const vals = classFeatures.flatMap(f => f.modifiers).filter(m => m.type === 'sneak_attack_dice').map(m => m.value)
  return vals.length ? Math.max(...vals) : 0
}

// Returns the martial arts die (e.g. 6 = d6) applicable given class features
function getMartialArtsDie(classFeatures: ClassFeature[]): number {
  const vals = classFeatures.flatMap(f => f.modifiers).filter(m => m.type === 'martial_arts_die').map(m => m.value)
  return vals.length ? Math.max(...vals) : 0
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
  const armorItem = equipped.find(i => i.equippedSlot === 'Armor' && i.armorType && i.armorType !== 'None')
  const shieldBonus = equipped
    .filter(i => i.equippedSlot !== 'Armor' && i.acBonus != null)
    .reduce((s, i) => s + (i.acBonus ?? 0), 0)

  // Medium Armor Master feat raises the DEX cap on medium armor from +2 to +3
  const medArmorMaxDex = feats.flatMap(f => f.modifiers)
    .find(m => m.type === 'medium_armor_max_dex')?.value ?? 2

  // Flat AC bonuses from feats
  const featAcBonus = getFeatModifier(feats, 'ac')

  if (armorItem?.armorType && armorItem.armorType !== 'None') {
    const base = armorItem.acBonus ?? 0
    let dexContrib = 0
    let armorLabel = ''
    if (armorItem.armorType === 'Light') {
      dexContrib = dexMod
      armorLabel = 'Light'
    } else if (armorItem.armorType === 'Medium') {
      dexContrib = Math.min(dexMod, medArmorMaxDex)
      armorLabel = medArmorMaxDex > 2 ? 'Medium (+3 DEX)' : 'Medium'
    } else {
      dexContrib = 0
      armorLabel = 'Heavy'
    }
    const total = base + dexContrib + shieldBonus + baseArmorClass + featAcBonus
    const parts: string[] = [`${base} (${armorLabel})`]
    if (dexContrib !== 0) parts.push(`${dexContrib >= 0 ? '+' : ''}${dexContrib} DEX`)
    if (shieldBonus > 0) parts.push(`+${shieldBonus} shield`)
    if (baseArmorClass !== 0) parts.push(`${baseArmorClass >= 0 ? '+' : ''}${baseArmorClass} bonus`)
    if (featAcBonus !== 0) parts.push(`${featAcBonus >= 0 ? '+' : ''}${featAcBonus} feats`)
    return { total, breakdown: parts.join(' '), isAutoCalc: true }
  }

  // Fallback: no armorType set — use legacy formula (baseArmorClass + equipment AC + DEX for unarmored)
  const legacyEquipBonus = equipped.filter(i => i.acBonus != null).reduce((s, i) => s + (i.acBonus ?? 0), 0)
  if (legacyEquipBonus === 0) {
    // Pure unarmored — check for class feature AC override (e.g. Draconic Resilience = 13+DEX)
    const classFeatureAcBase = classFeatures.flatMap(f => f.modifiers)
      .find(m => m.type === 'unarmored_ac_base')?.value ?? null

    let unarmoredBase = classFeatureAcBase ?? 10
    let classNote = ''
    if (!classFeatureAcBase) {
      if (characterClass === 'Barbarian') { unarmoredBase += conMod; classNote = ` +${conMod} CON` }
      else if (characterClass === 'Monk') { unarmoredBase += wisMod; classNote = ` +${wisMod} WIS` }
    }
    const unarmoredLabel = classFeatureAcBase ? `Draconic (${unarmoredBase})` : `unarmored${classNote}`
    const total = unarmoredBase + dexMod + baseArmorClass + featAcBonus
    const parts: string[] = [`${unarmoredBase} (${unarmoredLabel})`, `${dexMod >= 0 ? '+' : ''}${dexMod} DEX`]
    if (baseArmorClass !== 0) parts.push(`${baseArmorClass >= 0 ? '+' : ''}${baseArmorClass} bonus`)
    if (featAcBonus !== 0) parts.push(`${featAcBonus >= 0 ? '+' : ''}${featAcBonus} feats`)
    return { total, breakdown: parts.join(' '), isAutoCalc: true }
  }
  // Has old-style equipment bonus — show as-is, suggest upgrade
  return {
    total: baseArmorClass + legacyEquipBonus + featAcBonus,
    breakdown: `${baseArmorClass} base + ${legacyEquipBonus} gear${featAcBonus ? ` +${featAcBonus} feats` : ''}`,
    isAutoCalc: false,
  }
}

function RaceSelector({ characterId, currentRace }: { characterId: string; currentRace?: string }) {
  const qc = useQueryClient()
  const { data: allRaces = [] } = useQuery({ queryKey: ['races'], queryFn: () => racesApi.getAll() })
  const mutation = useMutation({
    mutationFn: (race: string | undefined) => charactersApi.update(characterId, { race }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['character', characterId] })
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

export default function StatsPage() {
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

  // Local draft state — only set when something is dirty
  const [draft, setDraft] = useState<UpdateCharacterRequest & { currentHp?: number; maxHp?: number } | null>(null)
  const [editingName, setEditingName] = useState(false)

  useEffect(() => {
    if (editingName) nameRef.current?.focus()
  }, [editingName])

  const isDirty = draft !== null

  const updateMutation = useMutation({
    mutationFn: (req: UpdateCharacterRequest) => charactersApi.update(id!, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['character', id] }),
  })

  const hpMutation = useMutation({
    mutationFn: ({ currentHp, maxHp }: { currentHp: number; maxHp?: number }) =>
      charactersApi.updateHp(id!, currentHp, maxHp),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['character', id] }),
  })

  const avatarMutation = useMutation({
    mutationFn: (file: File) => charactersApi.uploadAvatar(id!, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['character', id] }),
  })

  // ── Wild Shape state ──────────────────────────────────────────
  const [showBeastPicker, setShowBeastPicker] = useState(false)

  const wildShapeMutation = useMutation({
    mutationFn: (req: Parameters<typeof beastsApi.updateWildShape>[1]) =>
      beastsApi.updateWildShape(id!, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['character', id] }),
  })

  // ── Attack form state ──────────────────────────────────────────
  const BLANK_ATTACK: AddAttackRequest = {
    name: '', damageFormula: '', damageType: '', abilityMod: 'Strength',
    useProficiency: true, magicBonus: 0, notes: '',
  }
  const [showAttackForm, setShowAttackForm] = useState(false)
  const [editingAttack, setEditingAttack] = useState<CharacterAttack | null>(null)
  const [attackForm, setAttackForm] = useState<AddAttackRequest>(BLANK_ATTACK)

  const addAttackMutation = useMutation({
    mutationFn: (req: AddAttackRequest) => attacksApi.add(id!, req),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attacks', id] }); setShowAttackForm(false); setAttackForm(BLANK_ATTACK) },
  })
  const updateAttackMutation = useMutation({
    mutationFn: ({ attackId, req }: { attackId: string; req: AddAttackRequest }) =>
      attacksApi.update(id!, attackId, req),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attacks', id] }); setEditingAttack(null); setAttackForm(BLANK_ATTACK) },
  })
  const deleteAttackMutation = useMutation({
    mutationFn: (attackId: string) => attacksApi.remove(id!, attackId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attacks', id] }),
  })

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const resized = await resizeImage(file, 256, 0.85)
      avatarMutation.mutate(resized)
    }
    e.target.value = ''
  }

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
  }

  const acInfo = calculateAC(character.characterClass, d.abilityScores, inventory, d.baseArmorClass, charFeats, classFeatures)

  const patch = (fields: Partial<typeof d>) => setDraft(prev => ({ ...prev, ...fields }))

  const handleSave = async () => {
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
  }

  const abilityMod = (key: string) => Math.floor(((d.abilityScores[key] ?? 10) - 10) / 2)
  const featInitBonus = getFeatModifier(charFeats, 'initiative')
  const featPassivePercBonus = getFeatModifier(charFeats, 'passive_perception')
  const featHpPerLevel = getFeatModifier([...charFeats, ...classFeatures], 'hp_per_level')
  const movementBonus = getMovementBonus(classFeatures)
  const sneakAttackDice = getSneakAttackDice(classFeatures)
  const martialArtsDie = getMartialArtsDie(classFeatures)
  const charismaModifier = abilityMod('Charisma')
  const savingThrowChaBonus = getFeatModifier(classFeatures, 'saving_throw_cha_mod') * charismaModifier
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
    const updated = d.skillProficiencies.includes(name)
      ? d.skillProficiencies.filter(n => n !== name)
      : [...d.skillProficiencies, name]
    patch({ skillProficiencies: updated })
  }

  const fmtMod = (n: number) => n >= 0 ? `+${n}` : `${n}`
  const skillList = character.gameType === 'pathfinder1e' ? PF1E_SKILLS : DND5E_SKILLS
  const saveList = character.gameType === 'pathfinder1e' ? PF1E_SAVES : ABILITY_KEYS.map(k => ({ name: k, ability: k }))

  const castingAbility = CASTER_ABILITY[character.characterClass]
  const castingAbilityMod = castingAbility ? abilityMod(castingAbility) : null
  const spellSaveDC = castingAbilityMod !== null ? 8 + profBonusNum + castingAbilityMod : null
  const spellAttackBonus = castingAbilityMod !== null ? profBonusNum + castingAbilityMod : null

  const maxSkillProficiencies = character.gameType === 'pathfinder1e'
    ? (PF1E_SKILL_RANKS_PER_LEVEL[character.characterClass] ?? 2) * d.level
      + Math.max(0, abilityMod('Intelligence')) * d.level
    : DND5E_SKILL_LIMIT[character.characterClass] ?? 2
  const atSkillLimit = d.skillProficiencies.length >= maxSkillProficiencies

  const subclassList = SUBCLASSES[character.characterClass] ?? []

  const hpPct = maxHpWithFeats > 0 ? Math.max(0, Math.min(100, (d.currentHp / maxHpWithFeats) * 100)) : 0
  const hpColour = hpPct > 50 ? 'bg-green-500' : hpPct > 25 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
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
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-4 py-5 space-y-4">

        {/* Identity */}
        <section className="bg-gray-900 rounded-2xl p-4">
          <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Identity</h2>
          <div className="flex gap-4">

            {/* Left: stats */}
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Class</p>
                  <p className="font-medium text-sm">{character.characterClass}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Level</p>
                  <EditableNumber
                    value={d.level}
                    onChange={v => patch({ level: v })}
                    min={1} max={20}
                    label="Level"
                    className="font-bold text-lg"
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">System</p>
                  <p className="font-medium text-sm">{character.gameType === 'dnd5e' ? 'D&D 5e' : 'Pathfinder 1e'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Caster</p>
                  <p className="font-medium text-sm">{character.isDivineCaster ? 'Divine' : 'Arcane'}</p>
                </div>
              </div>

              {/* Race (D&D 5e only) */}
              {character.gameType === 'dnd5e' && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Race</p>
                  <RaceSelector characterId={character.id} currentRace={character.race} />
                </div>
              )}

              {/* Subclass */}
              <div>
                <p className="text-xs text-gray-500 mb-1">Subclass</p>
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

        {/* Combat Stats */}
        <section className="bg-gray-900 rounded-2xl p-4 space-y-4">
          <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Combat</h2>

          {/* HP */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500">Hit Points</span>
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
                <label className="text-xs text-gray-500">Bonus</label>
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
              <p className="text-xs text-gray-500 mt-0.5">
                DEX{featInitBonus !== 0 ? ` ${featInitBonus >= 0 ? '+' : ''}${featInitBonus} feat` : ''}
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Prof. Bonus</p>
              <p className="text-xl font-bold">{profBonus(d.level)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Lv {d.level}</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Passive Perception</p>
              <p className="text-xl font-bold">{passivePerception}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                10 + WIS{featPassivePercBonus !== 0 ? ` +${featPassivePercBonus} feat` : ''}
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Speed</p>
              <p className="text-xl font-bold">{(race?.speed ?? 30) + movementBonus} ft</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {race?.speed ?? 30}{movementBonus > 0 ? ` +${movementBonus} class` : ''}
              </p>
            </div>
            {spellSaveDC !== null && (
              <>
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">Spell Save DC</p>
                  <p className="text-xl font-bold">{spellSaveDC}</p>
                  <p className="text-xs text-gray-500 mt-0.5">8 + prof + {ABILITY_SHORT[castingAbility!]}</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">Spell Attack</p>
                  <p className="text-xl font-bold">{fmtMod(spellAttackBonus!)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">prof + {ABILITY_SHORT[castingAbility!]}</p>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── Active Feats summary ─────────────────────────────────── */}
        {charFeats.length > 0 && (
          <section className="bg-gray-900 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Active Feats</h2>
              <button
                onClick={() => navigate(`/characters/${id}/feats`)}
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
        )}

        {/* ── Class Features ───────────────────────────────────────── */}
        {classFeatures.length > 0 && (
          <section className="bg-gray-900 rounded-2xl p-4">
            <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Class Features</h2>

            {/* Mechanical callouts */}
            <div className="flex flex-wrap gap-2 mb-3">
              {sneakAttackDice > 0 && (
                <div className="bg-red-900/40 border border-red-700/50 rounded-lg px-3 py-1.5 text-center">
                  <p className="text-xs text-red-400">Sneak Attack</p>
                  <p className="text-sm font-bold text-red-300">{sneakAttackDice}d6</p>
                </div>
              )}
              {martialArtsDie > 0 && (
                <div className="bg-amber-900/40 border border-amber-700/50 rounded-lg px-3 py-1.5 text-center">
                  <p className="text-xs text-amber-400">Martial Arts</p>
                  <p className="text-sm font-bold text-amber-300">d{martialArtsDie}</p>
                </div>
              )}
              {movementBonus > 0 && (
                <div className="bg-green-900/40 border border-green-700/50 rounded-lg px-3 py-1.5 text-center">
                  <p className="text-xs text-green-400">Speed Bonus</p>
                  <p className="text-sm font-bold text-green-300">+{movementBonus} ft</p>
                </div>
              )}
              {savingThrowChaBonus !== 0 && (
                <div className="bg-indigo-900/40 border border-indigo-700/50 rounded-lg px-3 py-1.5 text-center">
                  <p className="text-xs text-indigo-400">Aura of Protection</p>
                  <p className="text-sm font-bold text-indigo-300">+{savingThrowChaBonus} saves</p>
                </div>
              )}
            </div>

            {/* Feature list */}
            <div className="space-y-1.5">
              {classFeatures.map(f => (
                <details key={f.index} className="group">
                  <summary className="flex items-center gap-2 cursor-pointer list-none px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${f.is_passive ? 'bg-blue-900/50 text-blue-300' : 'bg-gray-700 text-gray-400'}`}>
                      {f.is_passive ? 'Passive' : 'Active'}
                    </span>
                    <span className="flex-1 text-sm text-gray-200">{f.name}</span>
                    <span className="text-xs text-gray-500">Lv {f.min_level}</span>
                    <span className="text-gray-500 group-open:rotate-90 transition-transform text-xs">▶</span>
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

        {/* ── Race Traits ───────────────────────────────────────────── */}
        {race && race.traits.length > 0 && (
          <section className="bg-gray-900 rounded-2xl p-4">
            <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">
              {race.name} Traits
            </h2>
            <div className="space-y-1.5">
              {race.traits.map(trait => (
                <details key={trait.name} className="group">
                  <summary className="flex items-center gap-2 cursor-pointer list-none px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-300">Racial</span>
                    <span className="flex-1 text-sm text-gray-200">{trait.name}</span>
                    <span className="text-gray-500 group-open:rotate-90 transition-transform text-xs">▶</span>
                  </summary>
                  <div className="mt-1 px-2 pb-2">
                    <p className="text-xs text-gray-400 leading-relaxed">{trait.desc}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* ── Wild Shape (Druid level 2+) ───────────────────────── */}
        {resolveClassName(character.characterClass) === 'druid' && character.level < 2 && (
          <section className="bg-gray-900 rounded-2xl p-4">
            <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Wild Shape</h2>
            <p className="text-sm text-gray-500">Available at level 2.</p>
          </section>
        )}
        {resolveClassName(character.characterClass) === 'druid' && character.level >= 2 && (() => {
          const limits = getWildShapeLimits(character.level, character.subclass)
          const inForm = !!character.wildShapeBeastName
          const uses = character.wildShapeUsesRemaining
          const maxUses = character.level >= 20 ? Infinity : 2
          const beastHpPct = (character.wildShapeBeastCurrentHp ?? 0) / (character.wildShapeBeastMaxHp ?? 1) * 100
          const beastHpColor = beastHpPct > 50 ? 'bg-green-500' : beastHpPct > 25 ? 'bg-amber-500' : 'bg-red-500'

          return (
            <section className="bg-gray-900 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Wild Shape</h2>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(maxUses, 4) }).map((_, i) => (
                    <span key={i} className={`w-3 h-3 rounded-full border-2 ${i < uses ? 'bg-indigo-500 border-indigo-500' : 'border-gray-500'}`} />
                  ))}
                  {maxUses === Infinity && <span className="text-xs text-indigo-400">∞</span>}
                </div>
              </div>

              {!inForm ? (
                <div className="flex gap-2">
                  <button
                    disabled={uses <= 0 || wildShapeMutation.isPending}
                    onClick={() => setShowBeastPicker(true)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-xl transition-colors"
                  >
                    🐾 Enter Wild Shape
                  </button>
                  <button
                    disabled={uses >= maxUses || wildShapeMutation.isPending}
                    onClick={() => wildShapeMutation.mutate({ action: 'restoreUses' })}
                    title="Short / long rest"
                    className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors"
                  >
                    ⏳
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🐺</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{character.wildShapeBeastName}</p>
                      <p className="text-xs text-gray-400">Beast form active</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Beast HP</span>
                      <div className="flex items-center gap-1 text-sm">
                        <EditableNumber
                          value={character.wildShapeBeastCurrentHp ?? 0}
                          onChange={v => {
                            const cur = character.wildShapeBeastCurrentHp ?? 0
                            const diff = v - cur
                            if (diff > 0) wildShapeMutation.mutate({ action: 'heal', amount: diff })
                            else if (diff < 0) wildShapeMutation.mutate({ action: 'damage', amount: -diff })
                          }}
                          min={0} max={character.wildShapeBeastMaxHp ?? 999}
                          label="Beast HP"
                          className="w-12 text-center font-bold text-lg"
                        />
                        <span className="text-gray-500">/</span>
                        <span className="text-gray-400 w-8 text-center">{character.wildShapeBeastMaxHp}</span>
                      </div>
                    </div>
                    <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div className={`h-full ${beastHpColor} rounded-full transition-all`} style={{ width: `${Math.max(0, Math.min(100, beastHpPct))}%` }} />
                    </div>
                  </div>
                  <button
                    disabled={wildShapeMutation.isPending}
                    onClick={() => wildShapeMutation.mutate({ action: 'revert' })}
                    className="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white text-sm font-medium py-2 rounded-xl transition-colors"
                  >
                    ↩ Revert to Druid
                  </button>
                </div>
              )}

              {showBeastPicker && (
                <BeastPickerModal
                  maxCr={limits.maxCr}
                  allowFly={limits.allowFly}
                  allowSwim={limits.allowSwim}
                  onClose={() => setShowBeastPicker(false)}
                  onSelect={(beast: Beast) => {
                    setShowBeastPicker(false)
                    wildShapeMutation.mutate({
                      action: 'enter',
                      beastName: beast.name,
                      beastMaxHp: beast.hp,
                      beastCurrentHp: beast.hp,
                    })
                  }}
                />
              )}

              <p className="text-xs text-gray-600 text-center">
                Max CR {crLabel(limits.maxCr)}{!limits.allowFly ? ' · No fly' : ''}{!limits.allowSwim ? ' · No swim' : ''}
              </p>
            </section>
          )
        })()}

        {/* ── Attacks ─────────────────────────────────────── */}
        {(() => {
          // Check if in Wild Shape — show beast attacks instead
          const inWildShape = !!character.wildShapeBeastName
          const activeBeast = inWildShape
            ? allBeasts.find((b: Beast) => b.name === character.wildShapeBeastName)
            : null

          if (inWildShape && activeBeast) {
            const beastAttacks = activeBeast.attacks.map((atk, i) => {
              const score = atk.stat === 'dex' ? activeBeast.dex : activeBeast.str
              const statMod = Math.floor((score - 10) / 2)
              const toHit = statMod + profBonusNum
              const dmgStr = `${atk.dice}${statMod !== 0 ? fmtMod(statMod) : ''} ${atk.type}`
              return { id: `beast-${i}`, name: atk.name, toHit, dmgStr }
            })
            return (
              <section className="bg-gray-900 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Attacks</h2>
                  <span className="text-[10px] text-amber-400">{activeBeast.name} form</span>
                </div>
                <div className="space-y-2">
                  {beastAttacks.map(atk => (
                    <div key={atk.id} className="bg-gray-800 rounded-xl px-3 py-2.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{atk.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{atk.dmgStr}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-400">To Hit</p>
                        <p className="font-bold text-sm text-indigo-300">{fmtMod(atk.toHit)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )
          }

          // Normal (non-wild-shape) attacks
          // Auto-generate attack profiles from equipped weapons
          const equippedWeapons = inventory.filter(i => i.isEquipped && (i.equippedSlot === 'Weapon' || i.equippedSlot === 'Offhand'))
          const RANGED_RE = /\b(bow|crossbow|dart|sling|blowgun|net)\b/i
          const autoAttacks = equippedWeapons.map(item => {
            const isRanged = RANGED_RE.test(item.name) || RANGED_RE.test(item.notes ?? '')
            const ability = isRanged ? 'Dexterity' : 'Strength'
            const aMod = Math.floor(((d.abilityScores[ability] ?? 10) - 10) / 2)
            const toHit = aMod + profBonusNum + (item.equippedSlot === 'Offhand' ? -profBonusNum : 0)
            const dmgBonus = aMod
            const dmgStr = item.damageOverride
              ? `${item.damageOverride}${dmgBonus !== 0 ? fmtMod(dmgBonus) : ''}`
              : fmtMod(dmgBonus)
            return { id: item.id, name: item.name, toHit, dmgStr, slot: item.equippedSlot, isAuto: true }
          })

          // Unarmed strike (always available)
          const strMod = Math.floor(((d.abilityScores['Strength'] ?? 10) - 10) / 2)
          autoAttacks.push({
            id: 'unarmed',
            name: 'Unarmed Strike',
            toHit: strMod + profBonusNum,
            dmgStr: `1${fmtMod(strMod)} bludgeoning`,
            slot: null as any,
            isAuto: true,
          })

          // Custom stored attacks
          const computedCustom = customAttacks.map((atk: CharacterAttack) => {
            const aMod = atk.abilityMod === 'None' ? 0 : Math.floor(((d.abilityScores[atk.abilityMod] ?? 10) - 10) / 2)
            const toHit = (atk.useProficiency ? profBonusNum : 0) + aMod + atk.magicBonus
            const dmgBonus = aMod + atk.magicBonus
            const dmgStr = atk.damageFormula
              ? `${atk.damageFormula}${dmgBonus !== 0 ? fmtMod(dmgBonus) : ''}${atk.damageType ? ` ${atk.damageType}` : ''}`
              : dmgBonus !== 0 ? fmtMod(dmgBonus) : '—'
            return { ...atk, toHit, dmgStr }
          })

          const ABILITY_OPTIONS: AbilityModKey[] = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma', 'None']

          return (
            <section className="bg-gray-900 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Attacks</h2>
                {!showAttackForm && !editingAttack && (
                  <button
                    onClick={() => { setAttackForm(BLANK_ATTACK); setShowAttackForm(true) }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >+ Add</button>
                )}
              </div>

              {/* Auto-generated weapon attacks */}
              <div className="space-y-2 mb-3">
                {autoAttacks.map(atk => (
                  <div key={atk.id} className="bg-gray-800 rounded-xl px-3 py-2.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{atk.name}
                        <span className="text-[10px] text-gray-500 ml-1.5 font-normal">{atk.slot ?? 'unarmed'}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{atk.dmgStr}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400">To Hit</p>
                      <p className="font-bold text-sm text-indigo-300">{fmtMod(atk.toHit)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Custom stored attacks */}
              {computedCustom.length > 0 && (
                <div className="space-y-2 mb-3">
                  {computedCustom.map(atk => (
                    <div key={atk.id} className="bg-gray-800 rounded-xl px-3 py-2.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{atk.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{atk.dmgStr}</p>
                        {atk.notes && <p className="text-xs text-gray-600 mt-0.5 truncate">{atk.notes}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-400">To Hit</p>
                        <p className="font-bold text-sm text-indigo-300">{fmtMod(atk.toHit)}</p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => { setEditingAttack(atk); setAttackForm({ name: atk.name, damageFormula: atk.damageFormula ?? '', damageType: atk.damageType ?? '', abilityMod: atk.abilityMod, useProficiency: atk.useProficiency, magicBonus: atk.magicBonus, notes: atk.notes ?? '', sortOrder: atk.sortOrder }); setShowAttackForm(false) }}
                          className="text-xs text-gray-500 hover:text-indigo-400 transition-colors"
                        >✏</button>
                        <button
                          onClick={() => deleteAttackMutation.mutate(atk.id)}
                          className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                        >🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add / Edit form */}
              {(showAttackForm || editingAttack) && (
                <div className="bg-gray-800 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-300">{editingAttack ? 'Edit Attack' : 'New Attack'}</p>
                  <input
                    className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Name (e.g. Flurry of Blows)"
                    value={attackForm.name}
                    onChange={e => setAttackForm(f => ({ ...f, name: e.target.value }))}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="bg-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Damage (e.g. 1d6)"
                      value={attackForm.damageFormula ?? ''}
                      onChange={e => setAttackForm(f => ({ ...f, damageFormula: e.target.value }))}
                    />
                    <input
                      className="bg-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Type (e.g. bludgeoning)"
                      value={attackForm.damageType ?? ''}
                      onChange={e => setAttackForm(f => ({ ...f, damageType: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="bg-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={attackForm.abilityMod}
                      onChange={e => setAttackForm(f => ({ ...f, abilityMod: e.target.value as AbilityModKey }))}
                    >
                      {ABILITY_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <input
                      type="number"
                      className="bg-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Magic bonus"
                      value={attackForm.magicBonus}
                      onChange={e => setAttackForm(f => ({ ...f, magicBonus: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAttackForm(f => ({ ...f, useProficiency: !f.useProficiency }))}
                      className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg transition-colors ${attackForm.useProficiency ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'}`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full border border-current inline-block" />
                      Proficient
                    </button>
                  </div>
                  <input
                    className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Notes (optional)"
                    value={attackForm.notes ?? ''}
                    onChange={e => setAttackForm(f => ({ ...f, notes: e.target.value }))}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setShowAttackForm(false); setEditingAttack(null); setAttackForm(BLANK_ATTACK) }}
                      className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                    >Cancel</button>
                    <button
                      disabled={!attackForm.name.trim() || addAttackMutation.isPending || updateAttackMutation.isPending}
                      onClick={() => {
                        if (editingAttack) updateAttackMutation.mutate({ attackId: editingAttack.id, req: attackForm })
                        else addAttackMutation.mutate(attackForm)
                      }}
                      className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
                    >{editingAttack ? 'Save' : 'Add'}</button>
                  </div>
                </div>
              )}
            </section>
          )
        })()}

        {/* Ability Scores + Saves (left) | Skills (right) */}
        <div className="flex gap-3 items-start">

          {/* Left column: Ability Scores stacked above Saves */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">

            {/* Ability Scores */}
            <section className="bg-gray-900 rounded-2xl p-3">
              <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Ability Scores</h2>
              <div className="grid grid-cols-2 gap-1.5">
                {ABILITY_KEYS.map(key => {
                  const racialBonus = race?.modifiers
                    .filter(m => m.type === 'ability_score' && m.ability?.toLowerCase() === key.toLowerCase())
                    .reduce((sum, m) => sum + m.value, 0) ?? 0
                  return (
                    <div key={key} className="bg-gray-800 rounded-xl p-2 text-center relative">
                      <p className="text-[10px] text-gray-400 mb-0.5">{ABILITY_SHORT[key]}</p>
                      <EditableNumber
                        value={d.abilityScores[key] ?? 10}
                        onChange={v => patch({ abilityScores: { ...d.abilityScores, [key]: v } })}
                        min={1} max={30}
                        label={key}
                        className="text-sm font-bold"
                      />
                      <p className="text-[10px] text-indigo-400">{mod(d.abilityScores[key] ?? 10)}</p>
                      {racialBonus > 0 && (
                        <span className="absolute top-1 right-1 text-[9px] text-emerald-400 font-bold leading-none">+{racialBonus}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Saving Throws */}
            <section className="bg-gray-900 rounded-2xl p-3">
              <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">
                Saves
                {savingThrowChaBonus !== 0 && (
                  <span className="ml-1 text-indigo-400 normal-case">+{savingThrowChaBonus} CHA (aura)</span>
                )}
              </h2>
              <div className="space-y-0.5">
                {saveList.map(({ name, ability }) => {
                  const isProficient = d.savingThrowProficiencies.includes(name)
                  const total = abilityMod(ability) + (isProficient ? profBonusNum : 0) + savingThrowChaBonus
                  return (
                    <button
                      key={name}
                      onClick={() => toggleSaveProficiency(name)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors text-left"
                    >
                      <span className={`w-3 h-3 rounded-full border-2 flex-shrink-0 transition-colors ${isProficient ? 'bg-indigo-500 border-indigo-500' : 'border-gray-500'}`} />
                      <span className="flex-1 text-xs truncate">{name}</span>
                      <span className={`text-xs font-semibold w-6 text-right flex-shrink-0 ${isProficient ? 'text-indigo-300' : 'text-gray-300'}`}>{fmtMod(total)}</span>
                    </button>
                  )
                })}
              </div>
            </section>

          </div>

          {/* Skills */}
          <section className="bg-gray-900 rounded-2xl p-3 flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Skills</h2>
              <span className={`text-xs font-semibold ${atSkillLimit ? 'text-amber-400' : 'text-gray-500'}`}>
                {d.skillProficiencies.length}/{maxSkillProficiencies}
              </span>
            </div>
            <div className="space-y-0.5">
              {skillList.map(({ name, ability }) => {
                const isProficient = d.skillProficiencies.includes(name)
                const disabled = !isProficient && atSkillLimit
                const total = abilityMod(ability) + (isProficient ? profBonusNum : 0)
                return (
                  <button
                    key={name}
                    onClick={() => !disabled && toggleSkillProficiency(name)}
                    disabled={disabled}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left ${disabled ? 'opacity-35 cursor-not-allowed' : 'hover:bg-gray-800'}`}
                  >
                    <span className={`w-3 h-3 rounded-full border-2 flex-shrink-0 transition-colors ${isProficient ? 'bg-indigo-500 border-indigo-500' : 'border-gray-500'}`} />
                    <span className="flex-1 text-xs truncate">{name}</span>
                    <span className={`text-xs font-semibold w-6 text-right flex-shrink-0 ${isProficient ? 'text-indigo-300' : 'text-gray-300'}`}>{fmtMod(total)}</span>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-gray-600 mt-2 text-center">Prof {fmtMod(profBonusNum)}</p>
          </section>

        </div>

      </div>
    </div>
  )
}
