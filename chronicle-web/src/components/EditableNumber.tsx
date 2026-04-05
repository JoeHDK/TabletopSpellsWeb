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

const POPUP_WIDTH = 128 // w-32
const SCREEN_MARGIN = 8
// Min safe distance from top of viewport before popup is considered clipped
// (accounts for the sticky header which is ~96px tall)
const POPUP_SAFE_TOP = 104

export default function EditableNumber({ value, onChange, min, max, className = '', label }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [offsetX, setOffsetX] = useState(0) // px adjustment from default centred position
  const [flipDown, setFlipDown] = useState(false) // true when there's not enough space above
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const flipComputedRef = useRef(false) // guard to avoid infinite flip loop

  const openPopup = () => {
    setDraft(String(value))
    setOffsetX(0)
    setFlipDown(false)
    flipComputedRef.current = false
    setOpen(true)
  }

  // After popup mounts, clamp horizontally and flip vertically if needed
  useLayoutEffect(() => {
    if (!open || !wrapRef.current) return
    const wrapRect = wrapRef.current.getBoundingClientRect()

    // Horizontal clamping
    const centreX = wrapRect.left + wrapRect.width / 2
    const defaultLeft = centreX - POPUP_WIDTH / 2
    const clampedLeft = Math.max(
      SCREEN_MARGIN,
      Math.min(defaultLeft, window.innerWidth - POPUP_WIDTH - SCREEN_MARGIN),
    )
    setOffsetX(clampedLeft - defaultLeft)

    // Vertical flip: measure actual popup top after render (only once per open)
    if (flipComputedRef.current) return
    flipComputedRef.current = true
    if (popupRef.current) {
      const popupTop = popupRef.current.getBoundingClientRect().top
      if (popupTop < POPUP_SAFE_TOP) setFlipDown(true)
    }
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

  // Close on outside click
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

  // Arrow points to the centre of the trigger, adjusted for popup offset
  const arrowLeft = `calc(50% - ${offsetX}px)`

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
          ref={popupRef}
          className={`absolute z-50 ${flipDown ? 'top-full mt-2' : 'bottom-full mb-2'} bg-gray-800 border border-gray-600 rounded-xl shadow-2xl p-3 w-32`}
          style={{ left: '50%', transform: `translateX(calc(-50% + ${offsetX}px))` }}
        >
          {/* Arrow — points toward the trigger */}
          <div
            className={`absolute w-3 h-3 bg-gray-800 border-gray-600 rotate-45 ${flipDown ? '-top-1.5 border-l border-t' : '-bottom-1.5 border-r border-b'}`}
            style={{ left: arrowLeft, transform: `translateX(-50%) rotate(45deg)` }}
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
