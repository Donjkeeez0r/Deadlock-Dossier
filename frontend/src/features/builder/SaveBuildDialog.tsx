import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { errorMessage } from '../../api/client'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { TextField } from '../../components/TextField'
import { useSaveBuild } from '../../hooks/queries'
import { useSession } from '../../lib/auth'

const MAX_NAME = 100

type Props = {
  open: boolean
  onClose: () => void
  heroId: number
  itemIds: number[]
  defaultName: string
}

export function SaveBuildDialog({ open, onClose, heroId, itemIds, defaultName }: Props) {
  const [name, setName] = useState(defaultName)
  const [touched, setTouched] = useState(false)
  const [copied, setCopied] = useState(false)
  const save = useSaveBuild()
  const session = useSession()

  const trimmed = name.trim()
  const nameError = !trimmed ? 'Введите название сборки' : trimmed.length > MAX_NAME ? `Не длиннее ${MAX_NAME} символов` : null
  const shareUrl = save.data ? `${window.location.origin}/build/${save.data.shareId}` : null

  function close() {
    // Сборка уже уходит на сервер — не теряем ссылку и не даём сохранить дубль.
    if (save.isPending) return
    onClose()
    setTouched(false)
    setCopied(false)
    save.reset()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    setTouched(true)
    if (nameError) return
    save.mutate({ name: trimmed, heroId, itemIds })
  }

  async function copy() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
    } catch {
      // Буфер обмена недоступен (не https или запрет) — выделяем ссылку для ручного копирования.
      document.getElementById('share-url')?.focus()
    }
  }

  return (
    <Modal open={open} onClose={close} locked={save.isPending} title={shareUrl ? 'Сборка сохранена' : 'Сохранить сборку'}>
      {shareUrl && save.data ? (
        <div className="flex flex-col gap-4">
          <p className="text-parchment-muted">
            Ссылка открывает сборку с оценкой — отправьте её тиммейтам.
            {save.data.owned && (
              <>
                {' '}
                Сборка также лежит в{' '}
                <Link to="/my-builds" className="text-brass-light underline-offset-4 hover:text-parchment hover:underline">
                  «Моих сборках»
                </Link>
                .
              </>
            )}
          </p>
          <input
            id="share-url"
            readOnly
            value={shareUrl}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Ссылка на сборку"
            className="h-11 w-full bg-surface-2 px-3 text-sm text-soul shadow-[inset_0_0_0_1px_rgb(95_224_192/0.4)] focus:outline-none"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => void copy()} className="sm:flex-1">
              {copied ? 'Ссылка скопирована' : 'Скопировать ссылку'}
            </Button>
            <Link
              to={`/build/${save.data.shareId}`}
              className="flex h-11 items-center justify-center px-4 font-semibold text-brass-light underline-offset-4 hover:text-parchment hover:underline"
            >
              Открыть сборку
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <TextField
            label="Название"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            error={touched ? nameError : null}
            hint={`${trimmed.length} / ${MAX_NAME}`}
            data-autofocus
          />
          {!session && (
            <p className="text-sm text-parchment-muted">
              Сборка сохранится по ссылке.{' '}
              <Link to="/login" state={{ from: '/builder' }} className="text-brass-light underline-offset-4 hover:text-parchment hover:underline">
                Войдите
              </Link>
              , чтобы она попала в «Мои сборки».
            </p>
          )}
          {save.isError && (
            <p role="alert" className="text-sm text-loss">
              {errorMessage(save.error)}
            </p>
          )}
          <Button type="submit" size="lg" disabled={save.isPending}>
            {save.isPending ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </form>
      )}
    </Modal>
  )
}
