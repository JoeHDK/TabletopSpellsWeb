import type { Character, UpdateCharacterRequest } from '../../types'
import { CLASS_SAVING_THROWS } from './statsConstants'

interface SavingThrowsSectionProps {
  character: Character
  saveList: { name: string; ability: string }[]
  savingThrowProficiencies: string[]
  abilityMod: (key: string) => number
  profBonusNum: number
  savingThrowChaBonus: number
  equippedSavingThrowBonus: number
  toggleSaveProficiency: (key: string) => void
  patch: (fields: Partial<UpdateCharacterRequest & { currentHp?: number; maxHp?: number }>) => void
}

export function SavingThrowsSection({
  character,
  saveList,
  savingThrowProficiencies,
  abilityMod,
  profBonusNum,
  savingThrowChaBonus,
  equippedSavingThrowBonus,
  toggleSaveProficiency,
  patch,
}: SavingThrowsSectionProps) {
  const fmtMod = (n: number) => n >= 0 ? `+${n}` : `${n}`

  return (
    <section className="bg-gray-900 rounded-2xl p-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
          Saves
          {savingThrowChaBonus !== 0 && (
            <span className="ml-1 text-indigo-400 normal-case">+{savingThrowChaBonus} CHA (aura)</span>
          )}
          {equippedSavingThrowBonus !== 0 && (
            <span className="ml-1 text-blue-400 normal-case">{equippedSavingThrowBonus > 0 ? `+${equippedSavingThrowBonus}` : equippedSavingThrowBonus} (equipment)</span>
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
          const isProficient = savingThrowProficiencies.includes(name)
          const isClassSave = character.gameType === 'dnd5e' && (CLASS_SAVING_THROWS[character.characterClass] ?? []).includes(name)
          const total = abilityMod(ability) + (isProficient ? profBonusNum : 0) + savingThrowChaBonus + equippedSavingThrowBonus
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
  )
}
