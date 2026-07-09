import { useEffect, useRef, useState } from 'react'
import Button from '../components/Button'
import Spinner from '../components/Spinner'
import { destroyChart, renderChart } from '../lib/charts'
import { fetchAllTimeseries, getUserDisplayName } from '../lib/openwearables/api'
import { useAppState } from '../store'

function getDefaultDateRange(): { from: string; to: string } {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const format = (d: Date) => d.toISOString().split('T')[0]
  return { from: format(sevenDaysAgo), to: format(now) }
}

export default function Dashboard() {
  const { state, setPartial } = useAppState()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const defaults = getDefaultDateRange()
  const [userId, setUserId] = useState(state.selectedUserId || '')
  const [metric, setMetric] = useState(state.selectedMetric || '')
  const [dateFrom, setDateFrom] = useState(state.dateFrom || defaults.from)
  const [dateTo, setDateTo] = useState(state.dateTo || defaults.to)

  useEffect(() => {
    if (!canvasRef.current || state.dataPoints.length === 0) return

    const labels = state.dataPoints.map((d) => {
      const date = new Date(d.timestamp)
      return date.toLocaleDateString()
    })
    const values = state.dataPoints.map((d) => d.value)
    const metricLabel =
      state.metrics.find((m) => m.key === state.selectedMetric)?.label ||
      state.selectedMetric ||
      ''

    renderChart(canvasRef.current, labels, values, metricLabel)

    return () => {
      destroyChart()
    }
  }, [state.dataPoints, state.selectedMetric, state.metrics])

  const handleLoad = async () => {
    if (!userId || !metric) {
      setPartial({ error: 'Please select a user and a metric.' })
      return
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setPartial({ error: 'From date must be before To date.' })
      return
    }

    setPartial({
      loading: true,
      error: null,
      loadingProgress: { current: 0, total: 0, message: 'Fetching data...' },
      selectedUserId: userId,
      selectedMetric: metric,
      dateFrom,
      dateTo,
    })

    try {
      const result = await fetchAllTimeseries(
        userId,
        metric,
        dateFrom,
        dateTo,
        '1hour',
        20,
        (current, total, message) => {
          setPartial({ loadingProgress: { current, total, message } })
        },
      )

      if (result.ok) {
        setPartial({ dataPoints: result.data })
      } else {
        setPartial({ error: result.error })
      }
    } catch (err) {
      setPartial({ error: err instanceof Error ? err.message : String(err) })
    } finally {
      setPartial({ loading: false, loadingProgress: null })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLoad()
  }

  return (
    <div className="flex flex-col gap-4 max-w-300 mx-auto">
      <div className="card flex gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="field-label">User</label>
          <select
            className="min-w-45"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="">Select user...</option>
            {state.users.map((u) => (
              <option key={u.id} value={u.id}>
                {getUserDisplayName(u)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="field-label">Metric</label>
          <select
            className="min-w-45"
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
          >
            <option value="">Select metric...</option>
            {state.metrics.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label} ({m.unit})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="field-label">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="field-label">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <Button
          variant="primary"
          disabled={state.loading}
          onClick={handleLoad}
        >
          {state.loading ? 'Loading...' : 'Load Data'}
        </Button>
      </div>

      {state.error && <div className="error-banner">{state.error}</div>}

      <div className="card min-h-100">
        {state.loading && state.loadingProgress ? (
          <div className="flex flex-col items-center justify-center gap-4 h-full">
            <Spinner />
            <div className="text-center">
              <p className="font-medium text-charcoal">
                {state.loadingProgress.message}
              </p>
              {state.loadingProgress.total > 0 && (
                <p className="text-sm text-warm-gray mt-1">
                  Page {state.loadingProgress.current} of{' '}
                  {state.loadingProgress.total}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="chart-container">
              <canvas ref={canvasRef} />
            </div>
            {state.dataPoints.length > 0 ? (
              <p className="mt-2 text-xs text-warm-gray">
                {state.dataPoints.length} data points
              </p>
            ) : (
              <p className="text-center text-warm-gray-light p-8">
                Select a user and metric, then click Load Data
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
