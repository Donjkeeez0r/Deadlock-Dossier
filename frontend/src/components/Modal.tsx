import { useEffect, useRef, type ReactNode } from 'react'

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
  /** Запретить закрытие (например, пока идёт сохранение). */
  locked?: boolean
}

/** Модальное окно на нативном <dialog>: фокус-ловушка и Esc из коробки. */
export function Modal({ open, onClose, title, children, wide, locked }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // React применяет autoFocus, пока <dialog> ещё закрыт, поэтому фокусируем вручную.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        if (locked) e.preventDefault()
      }}
      onClick={(e) => {
        // Клик по подложке (за пределами содержимого) закрывает окно.
        if (e.target === e.currentTarget && !locked) onClose()
      }}
      aria-label={title}
      className={`m-auto w-[calc(100%-2rem)] bg-transparent p-0 text-parchment backdrop:bg-ink/80 backdrop:backdrop-blur-sm ${wide ? 'max-w-3xl' : 'max-w-md'}`}
    >
      {open && (
        <div className="frame max-h-[85dvh] overflow-y-auto">
          <header className="flex items-center justify-between gap-4 border-b border-brass/20 px-5 pt-4 pb-3">
            <h2 className="poster text-2xl font-bold text-brass-light">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              disabled={locked}
              className="flex size-9 disabled:opacity-30 items-center justify-center text-parchment-muted hover:text-parchment"
              aria-label="Закрыть"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M2 2 14 14M14 2 2 14" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
          </header>
          <div className="p-5">{children}</div>
        </div>
      )}
    </dialog>
  )
}
