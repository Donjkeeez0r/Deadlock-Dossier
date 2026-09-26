import { useState, type FormEvent } from 'react'
import { errorMessage } from '../../api/client'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { TextField } from '../../components/TextField'
import { useDeleteBuild, useRenameBuild } from '../../hooks/queries'

const MAX_NAME = 100

type Target = { id: string; name: string }

/** Окно переименования. Монтируется заново на каждое открытие (key), поэтому поле берёт свежее имя. */
export function RenameBuildDialog({ build, onClose }: { build: Target; onClose: () => void }) {
  const [name, setName] = useState(build.name)
  const [touched, setTouched] = useState(false)
  const rename = useRenameBuild()

  const trimmed = name.trim()
  const nameError = !trimmed ? 'Введите название сборки' : trimmed.length > MAX_NAME ? `Не длиннее ${MAX_NAME} символов` : null

  function close() {
    if (rename.isPending) return
    onClose()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    setTouched(true)
    if (nameError) return
    if (trimmed === build.name) return onClose()
    rename.mutate({ shareId: build.id, name: trimmed }, { onSuccess: onClose })
  }

  return (
    <Modal open onClose={close} locked={rename.isPending} title="Переименовать">
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
        {rename.isError && (
          <p role="alert" className="text-sm text-loss">
            {errorMessage(rename.error)}
          </p>
        )}
        <Button type="submit" size="lg" disabled={rename.isPending}>
          {rename.isPending ? 'Сохраняем…' : 'Сохранить'}
        </Button>
      </form>
    </Modal>
  )
}

/** Подтверждение удаления. onDeleted вызывается после ответа сервера. */
export function DeleteBuildDialog({
  build,
  onClose,
  onDeleted,
}: {
  build: Target
  onClose: () => void
  onDeleted?: () => void
}) {
  const remove = useDeleteBuild()

  function close() {
    if (remove.isPending) return
    onClose()
  }

  function confirm() {
    remove.mutate(build.id, {
      onSuccess: () => {
        onClose()
        onDeleted?.()
      },
    })
  }

  return (
    <Modal open onClose={close} locked={remove.isPending} title="Удалить сборку?">
      <div className="flex flex-col gap-4">
        <p className="text-parchment-muted">
          «<span className="break-words text-parchment">{build.name}</span>» исчезнет из ваших сборок, а ссылка на неё
          перестанет открываться. Отменить это нельзя.
        </p>
        {remove.isError && (
          <p role="alert" className="text-sm text-loss">
            {errorMessage(remove.error)}
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button variant="danger" onClick={confirm} disabled={remove.isPending} className="sm:flex-1">
            {remove.isPending ? 'Удаляем…' : 'Удалить'}
          </Button>
          <Button variant="ghost" onClick={close} disabled={remove.isPending} className="sm:flex-1" data-autofocus>
            Отмена
          </Button>
        </div>
      </div>
    </Modal>
  )
}
