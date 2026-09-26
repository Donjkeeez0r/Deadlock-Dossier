import { authStore } from '../lib/auth'

const BASE_URL: string = import.meta.env.VITE_API_URL ?? '/backend'

type NestError = { statusCode?: number; message?: string | string[]; error?: string }

export class ApiError extends Error {
  readonly status: number
  /** Исходные сообщения сервера (для валидации — массив английских строк). */
  readonly details: string[]

  constructor(status: number, message: string, details: string[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

/** Сеть недоступна или бэкенд выключен. */
export const NETWORK_ERROR_STATUS = 0

function toApiError(status: number, body: NestError | null): ApiError {
  const raw = body?.message
  if (Array.isArray(raw)) {
    // Ошибки ValidationPipe приходят по-английски — пользователю показываем общий текст.
    console.warn('Ошибка валидации на сервере:', raw)
    return new ApiError(status, 'Проверьте введённые данные', raw)
  }
  if (typeof raw === 'string' && /[А-Яа-яЁё]/.test(raw)) {
    // Бизнес-ошибки бэкенда уже на русском — показываем как есть.
    return new ApiError(status, raw, [raw])
  }
  if (typeof raw === 'string' && raw) console.warn('Ошибка сервера:', raw)
  if (status === 400) return new ApiError(status, 'Проверьте введённые данные', raw ? [raw] : [])
  if (status === 503) {
    return new ApiError(status, 'Сервис статистики Deadlock временно недоступен')
  }
  if (status >= 500) {
    return new ApiError(status, 'Сервер не отвечает. Проверьте, что бэкенд запущен, и повторите попытку')
  }
  return new ApiError(status, `Запрос завершился ошибкой ${status}`)
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  query?: Record<string, string | number>
  body?: unknown
  signal?: AbortSignal
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, signal } = options

  let url = `${BASE_URL}${path}`
  if (query) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) params.set(key, String(value))
    url += `?${params.toString()}`
  }

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  // На вход и регистрацию токен не шлём: их 401 — это неверный пароль, а не протухшая сессия.
  const token = path.startsWith('/auth/') ? null : authStore.getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(
      NETWORK_ERROR_STATUS,
      'Нет связи с сервером. Проверьте подключение и повторите попытку',
    )
  }

  let text: string
  try {
    text = await response.text()
  } catch {
    throw new ApiError(NETWORK_ERROR_STATUS, 'Связь с сервером оборвалась. Повторите попытку')
  }
  let data: unknown = null
  let parsed = false
  if (text) {
    try {
      data = JSON.parse(text)
      parsed = true
    } catch {
      data = null
    }
  }

  // Токен отозван или пользователя больше нет — выходим, чтобы дальше работать гостем.
  // Сравниваем токен: запоздавший ответ на старый токен не должен выкинуть из новой сессии.
  if (response.status === 401 && token && authStore.getSession()?.token === token) authStore.logout()
  // Прокси Vite при выключенном бэкенде отдаёт 5xx без JSON — это тоже обрабатывается в toApiError.
  if (!response.ok) throw toApiError(response.status, data as NestError | null)
  // 204 No Content — например, после удаления.
  if (response.status === 204) return undefined as T
  if (!parsed) throw new ApiError(response.status, 'Сервер вернул некорректный ответ')
  return data as T
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'Что-то пошло не так. Повторите попытку'
}
