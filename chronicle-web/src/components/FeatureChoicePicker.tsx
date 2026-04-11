import { useState } from 'react'
import type { FeatureChoiceDefinition } from '../utils/featureChoices'

interface FeatureChoicePickerProps {
  title: string
  description: string
  definitions: FeatureChoiceDefinition[]
  choices: Record<string, string[]>
  onToggle: (definitionId: string, optionId: string) => void
}

export default function FeatureChoicePicker({
  title,
  description,
  definitions,
  choices,
  onToggle,
}: FeatureChoicePickerProps) {
  const [optionInfo, setOptionInfo] = useState<{ title: string; description: string } | null>(null)

  return (
    <>
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-xs text-gray-400">{description}</p>
        </div>

        {definitions.map(definition => {
          const selected = choices[definition.id] ?? []
          return (
            <div key={definition.id} className="space-y-2">
              <div>
                <p className="text-xs font-semibold text-gray-300">{definition.prompt}</p>
                <p className="text-xs text-indigo-300 mt-1">{selected.length}/{definition.count} selected</p>
              </div>
              <div className="space-y-1.5">
                {definition.options.map(option => {
                  const isSelected = selected.includes(option.id)
                  const isDisabled = !isSelected && selected.length >= definition.count
                  return (
                    <div
                      key={option.id}
                      className={`flex items-stretch gap-2 rounded-xl border text-sm transition-colors ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-900/30 text-white'
                          : isDisabled
                            ? 'border-gray-800 bg-gray-800/60 text-gray-600'
                            : 'border-gray-700 bg-gray-800 text-gray-300'
                      }`}
                    >
                      <button
                        disabled={isDisabled}
                        onClick={() => onToggle(definition.id, option.id)}
                        className={`flex-1 text-left px-3 py-2 rounded-xl ${
                          !isDisabled && !isSelected ? 'hover:bg-gray-800/80 transition-colors' : ''
                        }`}
                      >
                        <div className="font-medium">{option.name}</div>
                        {option.description && (
                          <div className="mt-1 text-[11px] text-gray-400">{option.description}</div>
                        )}
                      </button>
                      {option.description && (
                        <button
                          type="button"
                          onClick={() => setOptionInfo({ title: option.name, description: option.description ?? '' })}
                          className="self-center mr-2 text-xs text-indigo-300 hover:text-indigo-200 transition-colors"
                          title={`About ${option.name}`}
                        >
                          ℹ
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      {optionInfo && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4" onClick={() => setOptionInfo(null)}>
          <div className="bg-gray-900 rounded-2xl w-full max-w-lg p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-bold">{optionInfo.title}</h2>
              <button onClick={() => setOptionInfo(null)} className="text-gray-400 hover:text-white text-xl leading-none shrink-0">✕</button>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{optionInfo.description}</p>
          </div>
        </div>
      )}
    </>
  )
}
