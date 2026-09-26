import clsx from 'clsx'
import { useId, type InputHTMLAttributes } from 'react'

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string | null
  hint?: string
}

export function TextField({ label, error, hint, className, ...rest }: TextFieldProps) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-semibold text-parchment">
          {label}
        </label>
        {hint && !error && (
          <span id={`${id}-hint`} className="nums text-xs text-parchment-muted">
            {hint}
          </span>
        )}
      </div>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={clsx(
          'cut h-12 w-full bg-surface-2 px-4 text-parchment [--cut:8px] placeholder:text-parchment-muted/60 focus:outline-none',
          error
            ? 'shadow-[inset_0_0_0_1px_var(--color-loss)]'
            : 'shadow-[inset_0_0_0_1px_rgb(201_162_90/0.35)] focus:shadow-[inset_0_0_0_1px_var(--color-brass-light)]',
        )}
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-loss">
          {error}
        </p>
      )}
    </div>
  )
}
