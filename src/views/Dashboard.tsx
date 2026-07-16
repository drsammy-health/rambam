import { useEffect, useRef, useState } from 'react'
import MetricsPanel from '../components/MetricsPanel'
import Spinner from '../components/Spinner'
import { destroyChart, getSeriesColor, renderChart } from '../lib/charts'
import { generateAISummary, copyToClipboard } from '../lib/ai-summary'
import { fetchAllTimeseries, getUserDisplayName } from '../lib/openwearables/api'
import { useAppState } from '../store'
import type { ChartSeries } from '../types'
import type { ApiUser } from '../lib/openwearables/types'

function getDefaultDateRange(): { from: string; to: string } {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const format = (d: Date) => d.toISOString().split('T')[0]
  return { from: format(sevenDaysAgo), to: format(now) }
}

async function fetchSeriesForUsers(
  metric: { key: string; label: string; unit: string; continuous?: boolean },
  userIds: string[],
  users: ApiUser[],
  dateFrom: string,
  dateTo: string,
  colorOffset: number,
  onProgress: (current: number, total: number, message: string) => void,
): Promise<{ series: ChartSeries[]; errors: string[] }> {
  const series: ChartSeries[] = []
  const errors: string[] = []

  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i]
    const user = users.find((u) => u.id === userId)
    const userName = user ? getUserDisplayName(user) : userId

    const result = await fetchAllTimeseries(
      userId,
      metric.key,
      dateFrom,
      dateTo,
      '1hour',
      20,
      (current, total, message) => {
        onProgress(current, total, `${metric.label} — ${userName} — ${message}`)
      },
    )

    if (!result.ok) {
      errors.push(`${userName}: ${result.error}`)
      continue
    }

    series.push({
      id: `${userId}:${metric.key}`,
      userId,
      metricKey: metric.key,
      label: `${userName} — ${metric.label}`,
      unit: metric.unit,
      color: getSeriesColor(colorOffset + series.length),
      continuous: metric.continuous ?? false,
      dataPoints: result.data,
    })
  }

  return { series, errors }
}

export default function Dashboard() {
  const { state, setPartial } = useAppState()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const defaults = getDefaultDateRange()
  const [dateFrom, setDateFrom] = useState(state.dateFrom || defaults.from)
  const [dateTo, setDateTo] = useState(state.dateTo || defaults.to)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) return
    if (state.chartSeries.length === 0) {
      destroyChart()
      return
    }
    renderChart(canvasRef.current, state.chartSeries)
    return () => {
      destroyChart()
    }
  }, [state.chartSeries])

  const handleCopySummary = async () => {
    const summary = generateAISummary(
      state.chartSeries,
      state.users,
      dateFrom,
      dateTo,
    )
    const ok = await copyToClipboard(summary)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      setPartial({ error: 'Clipboard access denied. Unable to copy summary.' })
    }
  }

  const handleDateChange = (nextFrom: string, nextTo: string) => {
    setDateFrom(nextFrom)
    setDateTo(nextTo)
    setPartial({
      dateFrom: nextFrom,
      dateTo: nextTo,
      chartSeries: [],
      error: null,
    })
  }

  const handleRefresh = async () => {
    if (state.activeMetricKeys.length === 0) return
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setPartial({ error: 'From date must be before To date.' })
      return
    }

    setPartial({
      loading: true,
      error: null,
      chartSeries: [],
    })

    const allSeries: ChartSeries[] = []
    const errors: string[] = []

    for (const metricKey of state.activeMetricKeys) {
      const metric = state.metrics.find((m) => m.key === metricKey)
      if (!metric) continue

      const result = await fetchSeriesForUsers(
        metric,
        state.activeUserIds,
        state.users,
        dateFrom,
        dateTo,
        allSeries.length,
        (current, total, message) => {
          setPartial({
            loadingProgress: { current, total, message },
          })
        },
      )

      allSeries.push(...result.series)
      errors.push(...result.errors)
    }

    setPartial({
      chartSeries: allSeries,
      loading: false,
      loadingProgress: null,
      error: errors.length > 0 ? errors.join(' \u2022 ') : null,
    })
  }

  const handleToggleMetric = async (metricKey: string) => {
    const isActive = state.activeMetricKeys.includes(metricKey)

    if (isActive) {
      // Turn off: remove all series for this metric
      setPartial({
        activeMetricKeys: state.activeMetricKeys.filter((k) => k !== metricKey),
        chartSeries: state.chartSeries.filter((s) => s.metricKey !== metricKey),
      })
      return
    }

    // Turn on: validate
    if (state.activeUserIds.length === 0) {
      setPartial({ error: 'Select at least one user from the sidebar.' })
      return
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setPartial({ error: 'From date must be before To date.' })
      return
    }

    setPartial({
      loading: true,
      error: null,
      activeMetricKeys: [...state.activeMetricKeys, metricKey],
    })

    const metric = state.metrics.find((m) => m.key === metricKey)
    if (!metric) {
      setPartial({ loading: false, error: 'Unknown metric.' })
      return
    }

    const result = await fetchSeriesForUsers(
      metric,
      state.activeUserIds,
      state.users,
      dateFrom,
      dateTo,
      state.chartSeries.length,
      (current, total, message) => {
        setPartial({
          loadingProgress: { current, total, message },
        })
      },
    )

    if (result.series.length === 0) {
      setPartial({
        chartSeries: state.chartSeries,
        loading: false,
        loadingProgress: null,
        error: result.errors.length > 0 ? result.errors.join(' \u2022 ') : null,
        activeMetricKeys: state.activeMetricKeys.filter((k) => k !== metricKey),
      })
    } else {
      setPartial({
        chartSeries: [...state.chartSeries, ...result.series],
        loading: false,
        loadingProgress: null,
        error: result.errors.length > 0 ? result.errors.join(' \u2022 ') : null,
      })
    }
  }

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full p-4 gap-4 overflow-hidden">
        {/* Date toolbar */}
        <div className="card flex items-end gap-4 flex-shrink-0">
          <div className="flex flex-col gap-1">
            <label className="field-label">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => handleDateChange(e.target.value, dateTo)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="field-label">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => handleDateChange(dateFrom, e.target.value)}
            />
          </div>
          {state.activeMetricKeys.length > 0 && state.chartSeries.length === 0 && !state.loading && (
            <div className="flex flex-col gap-1">
              <label className="field-label">Data</label>
              <button
                type="button"
                className="btn-primary text-xs whitespace-nowrap"
                onClick={handleRefresh}
              >
                Refresh Data
              </button>
            </div>
          )}
          <div className="flex flex-col gap-1 ml-auto">
            <label className="field-label">Export</label>
            <button
              type="button"
              className="btn-secondary text-xs whitespace-nowrap"
              disabled={state.chartSeries.length === 0}
              onClick={handleCopySummary}
            >
              {copied ? 'Copied!' : 'Copy AI Summary'}
            </button>
          </div>
        </div>

        {state.error && (
          <div className="error-banner flex-shrink-0 flex items-center justify-between gap-2">
            <span>{state.error}</span>
            <button
              type="button"
              className="text-xs font-medium underline"
              style={{ color: 'var(--color-error-text)' }}
              onClick={() => setPartial({ error: null })}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Metrics panel */}
        <div className="card flex-shrink-0">
          <p className="field-label mb-2">Metrics</p>
          <MetricsPanel
            metrics={state.metrics}
            activeMetricKeys={state.activeMetricKeys}
            onToggle={handleToggleMetric}
          />
        </div>

        {/* Chart */}
        <div className="card flex-1 min-h-0 relative">
          {state.loading ? (
            <div className="flex flex-col items-center justify-center gap-4 h-full">
              <Spinner />
              <div className="text-center">
                <p className="font-medium text-charcoal">
                  {state.loadingProgress?.message || 'Fetching data...'}
                </p>
                {state.loadingProgress && state.loadingProgress.total > 0 && (
                  <p className="text-sm text-warm-gray mt-1">
                    Page {state.loadingProgress.current} of{' '}
                    {state.loadingProgress.total}
                  </p>
                )}
              </div>
            </div>
          ) : state.chartSeries.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-center text-warm-gray-light">
                {state.activeMetricKeys.length > 0
                  ? 'Date range changed. Click Refresh Data to update the chart.'
                  : 'Select users from the sidebar, then click a metric to chart.'}
              </p>
            </div>
          ) : (
            <div className="chart-container">
              <canvas ref={canvasRef} />
            </div>
          )}
        </div>
    </div>
  )
}
