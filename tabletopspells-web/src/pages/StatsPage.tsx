import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '../api/characters'
import { inventoryApi } from '../api/inventory'
import { attacksApi } from '../api/attacks'
import EditableNumber from '../components/EditableNumber'
import { resizeImage } from '../utils/resizeImage'
import type { UpdateCharacterRequest, CharacterAttack, AddAttackRequest, AbilityModKey } from '../types'

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

  const equipmentAcBonus = inventory
    .filter(i => i.isEquipped && i.acBonus != null)
    .reduce((sum, i) => sum + (i.acBonus ?? 0), 0)

  // Local draft state — only set when something is dirty
  const [draft, setDraft] = useState<UpdateCharacterRequest & { currentHp?: number; maxHp?: number } | null>(null)
  const [editingName, setEditingName] = useState(false)

  useEffect(() => {
    if (editingName) nameRef.current?.focus()
  }, [editingName])

  const isDirty = draft !== null

  const updateMutation = useMutation({
    mutationFn: (req: UpdateCharacterRequest) => charactersApi.update(id!, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['character', id] })
      setDraft(null)
      setEditingName(false)
    },
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

  const patch = (fields: Partial<typeof d>) => setDraft(prev => ({ ...prev, ...fields }))

  const handleSave = () => {
    if (!draft) return
    const { currentHp, maxHp, ...charUpdate } = draft
    if (Object.keys(charUpdate).length > 0) updateMutation.mutate(charUpdate)
    if (currentHp !== undefined || maxHp !== undefined) {
      hpMutation.mutate({
        currentHp: currentHp ?? character.currentHp,
        maxHp: maxHp ?? character.maxHp,
      })
    }
  }

  const abilityMod = (key: string) => Math.floor(((d.abilityScores[key] ?? 10) - 10) / 2)
  const passivePerception = 10 + abilityMod('Wisdom')
  const initiative = abilityMod('Dexterity')
  const profBonusNum = Math.floor((d.level - 1) / 4) + 2

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

  const hpPct = d.maxHp > 0 ? Math.max(0, Math.min(100, (d.currentHp / d.maxHp) * 100)) : 0
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
                  onChange={v => patch({ currentHp: Math.min(v, d.maxHp) })}
                  min={0} max={d.maxHp}
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
              <EditableNumber
                value={d.baseArmorClass}
                onChange={v => patch({ baseArmorClass: v })}
                min={0}
                label="Base AC"
                className="text-xl font-bold"
              />
              {equipmentAcBonus > 0 && (
                <p className="text-xs text-indigo-400 mt-0.5">+ {equipmentAcBonus} gear</p>
              )}
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Initiative</p>
              <p className="text-xl font-bold">{initiative >= 0 ? `+${initiative}` : initiative}</p>
              <p className="text-xs text-gray-500 mt-0.5">DEX mod</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Prof. Bonus</p>
              <p className="text-xl font-bold">{profBonus(d.level)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Lv {d.level}</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Passive Perception</p>
              <p className="text-xl font-bold">{passivePerception}</p>
              <p className="text-xs text-gray-500 mt-0.5">10 + WIS</p>
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

        {/* ── Attacks ─────────────────────────────────────── */}
        {(() => {
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
                {ABILITY_KEYS.map(key => (
                  <div key={key} className="bg-gray-800 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-gray-400 mb-0.5">{ABILITY_SHORT[key]}</p>
                    <EditableNumber
                      value={d.abilityScores[key] ?? 10}
                      onChange={v => patch({ abilityScores: { ...d.abilityScores, [key]: v } })}
                      min={1} max={30}
                      label={key}
                      className="text-sm font-bold"
                    />
                    <p className="text-[10px] text-indigo-400">{mod(d.abilityScores[key] ?? 10)}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Saving Throws */}
            <section className="bg-gray-900 rounded-2xl p-3">
              <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Saves</h2>
              <div className="space-y-0.5">
                {saveList.map(({ name, ability }) => {
                  const isProficient = d.savingThrowProficiencies.includes(name)
                  const total = abilityMod(ability) + (isProficient ? profBonusNum : 0)
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
