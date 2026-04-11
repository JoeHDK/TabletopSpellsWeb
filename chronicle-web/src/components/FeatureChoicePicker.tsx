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
  return (
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
                  <button
                    key={option.id}
                    disabled={isDisabled}
                    onClick={() => onToggle(definition.id, option.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl border text-sm transition-colors ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-900/30 text-white'
                        : isDisabled
                          ? 'border-gray-800 bg-gray-800/60 text-gray-600'
                          : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <div className="font-medium">{option.name}</div>
                    {option.description && (
                      <div className="mt-1 text-[11px] text-gray-400">{option.description}</div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
