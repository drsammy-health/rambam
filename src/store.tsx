import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react'
import { DEFAULT_API_URL } from './lib/openwearables/config'
import type { AppState } from './types'

export function createState(): AppState {
  return {
    apiUrl: DEFAULT_API_URL,
    users: [],
    activeUserIds: [],
    metrics: [
      { key: 'heart_rate', label: 'Heart Rate', unit: 'bpm', continuous: true },
      { key: 'resting_heart_rate', label: 'Resting Heart Rate', unit: 'bpm' },
      { key: 'blood_glucose', label: 'Blood Glucose', unit: 'mg/dL' },
      { key: 'respiratory_rate', label: 'Respiratory Rate', unit: 'rpm' },
      { key: 'heart_rate_variability_sdnn', label: 'HRV (SDNN)', unit: 'ms' },
    ],
    activeMetricKeys: [],
    chartSeries: [],
    dateFrom: null,
    dateTo: null,
    loading: false,
    loadingProgress: null,
    error: null,
    view: 'dashboard',
    hasApiKey: false,
  }
}

type AppContextValue = {
  state: AppState
  setPartial: (partial: Partial<AppState>) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(createState())

  const setPartial = useCallback((partial: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...partial }))
  }, [])

  return (
    <AppContext.Provider value={{ state, setPartial }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppState(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppState must be used within AppProvider')
  return ctx
}
