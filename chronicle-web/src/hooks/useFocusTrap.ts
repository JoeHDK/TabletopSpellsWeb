import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE_SELECTORS =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Traps keyboard focus within `ref`, closes on Escape, and restores focus when unmounted.
 * Pass `enabled=false` when the element is not visible to skip the effect.
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  enabled = true,
) {
  // Keep onClose in a ref so the effect doesn't re-run when the callback identity changes
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    if (!enabled) return
    const container = ref.current
    if (!container) return

    const previousFocus = document.activeElement as HTMLElement | null

    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS))

    // Only focus the first element on initial open
    getFocusable()[0]?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key === 'Tab') {
        const focusable = getFocusable()
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last?.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first?.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [ref, enabled])
}
