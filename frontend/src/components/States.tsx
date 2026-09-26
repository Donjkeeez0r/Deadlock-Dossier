import clsx from 'clsx'
import type { ReactNode } from 'react'
import { ApiError, NETWORK_ERROR_STATUS, errorMessage } from '../api/client'
import { Button } from './Button'

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} aria-hidden="true" />
}

type StateMessageProps = {
  title: string
  children?: ReactNode
  action?: ReactNode
  tone?: 'neutral' | 'error'
  className?: string
}

/** Пустое состояние или ошибка: что случилось и что делать дальше. */
export function StateMessage({ title, children, action, tone = 'neutral', className }: StateMessageProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={clsx('flex flex-col items-center gap-3 px-4 py-10 text-center', className)}
    >
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true" className={tone === 'error' ? 'text-loss' : 'text-brass'}>
        <path d="M18 1 35 18 18 35 1 18Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M18 8 28 18 18 28 8 18Z" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
        <circle cx="18" cy="18" r="2.5" fill="currentColor" />
      </svg>
      <p className="font-serif text-2xl text-parchment">{title}</p>
      {children && <div className="max-w-md text-parchment-muted">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

function describe(error: unknown): { title: string; text: string } {
  if (error instanceof ApiError) {
    if (error.status === 503) {
      return {
        title: 'Сервис статистики Deadlock временно недоступен',
        text: 'Данные матчей берутся с внешнего сервиса, и сейчас он не отвечает. Попробуйте через пару минут.',
      }
    }
    if (error.status === NETWORK_ERROR_STATUS || error.status >= 500) {
      return { title: 'Сервер не отвечает', text: 'Проверьте подключение к интернету и что сервер запущен, затем повторите попытку.' }
    }
    return { title: 'Не удалось загрузить данные', text: error.message }
  }
  return { title: 'Не удалось загрузить данные', text: errorMessage(error) }
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const { title, text } = describe(error)
  return (
    <StateMessage
      tone="error"
      title={title}
      className={className}
      action={
        onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry}>
            Повторить
          </Button>
        )
      }
    >
      {text}
    </StateMessage>
  )
}
