import { useState, useMemo } from 'react'
import type { CharacterClass, CharacterClassEntry } from '../types/character'
import {
  checkMulticlassPrereqs, unmetPrereqsText,
  MULTICLASS_SAVING_THROWS, MULTICLASS_SKILL_PICKS,
  CLASS_SKILL_LIST, ALL_DND5E_SKILLS,
} from '../utils/multiclassTables'

const DND5E_CLASSES: CharacterClass[] = [
  'Artificer', 'Barbarian', 'Bard', 'Cleric', 'Druid',
  'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue',
  'Sorcerer', 'Warlock', 'Wizard',
]

interface Props {
  existingClasses: CharacterClassEntry[]
  abilityScores: Record<string, number>
  existingSavingThrows: string[]
  existingSkillProficiencies: string[]
  gameType: string
  onConfirm: (entry: CharacterClassEntry, savingThrows: string[], skills: string[]) => void
  onCancel: () => void
}

type Step = 'select' | 'proficiencies'

export default function AddClassModal({
  existingClasses, abilityScores, existingSavingThrows, existingSkillProficiencies,
  gameType, onConfirm, onCancel,
}: Props) {
  const takenClasses = new Set(existingClasses.map(e => e.characterClass))
  const available = DND5E_CLASSES.filter(c => !takenClasses.has(c))

  const [step, setStep] = useState<Step>('select')
  const [selectedClass, setSelectedClass] = useState<CharacterClass>(available[0] ?? 'Fighter')
  const [level, setLevel] = useState(1)
  const [prereqConfirmed, setPrereqConfirmed] = useState(false)
  // Proficiency step state
  const [saveChecks, setSaveChecks] = useState<Record<string, boolean>>({})
  const [skillPicks, setSkillPicks] = useState<string[]>([])

  const isDnd5e = gameType === 'dnd5e'
  const prereqsMet = !isDnd5e || checkMulticlassPrereqs(selectedClass, abilityScores)
  const prereqText = isDnd5e ? unmetPrereqsText(selectedClass, abilityScores) : ''
  const showWarning = isDnd5e && !prereqsMet

  // Saving throws this class grants on multiclass entry
  const grantedSaves = useMemo(() => {
    const saves = MULTICLASS_SAVING_THROWS[selectedClass] ?? []
    return saves
  }, [selectedClass])

  // Skill config
  const skillConfig = MULTICLASS_SKILL_PICKS[selectedClass]
  const skillPool = skillConfig?.anySkill
    ? ALL_DND5E_SKILLS
    : (CLASS_SKILL_LIST[selectedClass] ?? [])
  // Filter out skills already proficient in
  const availableSkills = skillPool.filter(s => !existingSkillProficiencies.includes(s))
  const requiredSkills = skillConfig?.count ?? 0

  // Reset proficiency state when class changes
  const handleClassChange = (cls: CharacterClass) => {
    setSelectedClass(cls)
    setPrereqConfirmed(false)
    setSaveChecks({})
    setSkillPicks([])
  }

  const handleProceedToProficiencies = () => {
    if (showWarning && !prereqConfirmed) {
      setPrereqConfirmed(true)
      return
    }
    // Pre-check saves that aren't already known
    const initial: Record<string, boolean> = {}
    for (const save of grantedSaves) {
      initial[save] = !existingSavingThrows.includes(save)
    }
    setSaveChecks(initial)
    setSkillPicks([])
    setStep('proficiencies')
  }

  const handleConfirm = () => {
    const savesToAdd = grantedSaves.filter(s => saveChecks[s])
    onConfirm(
      { characterClass: selectedClass, subclass: 'None', level, cantripsKnown: 0 },
      savesToAdd,
      skillPicks,
    )
  }

  const toggleSkill = (skill: string) => {
    setSkillPicks(prev => {
      if (prev.includes(skill)) return prev.filter(s => s !== skill)
      if (prev.length >= requiredSkills) return prev
      return [...prev, skill]
    })
  }

  const canConfirm = skillPicks.length >= requiredSkills || availableSkills.length === 0

  if (step === 'proficiencies') {
    const hasSaves = grantedSaves.length > 0
    const hasSkills = requiredSkills > 0

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
          <div>
            <h2 className="text-lg font-bold text-white">Proficiencies Gained</h2>
            <p className="text-xs text-gray-400 mt-1">
              When you multiclass into <span className="text-indigo-300 font-medium">{selectedClass}</span>, you gain the following proficiencies.
            </p>
          </div>

          {/* Saving Throws */}
          {hasSaves ? (
            <div>
              <p className="text-xs font-semibold text-gray-300 mb-2">Saving Throws</p>
              <div className="space-y-1">
                {grantedSaves.map(save => {
                  const alreadyHave = existingSavingThrows.includes(save)
                  return (
                    <label key={save} className={`flex items-center gap-2 text-sm cursor-pointer ${alreadyHave ? 'opacity-50' : ''}`}>
                      <input
                        type="checkbox"
                        checked={!!saveChecks[save]}
                        disabled={alreadyHave}
                        onChange={e => setSaveChecks(p => ({ ...p, [save]: e.target.checked }))}
                        className="rounded accent-indigo-500"
                      />
                      <span className={alreadyHave ? 'text-gray-500 line-through' : 'text-white'}>
                        {save}
                      </span>
                      {alreadyHave && <span className="text-xs text-gray-500">(already proficient)</span>}
                    </label>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-400">
              {selectedClass} grants no saving throw proficiencies when multiclassed into.
            </div>
          )}

          {/* Skill Picks */}
          {hasSkills && (
            <div>
              <p className="text-xs font-semibold text-gray-300 mb-1">
                Skills — pick {requiredSkills}
                {skillConfig?.anySkill ? ' (any skill)' : ` from ${selectedClass} list`}
              </p>
              <p className="text-xs text-indigo-300 mb-2">{skillPicks.length}/{requiredSkills} chosen</p>
              {availableSkills.length === 0 ? (
                <p className="text-xs text-gray-500 bg-gray-800 rounded-lg px-3 py-2">
                  You are already proficient in all available skills for this class.
                </p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {availableSkills.map(skill => {
                    const selected = skillPicks.includes(skill)
                    const disabled = !selected && skillPicks.length >= requiredSkills
                    return (
                      <button
                        key={skill}
                        disabled={disabled}
                        onClick={() => toggleSkill(skill)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                          selected
                            ? 'bg-indigo-700/40 border-indigo-500 text-white'
                            : disabled
                            ? 'bg-gray-800/50 border-gray-700 text-gray-600 cursor-not-allowed'
                            : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        {skill}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {!hasSaves && !hasSkills && (
            <div className="bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-400">
              {selectedClass} grants no additional proficiencies when multiclassed into.
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded-xl py-2 text-sm font-medium transition-colors"
              onClick={() => setStep('select')}
            >
              ← Back
            </button>
            <button
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2 text-sm font-medium transition-colors disabled:opacity-40"
              onClick={handleConfirm}
              disabled={!canConfirm}
            >
              Add {selectedClass}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Step 1: Select class
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
        <h2 className="text-lg font-bold text-white">Add Class</h2>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Class</label>
          <select
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
            value={selectedClass}
            onChange={e => handleClassChange(e.target.value as CharacterClass)}
          >
            {available.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Starting Level</label>
          <input
            type="number"
            min={1}
            max={20}
            value={level}
            onChange={e => setLevel(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
            className="w-24 bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
          />
        </div>

        {showWarning && (
          <div className="bg-yellow-900/40 border border-yellow-600/50 rounded-lg px-3 py-2 text-xs text-yellow-300">
            ⚠️ {selectedClass} requires {prereqText}.
            {prereqConfirmed ? ' Proceeding anyway…' : ' Click Next again to proceed anyway.'}
          </div>
        )}

        {available.length === 0 && (
          <p className="text-xs text-gray-500">All classes are already assigned.</p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2 text-sm font-medium transition-colors disabled:opacity-40"
            onClick={handleProceedToProficiencies}
            disabled={available.length === 0}
          >
            {showWarning && !prereqConfirmed ? '⚠️ Add Anyway' : 'Next →'}
          </button>
          <button
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded-xl py-2 text-sm font-medium transition-colors"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
