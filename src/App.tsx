import Sidebar from './components/Sidebar'
import Spinner from './components/Spinner'
import { useInitApp } from './hooks/useInitApp'
import { useAppState } from './store'
import Dashboard from './views/Dashboard'
import Settings from './views/Settings'

export default function App() {
  const { state } = useAppState()
  const ready = useInitApp()

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen w-screen">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-cream flex">
      <Sidebar />
      <div className="flex-1 min-w-0 overflow-hidden">
        {state.view === 'dashboard' ? <Dashboard /> : <Settings />}
      </div>
    </div>
  )
}
