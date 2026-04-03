import { useState, useCallback } from 'react'

/**
 * Lightweight form state hook.
 * Usage: const [form, setField, setForm] = useFormState({ name: '', age: 0 })
 */
export function useFormState<T extends Record<string, unknown>>(initial: T) {
  const [form, setForm] = useState<T>(initial)

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  const reset = useCallback(() => setForm(initial), [initial])

  return [form, setField, setForm, reset] as const
}
