import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '../api/characters'
import { inventoryApi } from '../api/inventory'
import type { UpdateCharacterRequest } from '../types'

const ABILITY_KEYS = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma']
const ABILITY_SHORT: Record<string, string> = {
  Strength: 'STR', Dexterity: 'DEX', Constitution: 'CON',
  Intelligence: 'INT', Wisdom: 'WIS', Charisma: 'CHA',
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
        <section className="bg-gray-900 rounded-2xl p-4 space-y-3">
          <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Identity</h2>
          <div className="grid grid-cols-2 gap-3">
            {/* Class — display only */}
            <div>
              <p className="text-xs text-gray-500 mb-1">Class</p>
              <p className="font-medium">{character.characterClass}</p>
            </div>

            {/* Level stepper */}
            <div>
              <p className="text-xs text-gray-500 mb-1">Level</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => patch({ level: Math.max(1, d.level - 1) })}
                  className="w-7 h-7 bg-gray-800 hover:bg-gray-700 rounded-full text-lg leading-none transition-colors"
                >−</button>
                <span className="min-w-[28px] text-center font-bold text-xl">{d.level}</span>
                <button
                  onClick={() => patch({ level: Math.min(20, d.level + 1) })}
                  className="w-7 h-7 bg-gray-800 hover:bg-gray-700 rounded-full text-lg leading-none transition-colors"
                >+</button>
              </div>
            </div>

            {/* Subclass */}
            <div className="col-span-2">
              <p className="text-xs text-gray-500 mb-1">Subclass</p>
              {subclassList.length > 0 ? (
                <select
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
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

            <div>
              <p className="text-xs text-gray-500 mb-1">System</p>
              <p className="font-medium text-sm">{character.gameType === 'dnd5e' ? 'D&D 5e' : 'Pathfinder 1e'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Caster Type</p>
              <p className="font-medium text-sm">{character.isDivineCaster ? 'Divine' : 'Arcane'}</p>
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
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => patch({ currentHp: Math.max(0, d.currentHp - 1) })}
                  className="w-7 h-7 bg-gray-800 hover:bg-red-900/50 rounded-full text-base leading-none transition-colors"
                >−</button>
                <div className="flex items-center gap-1">
                  <input
                    type="number" min={0} max={d.maxHp || 999}
                    value={d.currentHp}
                    onChange={e => patch({ currentHp: Math.max(0, Number(e.target.value)) })}
                    className="w-12 text-center bg-transparent font-bold text-lg focus:outline-none focus:border-b border-indigo-400"
                  />
                  <span className="text-gray-500">/</span>
                  <input
                    type="number" min={0}
                    value={d.maxHp}
                    onChange={e => patch({ maxHp: Math.max(0, Number(e.target.value)) })}
                    className="w-12 text-center bg-transparent text-gray-400 focus:outline-none focus:border-b border-indigo-400"
                  />
                </div>
                <button
                  onClick={() => patch({ currentHp: Math.min(d.maxHp || 999, d.currentHp + 1) })}
                  className="w-7 h-7 bg-gray-800 hover:bg-green-900/50 rounded-full text-base leading-none transition-colors"
                >+</button>
              </div>
            </div>
            <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
              <div className={`h-full ${hpColour} rounded-full transition-all`} style={{ width: `${hpPct}%` }} />
            </div>
          </div>

          {/* AC, Initiative, Proficiency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Armor Class</p>
              <div className="flex items-center justify-center gap-1">
                <input
                  type="number" min={0}
                  value={d.baseArmorClass}
                  onChange={e => patch({ baseArmorClass: Number(e.target.value) })}
                  className="w-12 text-center bg-transparent text-white text-xl font-bold focus:outline-none"
                />
              </div>
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
          </div>

          {/* Passive Perception */}
          <div className="flex items-center justify-between text-sm px-1">
            <span className="text-gray-400">Passive Perception (WIS)</span>
            <span className="font-semibold">{passivePerception}</span>
          </div>
        </section>

        {/* Ability Scores */}
        <section className="bg-gray-900 rounded-2xl p-4">
          <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Ability Scores</h2>
          <div className="grid grid-cols-3 gap-3">
            {ABILITY_KEYS.map(key => (
              <div key={key} className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">{ABILITY_SHORT[key]}</p>
                <input
                  type="number" min={1} max={30}
                  value={d.abilityScores[key] ?? 10}
                  onChange={e => patch({ abilityScores: { ...(d.abilityScores), [key]: +e.target.value } })}
                  className="w-full bg-transparent text-white text-xl font-bold text-center focus:outline-none"
                />
                <p className="text-sm text-indigo-400">{mod(d.abilityScores[key] ?? 10)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Saving Throws (derived, read-only) */}
        <section className="bg-gray-900 rounded-2xl p-4">
          <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Saving Throw Modifiers</h2>
          <div className="grid grid-cols-2 gap-2">
            {ABILITY_KEYS.map(key => {
              const m = abilityMod(key)
              return (
                <div key={key} className="flex items-center justify-between px-3 py-2 bg-gray-800 rounded-lg text-sm">
                  <span className="text-gray-400">{key}</span>
                  <span className="font-semibold">{m >= 0 ? `+${m}` : m}</span>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-gray-600 mt-2 text-center">Base modifiers only · proficiency not tracked here</p>
        </section>

      </div>
    </div>
  )
}
