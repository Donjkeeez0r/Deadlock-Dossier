import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './Button'
import { StateMessage } from './States'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Ошибка отрисовки:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <StateMessage
          tone="error"
          title="Страница сломалась"
          action={
            <Button variant="ghost" onClick={() => window.location.reload()}>
              Перезагрузить страницу
            </Button>
          }
        >
          Произошла ошибка в интерфейсе. Перезагрузка обычно помогает; незаконченная сборка сохранится.
        </StateMessage>
      )
    }
    return this.props.children
  }
}
