import { useEffect, useRef, type ReactNode } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  /** Extra classes on the inner panel, e.g. "max-w-2xl" */
  className?: string
  footer?: ReactNode
}

/**
 * Reusable modal shell with dark overlay, close-on-backdrop-click, and a header/footer slot.
 */
export function Modal({ title, onClose, children, className = 'max-w-lg', footer }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={panelRef}
        className={`relative w-full ${className} rounded-xl bg-gray-900 border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>

        {/* Footer (optional) */}
        {footer && (
          <div className="shrink-0 px-6 py-4 border-t border-gray-700">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
