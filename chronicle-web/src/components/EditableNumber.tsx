import { useState, useRef, useEffect, useLayoutEffect } from 'react'

interface Props {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  /** className for the displayed value span */
  className?: string
  /** Label shown inside the popup above the input */
  label?: string
}

const POPUP_WIDTH = 128 // px (w-32)
const POPUP_HEIGHT = 130 // approx height: label + input + footer + padding
const SCREEN_MARGIN = 8
// Minimum safe top to avoid being obscured by the sticky header (~96px)
const POPUP_SAFE_TOP = 104

export default function EditableNumber({ value, onChange, min, max, className = '', label }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({})
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({})
  const [flipDown, setFlipDown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const openPopup = () => {
    setDraft(String(value))
    setFlipDown(false)
    setPopupStyle({})
    setArrowStyle({})
    setOpen(true)
  }

  // After popup mounts, compute fixed viewport coordinates.
  // Using position:fixed bypasses overflow:hidden on ancestor containers.
  useLayoutEffect(() => {
    if (!open || !wrapRef.current) return
    const rect = wrapRef.current.getBoundingClientRect()
    const centreX = rect.left + rect.width / 2

    // Horizontal: center on trigger, clamped to viewport edges
    const rawLeft = centreX - POPUP_WIDTH / 2
    const left = Math.max(SCREEN_MARGIN, Math.min(rawLeft, window.innerWidth - POPUP_WIDTH - SCREEN_MARGIN))

    // Vertical: show above unless too close to sticky header
    const spaceAbove = rect.top - POPUP_SAFE_TOP
    const shouldFlipDown = spaceAbove < POPUP_HEIGHT + SCREEN_MARGIN
    setFlipDown(shouldFlipDown)
    const top = shouldFlipDown
      ? rect.bottom + SCREEN_MARGIN
      : rect.top - POPUP_HEIGHT - SCREEN_MARGIN

    setPopupStyle({ position: 'fixed', top, left, width: POPUP_WIDTH })

    // Arrow offset: points to the trigger's horizontal centre
    const arrowLeft = centreX - left - 6 // 6 = half arrow width (12px / 2)
    setArrowStyle({ left: Math.max(6, Math.min(arrowLeft, POPUP_WIDTH - 18)) })
  }, [open])

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        inputRef.current?.select()
        inputRef.current?.focus()
      })
    }
  }, [open])

  const commit = () => {
    const parsed = parseInt(draft, 10)
    if (!isNaN(parsed)) {
      const clamped = min !== undefined && max !== undefined
        ? Math.min(max, Math.max(min, parsed))
        : min !== undefined ? Math.max(min, parsed)
        : max !== undefined ? Math.min(max, parsed)
        : parsed
      onChange(clamped)
    }
    setOpen(false)
  }

  // Close on outside click (popup is a DOM child of wrapRef so .contains() works correctly)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        commit()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, draft]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={openPopup}
        className={`cursor-pointer hover:text-indigo-300 transition-colors ${className}`}
        title="Click to edit"
      >
        {value}
      </button>

      {open && (
        <div
          className="z-50 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl p-3"
          style={popupStyle}
        >
          {/* Arrow — points toward the trigger */}
          <div
            className={`absolute w-3 h-3 bg-gray-800 border-gray-600 rotate-45 ${flipDown ? '-top-1.5 border-l border-t' : '-bottom-1.5 border-r border-b'}`}
            style={{ ...arrowStyle, transform: 'translateX(-50%) rotate(45deg)' }}
          />
          {label && <p className="text-xs text-gray-400 mb-1.5 text-center">{label}</p>}
          <input
            ref={inputRef}
            type="number"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') setOpen(false)
            }}
            className="w-full bg-gray-700 text-white text-center text-xl font-bold rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-500 text-center mt-1.5">Enter to confirm</p>
        </div>
      )}
    </div>
  )
}
