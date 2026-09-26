import { useSyncExternalStore } from 'react'
import { readJson, removeKey, writeJson } from './storage'

// Сессия: JWT + email из формы (эндпоинта /me на бэкенде нет).

const STORAGE_KEY = 'dossier.session'

export type Session = { token: string; email: string; expiresAt: number }

function decodeExp(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const { exp } = JSON.parse(json) as { exp?: unknown }
    return typeof exp === 'number' ? exp * 1000 : null
  } catch {
    return null
  }
}

function isValid(session: Session | null): session is Session {
  return (
    !!session &&
    typeof session.token === 'string' &&
    typeof session.email === 'string' &&
    typeof session.expiresAt === 'number' &&
    session.expiresAt > Date.now()
  )
}

let session: Session | null = null
let logoutTimer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function scheduleLogout() {
  clearTimeout(logoutTimer)
  if (!session) return
  // setTimeout не принимает задержку больше ~24,8 суток; JWT живёт сутки.
  const delay = Math.min(session.expiresAt - Date.now(), 2 ** 31 - 1)
  logoutTimer = setTimeout(() => authStore.logout(), Math.max(delay, 0))
}

function init() {
  const stored = readJson<Session>(STORAGE_KEY)
  if (isValid(stored)) {
    session = stored
    scheduleLogout()
  } else if (stored) {
    removeKey(STORAGE_KEY)
  }
}

export const authStore = {
  getSession: () => session,

  getToken(): string | null {
    if (session && session.expiresAt <= Date.now()) {
      authStore.logout()
      return null
    }
    return session?.token ?? null
  },

  login(token: string, email: string) {
    // Если exp не прочитался — считаем, что токен живёт сутки, как настроено на сервере.
    const expiresAt = decodeExp(token) ?? Date.now() + 24 * 60 * 60 * 1000
    session = { token, email, expiresAt }
    writeJson(STORAGE_KEY, session)
    scheduleLogout()
    emit()
  },

  logout() {
    if (!session) return
    session = null
    clearTimeout(logoutTimer)
    removeKey(STORAGE_KEY)
    emit()
  },

  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

init()

// Выход в соседней вкладке — выходим и здесь.
window.addEventListener('storage', (event) => {
  // key === null — в другой вкладке вызвали localStorage.clear().
  if (event.key !== STORAGE_KEY && event.key !== null) return
  const next = readJson<Session>(STORAGE_KEY)
  session = isValid(next) ? next : null
  scheduleLogout()
  emit()
})

export function useSession(): Session | null {
  return useSyncExternalStore(authStore.subscribe, authStore.getSession)
}
