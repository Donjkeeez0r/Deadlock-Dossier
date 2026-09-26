import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { errorMessage } from '../../api/client'
import { login, register } from '../../api/endpoints'
import { Button } from '../../components/Button'
import { Rule } from '../../components/Panel'
import { TextField } from '../../components/TextField'
import { authStore } from '../../lib/auth'

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/
const MIN_PASSWORD = 6

type Mode = 'login' | 'register'

const COPY: Record<Mode, { title: string; lead: string; submit: string; pending: string; switchText: string; switchLink: string; switchTo: string }> = {
  login: {
    title: 'Вход',
    lead: 'Войдите, чтобы сборки были привязаны к вашему аккаунту.',
    submit: 'Войти',
    pending: 'Входим…',
    switchText: 'Нет аккаунта?',
    switchLink: 'Зарегистрироваться',
    switchTo: '/register',
  },
  register: {
    title: 'Регистрация',
    lead: 'Нужны только почта и пароль.',
    submit: 'Зарегистрироваться',
    pending: 'Регистрируем…',
    switchText: 'Уже есть аккаунт?',
    switchLink: 'Войти',
    switchTo: '/login',
  },
}

/** Куда вернуться после входа: только внутренний путь, иначе на главную. */
function returnPath(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from
  if (typeof from !== 'string' || !from.startsWith('/')) return '/'
  // «//evil.com» и «/\evil.com» браузер считает другим сайтом — проверяем, что origin наш.
  const url = new URL(from, window.location.origin)
  return url.origin === window.location.origin ? url.pathname + url.search + url.hash : '/'
}

export function AuthPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const copy = COPY[mode]

  const mutation = useMutation({
    mutationFn: () => (mode === 'login' ? login : register)(email.trim(), password),
    onSuccess: ({ access_token }) => {
      authStore.login(access_token, email.trim())
      void navigate(returnPath(location.state), { replace: true })
    },
  })

  const emailError = !email.trim() ? 'Введите почту' : !EMAIL_RE.test(email.trim()) ? 'Почта должна выглядеть как name@example.com' : null
  const passwordError = password.length < MIN_PASSWORD ? `Пароль — не короче ${MIN_PASSWORD} символов` : null

  function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (emailError || passwordError) return
    mutation.mutate()
  }

  return (
    <div className="mx-auto max-w-md py-4 sm:py-10">
      <div className="frame [--cut:18px]">
        <div className="px-6 py-8 sm:px-10 sm:py-10">
          <h1 className="poster text-center text-5xl font-bold text-parchment">{copy.title}</h1>
          <p className="mt-3 text-center font-serif text-xl text-parchment-muted italic">{copy.lead}</p>
          <Rule className="my-7" />

          <form onSubmit={submit} noValidate className="flex flex-col gap-5">
            <TextField
              label="Почта"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={submitted ? emailError : null}
            />
            <TextField
              label="Пароль"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={submitted ? passwordError : null}
              hint={mode === 'register' ? `минимум ${MIN_PASSWORD} символов` : undefined}
            />
            {mutation.isError && (
              <p role="alert" className="cut-sm bg-loss/10 px-4 py-3 text-sm text-loss shadow-[inset_0_0_0_1px_rgb(209_73_63/0.5)]">
                {errorMessage(mutation.error)}
              </p>
            )}
            <Button type="submit" size="lg" disabled={mutation.isPending} className="mt-2">
              {mutation.isPending ? copy.pending : copy.submit}
            </Button>
          </form>

          <p className="mt-6 text-center text-parchment-muted">
            {copy.switchText}{' '}
            <Link to={copy.switchTo} state={location.state as unknown} className="font-semibold text-brass-light underline-offset-4 hover:text-parchment hover:underline">
              {copy.switchLink}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
