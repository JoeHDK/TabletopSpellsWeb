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
import { racesApi } from '../api/races'
import { backgroundsApi } from '../api/backgrounds'
import EditableNumber from '../components/EditableNumber'
import BeastPickerModal from '../components/BeastPickerModal'
import { resizeImage } from '../utils/resizeImage'
import { resolveClassName } from '../utils/spellUtils'
import { lookupArmor } from '../utils/armorTable'
import type { Character, UpdateCharacterRequest, CharacterAttack, AddAttackRequest, AbilityModKey, Beast, InventoryItem, CharacterFeat, ClassFeature, ClassResource, Race } from '../types'

const ABILITY_KEYS = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma']
const ABILITY_SHORT: Record<string, string> = {
  Strength: 'STR', Dexterity: 'DEX', Constitution: 'CON',
  Intelligence: 'INT', Wisdom: 'WIS', Charisma: 'CHA',
}

// D&D 5e class saving throw proficiencies (fixed per class)
const CLASS_SAVING_THROWS: Record<string, string[]> = {
  Barbarian: ['Strength', 'Constitution'],
  Bard: ['Dexterity', 'Charisma'],
  Cleric: ['Wisdom', 'Charisma'],
  Druid: ['Intelligence', 'Wisdom'],
  Fighter: ['Strength', 'Constitution'],
  Monk: ['Strength', 'Dexterity'],
  Paladin: ['Wisdom', 'Charisma'],
  Ranger: ['Strength', 'Dexterity'],
  Rogue: ['Dexterity', 'Intelligence'],
  Sorcerer: ['Constitution', 'Charisma'],
  Warlock: ['Wisdom', 'Charisma'],
  Wizard: ['Intelligence', 'Wisdom'],
  Artificer: ['Constitution', 'Intelligence'],
}

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

// Standard D&D 5e point buy
const POINT_BUY_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 }
const POINT_BUY_BUDGET = 27

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
    const unarmoredLabel = classFeatureAcBase ? `Draconic (${unarmoredBase})` : null
    const total = unarmoredBase + dexMod + baseArmorClass + featAcBonus
    const baseDisplay = unarmoredLabel ? `${unarmoredBase} (${unarmoredLabel})` : `${unarmoredBase}${classNote}`
    const parts: string[] = [baseDisplay, `${dexMod >= 0 ? '+' : ''}${dexMod} DEX`]
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
    mutationFn: ({ action, key, amount }: { action: 'use' | 'restore' | 'long-rest' | 'short-rest' | 'sync', key?: string, amount?: number }): Promise<ClassResource[]> => {
      if (action === 'use') return classResourcesApi.use(id!, key!, amount).then(r => [r])
      if (action === 'restore') return classResourcesApi.restore(id!, key!, amount).then(r => [r])
      if (action === 'long-rest') return classResourcesApi.longRest(id!)
      if (action === 'short-rest') return classResourcesApi.shortRest(id!)
      return classResourcesApi.sync(id!)
    },
    onSuccess: (updated) => qc.setQueryData<ClassResource[]>(['classResources', id], old => {
      if (!old) return updated
      const map = new Map(updated.map(r => [r.resourceKey, r]))
      return old.map(r => map.get(r.resourceKey) ?? r)
    }),
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

  // Local draft state — only set when something is dirty
  const [draft, setDraft] = useState<UpdateCharacterRequest & { currentHp?: number; maxHp?: number } | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [abilityBreakdownKey, setAbilityBreakdownKey] = useState<string | null>(null)
  const [abilityScoreRaw, setAbilityScoreRaw] = useState<string>('')

  useEffect(() => {
    if (editingName) nameRef.current?.focus()
  }, [editingName])

  const isDirty = draft !== null

  const [pointBuyMode, setPointBuyMode] = useState(false)

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

  // ── Wild Shape state ──────────────────────────────────────────
  const [showBeastPicker, setShowBeastPicker] = useState(false)
  const [showBeastStats, setShowBeastStats] = useState(false)

  const wildShapeMutation = useMutation({
    mutationFn: (req: Parameters<typeof beastsApi.updateWildShape>[1]) =>
      beastsApi.updateWildShape(id!, req),
    onSuccess: (updated) => {
      qc.setQueryData<Character>(['character', id], updated)
    },
  })

  // ── Attack form state ──────────────────────────────────────────
  const BLANK_ATTACK: AddAttackRequest = {
    name: '', damageFormula: '', damageType: '', abilityMod: 'Strength',
    useProficiency: true, magicBonus: 0, notes: '',
  }
  const [showAttackForm, setShowAttackForm] = useState(false)
  const [editingAttack, setEditingAttack] = useState<CharacterAttack | null>(null)
  const [attackForm, setAttackForm] = useState<AddAttackRequest>(BLANK_ATTACK)
  const [resourceInfoKey, setResourceInfoKey] = useState<string | null>(null)

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
        </section>

        {/* Active Feats */}
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

        {/* Class Resources */}
        {classResources.length > 0 && (
          <section className="bg-gray-900 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Class Resources</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => resourceMutation.mutate({ action: 'short-rest' })}
                  disabled={resourceMutation.isPending}
                  className="text-xs px-2 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 disabled:opacity-40 transition-colors"
                  title="Short Rest — restores short-rest resources"
                >
                  ⏱ Short Rest
                </button>
                <button
                  onClick={() => resourceMutation.mutate({ action: 'long-rest' })}
                  disabled={resourceMutation.isPending}
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
                        {RESOURCE_DESCRIPTIONS[res.resourceKey] && (
                          <span className="ml-1 text-gray-600 text-xs">ℹ</span>
                        )}
                      </button>
                      <div className="flex items-center gap-1">
                        {res.isHpPool ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => resourceMutation.mutate({ action: 'use', key: res.resourceKey, amount: 5 })}
                              disabled={res.usesRemaining <= 0 || resourceMutation.isPending}
                              className="text-xs w-7 h-7 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white transition-colors"
                            >−5</button>
                            <span className="text-sm font-bold text-white w-16 text-center">
                              {res.usesRemaining}<span className="text-gray-500">/{res.maxUses}</span>
                            </span>
                            <button
                              onClick={() => resourceMutation.mutate({ action: 'restore', key: res.resourceKey, amount: 5 })}
                              disabled={res.usesRemaining >= res.maxUses || resourceMutation.isPending}
                              className="text-xs w-7 h-7 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white transition-colors"
                            >+5</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => resourceMutation.mutate({ action: 'use', key: res.resourceKey })}
                              disabled={res.usesRemaining <= 0 || resourceMutation.isPending}
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
                              onClick={() => resourceMutation.mutate({ action: 'restore', key: res.resourceKey })}
                              disabled={res.usesRemaining >= res.maxUses || resourceMutation.isPending}
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

        {/* Wild Shape */}
        {resolveClassName(character.characterClass) === 'druid' && (
          character.level < 2 ? (
            <section className="bg-gray-900 rounded-2xl p-4">
              <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Wild Shape</h2>
              <p className="text-sm text-gray-400">Available at level 2.</p>
            </section>
          ) : (() => {
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
                      <button
                        className="text-left hover:opacity-80 transition-opacity"
                        onClick={() => setShowBeastStats(true)}
                        title="View beast stats"
                      >
                        <p className="text-sm font-semibold text-white underline decoration-dotted">{character.wildShapeBeastName}</p>
                        <p className="text-xs text-gray-400">Beast form active — tap for stats</p>
                      </button>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">Beast HP</span>
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

                {showBeastStats && character.wildShapeBeastName && (() => {
                  const activeBeast = allBeasts.find(b => b.name === character.wildShapeBeastName)
                  if (!activeBeast) return null
                  const abilityMod = (score: number) => Math.floor((score - 10) / 2)
                  const fmtMod = (n: number) => n >= 0 ? `+${n}` : `${n}`
                  return (
                    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4" onClick={() => setShowBeastStats(false)}>
                      <div className="bg-gray-900 rounded-2xl w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between">
                          <div>
                            <h2 className="text-lg font-bold">{activeBeast.name}</h2>
                            <p className="text-xs text-gray-400">{activeBeast.size} Beast · CR {activeBeast.cr}</p>
                          </div>
                          <button onClick={() => setShowBeastStats(false)} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          {[['AC', activeBeast.ac], ['HP', activeBeast.hp], ['CR', activeBeast.cr]].map(([label, val]) => (
                            <div key={label as string} className="bg-gray-800 rounded-lg p-2">
                              <p className="text-xs text-gray-400">{label}</p>
                              <p className="font-bold">{val}</p>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          {[['STR', activeBeast.str], ['DEX', activeBeast.dex], ['CON', activeBeast.con]].map(([label, score]) => (
                            <div key={label as string} className="bg-gray-800 rounded-lg p-2">
                              <p className="text-xs text-gray-400">{label}</p>
                              <p className="font-bold">{score}</p>
                              <p className="text-xs text-gray-400">{fmtMod(abilityMod(score as number))}</p>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-1 text-sm">
                          {activeBeast.walkSpeed > 0 && <div className="flex justify-between"><span className="text-gray-400">Walk</span><span>{activeBeast.walkSpeed} ft</span></div>}
                          {activeBeast.flySpeed > 0 && <div className="flex justify-between"><span className="text-gray-400">Fly</span><span>{activeBeast.flySpeed} ft</span></div>}
                          {activeBeast.swimSpeed > 0 && <div className="flex justify-between"><span className="text-gray-400">Swim</span><span>{activeBeast.swimSpeed} ft</span></div>}
                          {activeBeast.climbSpeed > 0 && <div className="flex justify-between"><span className="text-gray-400">Climb</span><span>{activeBeast.climbSpeed} ft</span></div>}
                        </div>
                        {activeBeast.attacks.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Attacks</p>
                            <div className="space-y-1">
                              {activeBeast.attacks.map((atk, i) => (
                                <div key={i} className="flex justify-between text-sm bg-gray-800 rounded-lg px-3 py-1.5">
                                  <span className="font-medium">{atk.name}</span>
                                  <span className="text-red-400">{atk.dice} <span className="text-gray-400 text-xs">{atk.type}</span></span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}

                <p className="text-xs text-gray-600 text-center">
                  Max CR {crLabel(limits.maxCr)}{!limits.allowFly ? ' · No fly' : ''}{!limits.allowSwim ? ' · No swim' : ''}
                </p>
              </section>
            )
          })()
        )}

        {/* Attacks */}
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
          const equippedWeapons = inventory.filter(i => i.isEquipped && (
            i.equippedSlot === 'Weapon' || i.equippedSlot === 'Offhand' ||
            i.equippedSlot === 'MainHand' || i.equippedSlot === 'OffHand'
          ))
          const RANGED_RE = /\b(bow|crossbow|dart|sling|blowgun|net)\b/i
          const autoAttacks = equippedWeapons.map(item => {
            const isRanged = RANGED_RE.test(item.name) || RANGED_RE.test(item.notes ?? '')
            const ability = isRanged ? 'Dexterity' : 'Strength'
            const aMod = Math.floor(((d.abilityScores[ability] ?? 10) - 10) / 2)
            const isOffHand = item.equippedSlot === 'Offhand' || item.equippedSlot === 'OffHand'
            const toHit = aMod + profBonusNum + (isOffHand ? -profBonusNum : 0)
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
                        <span className="text-[10px] text-gray-400 ml-1.5 font-normal">{atk.slot ?? 'unarmed'}</span>
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
                          className="text-xs text-gray-400 hover:text-indigo-400 transition-colors"
                        >✏</button>
                        <button
                          onClick={() => deleteAttackMutation.mutate(atk.id)}
                          className="text-xs text-gray-400 hover:text-red-400 transition-colors"
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

        {/* Ability Scores + Saves + Skills */}
        <div className="flex gap-3 items-start">

          {/* Left column: Ability Scores stacked above Saves */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">

            {/* Ability Scores */}
            <section className="bg-gray-900 rounded-2xl p-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Ability Scores</h2>
                {character.gameType === 'dnd5e' && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPointBuyMode(m => !m)}
                      className={`text-[10px] px-2 py-0.5 rounded transition-colors ${pointBuyMode ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
                    >Point Buy</button>
                  </div>
                )}
              </div>
              {pointBuyMode && character.gameType === 'dnd5e' && (() => {
                const pointsSpent = ABILITY_KEYS.reduce((sum, key) => {
                  const base = Math.min(Math.max(d.abilityScores[key] ?? 8, 8), 15)
                  return sum + (POINT_BUY_COST[base] ?? 0)
                }, 0)
                const pointsRemaining = POINT_BUY_BUDGET - pointsSpent
                return (
                  <>
                    <div className={`text-center text-xs font-semibold mb-2 ${pointsRemaining < 0 ? 'text-red-400' : pointsRemaining === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {pointsSpent} / {POINT_BUY_BUDGET} points used — {pointsRemaining} remaining
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {ABILITY_KEYS.map(key => {
                        const base = Math.min(Math.max(d.abilityScores[key] ?? 8, 8), 15)
                        const racial = getRacialBonus(key)
                        const asi = getAsiBonus(key)
                        const total = base + racial + asi
                        const cost = POINT_BUY_COST[base] ?? 0
                        const canIncrease = base < 15 && pointsRemaining >= ((POINT_BUY_COST[base + 1] ?? 9) - cost)
                        const canDecrease = base > 8
                        return (
                          <div key={key} className="bg-gray-800 rounded-xl p-2 text-center">
                            <p className="text-[10px] text-gray-400 mb-0.5">{ABILITY_SHORT[key]}</p>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => canDecrease && patch({ abilityScores: { ...d.abilityScores, [key]: base - 1 } })}
                                disabled={!canDecrease}
                                className="w-5 h-5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-xs leading-none flex items-center justify-center"
                              >−</button>
                              <span className="text-sm font-bold w-6 text-center">{base}</span>
                              <button
                                onClick={() => canIncrease && patch({ abilityScores: { ...d.abilityScores, [key]: base + 1 } })}
                                disabled={!canIncrease}
                                className="w-5 h-5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-xs leading-none flex items-center justify-center"
                              >+</button>
                            </div>
                            <p className="text-[10px] text-indigo-400">{mod(total)}{racial !== 0 ? ` (${total})` : ''}</p>
                            <p className="text-[9px] text-gray-600">{cost}pt</p>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )
              })()}
              {!pointBuyMode && (
                <div className="grid grid-cols-2 gap-1.5">
                  {ABILITY_KEYS.map(key => {
                    const total = totalAbilityScore(key)
                    return (
                      <button
                        key={key}
                        onClick={() => { setAbilityScoreRaw(String(d.abilityScores[key] ?? 10)); setAbilityBreakdownKey(key) }}
                        className="bg-gray-800 hover:bg-gray-700 rounded-xl p-2 text-center transition-colors"
                      >
                        <p className="text-[10px] text-gray-400 mb-0.5">{ABILITY_SHORT[key]}</p>
                        <p className="text-sm font-bold">{total}</p>
                        <p className="text-[10px] text-indigo-400">{mod(total)}</p>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Saving Throws */}
            <section className="bg-gray-900 rounded-2xl p-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Saves
                  {savingThrowChaBonus !== 0 && (
                    <span className="ml-1 text-indigo-400 normal-case">+{savingThrowChaBonus} CHA (aura)</span>
                  )}
                </h2>
                {character.gameType === 'dnd5e' && CLASS_SAVING_THROWS[character.characterClass] && (
                  <button
                    onClick={() => patch({ savingThrowProficiencies: CLASS_SAVING_THROWS[character.characterClass] })}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
                    title={`Set to ${CLASS_SAVING_THROWS[character.characterClass]?.join(' + ')}`}
                  >Fill from class</button>
                )}
              </div>
              <div className="space-y-0.5">
                {saveList.map(({ name, ability }) => {
                  const isProficient = d.savingThrowProficiencies.includes(name)
                  const isClassSave = character.gameType === 'dnd5e' && (CLASS_SAVING_THROWS[character.characterClass] ?? []).includes(name)
                  const total = abilityMod(ability) + (isProficient ? profBonusNum : 0) + savingThrowChaBonus
                  return (
                    <button
                      key={name}
                      onClick={() => toggleSaveProficiency(name)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors text-left"
                    >
                      <span className={`w-3 h-3 rounded-full border-2 flex-shrink-0 transition-colors ${isProficient ? 'bg-indigo-500 border-indigo-500' : 'border-gray-500'}`} />
                      <span className="flex-1 text-xs truncate">{name}</span>
                      {isProficient && isClassSave && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-indigo-900/60 text-indigo-400">class</span>
                      )}
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
                {maxSkillProficiencies !== null
                  ? `${d.skillProficiencies.length}/${maxSkillProficiencies}`
                  : `${d.skillProficiencies.length} selected`}
              </span>
            </div>
            <div className="space-y-0.5">
              {skillList.map(({ name, ability }) => {
                const isProficient = d.skillProficiencies.includes(name)
                const bgSkills = character.background ? (BACKGROUND_SKILLS[character.background] ?? []) : []
                const classSkills = character.classSkillProficiencies ?? []
                const isFromBackground = bgSkills.includes(name)
                const isFromClass = classSkills.includes(name)
                const lockedByBackground = isFromBackground && isProficient
                const lockedByClass = isFromClass && isProficient
                const locked = lockedByBackground || lockedByClass
                const disabled = locked || (!isProficient && atSkillLimit)
                const total = abilityMod(ability) + (isProficient ? profBonusNum : 0)
                const dotColour = isProficient
                  ? isFromBackground ? 'bg-amber-500 border-amber-500'
                  : isFromClass ? 'bg-purple-500 border-purple-500'
                  : 'bg-indigo-500 border-indigo-500'
                  : 'border-gray-500'
                const scoreColour = isProficient
                  ? isFromBackground ? 'text-amber-300'
                  : isFromClass ? 'text-purple-300'
                  : 'text-indigo-300'
                  : 'text-gray-300'
                return (
                  <button
                    key={name}
                    onClick={() => !disabled && toggleSkillProficiency(name)}
                    disabled={disabled}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left ${locked ? 'cursor-default' : disabled ? 'opacity-35 cursor-not-allowed' : 'hover:bg-gray-800'}`}
                  >
                    <span className={`w-3 h-3 rounded-full border-2 flex-shrink-0 transition-colors ${dotColour}`} />
                    <span className="flex-1 text-xs truncate">{name}</span>
                    {isFromBackground && isProficient && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-amber-900/60 text-amber-400">bg</span>
                    )}
                    {isFromClass && isProficient && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-purple-900/60 text-purple-400">cl</span>
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

      {/* Ability Score Breakdown Modal */}
      {abilityBreakdownKey && (() => {
        const key = abilityBreakdownKey
        const base = d.abilityScores[key] ?? 10
        const racial = getRacialBonus(key)
        const asi = getAsiBonus(key)
        const total = base + racial + asi
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setAbilityBreakdownKey(null)}>
            <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-xs" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">{key}</h3>
                <button onClick={() => setAbilityBreakdownKey(null)} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
              </div>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Base score</span>
                  <input
                    type="number" min={1} max={30}
                    value={abilityScoreRaw}
                    onChange={e => setAbilityScoreRaw(e.target.value)}
                    onBlur={e => {
                      const n = parseInt(e.target.value, 10)
                      if (!e.target.value.trim() || isNaN(n)) {
                        const orig = character.abilityScores[key] ?? 10
                        setAbilityScoreRaw(String(orig))
                        patch({ abilityScores: { ...d.abilityScores, [key]: orig } })
                      } else {
                        const clamped = Math.max(1, Math.min(30, n))
                        setAbilityScoreRaw(String(clamped))
                        patch({ abilityScores: { ...d.abilityScores, [key]: clamped } })
                      }
                    }}
                    className="w-16 text-center bg-gray-800 rounded-lg px-2 py-1 border border-gray-700 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                {racial !== 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Racial bonus{race ? ` (${race.name})` : ''}</span>
                    <span className="text-emerald-400 font-semibold">{racial >= 0 ? `+${racial}` : racial}</span>
                  </div>
                )}
                {asi !== 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Feat (ASI)</span>
                    <span className="text-emerald-400 font-semibold">{asi >= 0 ? `+${asi}` : asi}</span>
                  </div>
                )}
                <div className="border-t border-gray-700 pt-2 flex items-center justify-between font-bold">
                  <span>Total</span>
                  <span className="text-white text-base">{total} <span className="text-indigo-400 font-normal text-xs">({mod(total)})</span></span>
                </div>
              </div>
              {isDirty && (
                <p className="text-xs text-amber-400 text-center">Don't forget to save your changes.</p>
              )}
            </div>
          </div>
        )
      })()}

    </div>
  )
}
