import Spinner from './components/Spinner'
import { useInitApp } from './hooks/useInitApp'
import { useAppState } from './store'
import Dashboard from './views/Dashboard'
import Settings from './views/Settings'

export default function App() {
  const { state, setPartial } = useAppState()
  const ready = useInitApp()

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-border">
        <h1
          className="text-lg font-semibold text-charcoal"
          style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
        >
          rambam
        </h1>
        <nav className="flex gap-2">
          <button
            type="button"
            className={`btn-secondary ${state.view === 'dashboard' ? 'active-nav' : ''}`}
            onClick={() => setPartial({ view: 'dashboard' })}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={`btn-secondary ${state.view === 'settings' ? 'active-nav' : ''}`}
            onClick={() => setPartial({ view: 'settings' })}
          >
            Settings
          </button>
        </nav>
      </header>
      <main className="flex-1 overflow-auto p-6">
        {state.view === 'dashboard' ? <Dashboard /> : <Settings />}
      </main>
    </div>
  )
}
