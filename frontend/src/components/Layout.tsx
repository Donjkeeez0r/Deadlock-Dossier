import clsx from 'clsx'
import { motion, useReducedMotion } from 'motion/react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { authStore, useSession } from '../lib/auth'
import { ErrorBoundary } from './ErrorBoundary'

const NAV = [
  { to: '/counter', label: 'Контрпик' },
  { to: '/matchup', label: 'Матчап' },
  { to: '/builder', label: 'Конструктор' },
]

function Logo() {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="Досье — на главную">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
        <path d="M16 2 30 16 16 30 2 16Z" fill="none" stroke="var(--color-brass)" strokeWidth="1.6" />
        <path d="M16 7 25 16 16 25 7 16Z" fill="none" stroke="var(--color-brass-dark)" />
        <circle cx="16" cy="16" r="3.4" fill="var(--color-soul)" className="transition-[filter] group-hover:drop-shadow-[0_0_6px_var(--color-soul)]" />
      </svg>
      <span className="poster text-[1.7rem] font-bold tracking-[0.18em] text-parchment">Досье</span>
    </Link>
  )
}

function Account() {
  const session = useSession()
  if (!session) {
    return (
      <Link
        to="/login"
        className="text-sm font-semibold text-brass-light underline-offset-4 hover:text-parchment hover:underline"
      >
        Войти
      </Link>
    )
  }
  return (
    <div className="flex min-w-0 items-center gap-3 text-sm">
      <span className="hidden max-w-[16rem] truncate text-parchment-muted lg:inline" title={session.email}>
        {session.email}
      </span>
      <NavLink
        to="/my-builds"
        className={({ isActive }) =>
          clsx(
            'font-semibold whitespace-nowrap underline-offset-4 hover:text-parchment hover:underline',
            isActive ? 'text-parchment' : 'text-brass-light',
          )
        }
      >
        Мои сборки
      </NavLink>
      <button
        type="button"
        onClick={() => authStore.logout()}
        className="font-semibold text-brass-light underline-offset-4 hover:text-parchment hover:underline"
      >
        Выйти
      </button>
    </div>
  )
}

function navClass({ isActive }: { isActive: boolean }, mobile = false) {
  return clsx(
    'poster relative flex h-full items-center px-1 font-bold transition-colors',
    mobile ? 'min-w-0 justify-center text-[0.85rem] tracking-[0.08em]' : 'text-base tracking-[0.14em]',
    isActive ? 'text-brass-light' : 'text-parchment-muted hover:text-parchment',
    // Активный пункт отмечен латунной планкой снизу.
    isActive &&
      'after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:bg-gradient-to-r after:from-brass-dark after:via-brass-light after:to-brass-dark',
  )
}

export function Layout() {
  const location = useLocation()
  const reduced = useReducedMotion()

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-brass focus:px-4 focus:py-2 focus:text-ink"
      >
        К содержимому
      </a>
      <header className="sticky top-0 z-40 border-b border-brass/25 bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
          <Logo />
          <nav aria-label="Разделы" className="hidden h-full items-center gap-8 md:flex">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className={(s) => navClass(s)}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <Account />
        </div>
        <nav aria-label="Разделы" className="grid h-11 grid-cols-3 border-t border-brass/15 md:hidden">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={(s) => navClass(s, true)}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <ErrorBoundary key={location.pathname}>
          <motion.div
            key={location.pathname}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </ErrorBoundary>
      </main>

      <footer className="border-t border-brass/15 py-6 text-center text-sm text-parchment-muted">
        <p className="px-4">
          Статистика матчей — deadlock-api.com, обновляется раз в два часа. Неофициальный фанатский проект.
        </p>
      </footer>
    </div>
  )
}
