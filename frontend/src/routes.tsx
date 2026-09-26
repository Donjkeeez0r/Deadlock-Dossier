import { createBrowserRouter } from 'react-router'
import { Layout } from './components/Layout'
import { HomePage } from './features/home/HomePage'
import { NotFoundPage } from './features/NotFoundPage'

// Главная грузится сразу, остальные разделы — отдельными чанками.
export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'counter',
        lazy: () => import('./features/counter/CounterPage').then((m) => ({ Component: m.CounterPage })),
      },
      {
        path: 'matchup',
        lazy: () => import('./features/matchup/MatchupPage').then((m) => ({ Component: m.MatchupPage })),
      },
      {
        path: 'builder',
        lazy: () => import('./features/builder/BuilderPage').then((m) => ({ Component: m.BuilderPage })),
      },
      {
        path: 'build/:shareId',
        lazy: () => import('./features/build-view/BuildViewPage').then((m) => ({ Component: m.BuildViewPage })),
      },
      {
        path: 'compare',
        lazy: () => import('./features/compare/ComparePage').then((m) => ({ Component: m.ComparePage })),
      },
      {
        path: 'my-builds',
        lazy: () => import('./features/my-builds/MyBuildsPage').then((m) => ({ Component: m.MyBuildsPage })),
      },
      {
        path: 'login',
        lazy: () => import('./features/auth/AuthPage').then((m) => ({ Component: () => <m.AuthPage key="login" mode="login" /> })),
      },
      {
        path: 'register',
        lazy: () =>
          import('./features/auth/AuthPage').then((m) => ({ Component: () => <m.AuthPage key="register" mode="register" /> })),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
