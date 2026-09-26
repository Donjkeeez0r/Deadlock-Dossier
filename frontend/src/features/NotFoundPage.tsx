import { ButtonLink } from '../components/Button'
import { Rule } from '../components/Panel'

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center py-12 text-center">
      <p className="poster text-[clamp(6rem,24vw,11rem)] font-bold text-brass-dark/70">404</p>
      <Rule className="my-6 w-full" />
      <h1 className="font-serif text-3xl text-parchment">Такой страницы нет</h1>
      <p className="mt-3 text-parchment-muted">Адрес устарел или в нём опечатка. Начните с главной — там все разделы.</p>
      <ButtonLink to="/" className="mt-8">
        На главную
      </ButtonLink>
    </div>
  )
}
