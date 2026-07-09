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
    selectedUserId: null,
    metrics: [
      { key: 'heart_rate', label: 'Heart Rate', unit: 'bpm' },
      { key: 'resting_heart_rate', label: 'Resting Heart Rate', unit: 'bpm' },
      { key: 'steps', label: 'Steps', unit: 'steps' },
      { key: 'oxygen_saturation', label: 'SpO2', unit: '%' },
      { key: 'body_temperature', label: 'Body Temperature', unit: '°C' },
      { key: 'blood_glucose', label: 'Blood Glucose', unit: 'mg/dL' },
      {
        key: 'blood_pressure_systolic',
        label: 'Blood Pressure (Sys)',
        unit: 'mmHg',
      },
      {
        key: 'blood_pressure_diastolic',
        label: 'Blood Pressure (Dia)',
        unit: 'mmHg',
      },
      { key: 'respiratory_rate', label: 'Respiratory Rate', unit: 'rpm' },
      { key: 'weight', label: 'Weight', unit: 'kg' },
      { key: 'body_fat_percentage', label: 'Body Fat %', unit: '%' },
      { key: 'vo2_max', label: 'VO2 Max', unit: 'mL/kg/min' },
      { key: 'energy', label: 'Energy Burned', unit: 'kcal' },
      { key: 'heart_rate_variability_sdnn', label: 'HRV (SDNN)', unit: 'ms' },
    ],
    selectedMetric: null,
    dataPoints: [],
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
