import { useEffect, useRef, useState } from 'react'
import Spinner from '../components/Spinner'
import { destroyChart, renderChart } from '../lib/charts'
import { useAppState } from '../store'

export default function Dashboard() {
  const { state, setPartial } = useAppState()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hiddenSeriesIds, setHiddenSeriesIds] = useState<Set<string>>(
    () => new Set(),
  )

  const visibleChartSeries = state.chartSeries.filter(
    (series) => !hiddenSeriesIds.has(series.id),
  )

  useEffect(() => {
    setHiddenSeriesIds(new Set())
  }, [state.chartSeries])

  useEffect(() => {
    if (!canvasRef.current) return
    if (visibleChartSeries.length === 0) {
      destroyChart()
      return
    }
    renderChart(canvasRef.current, visibleChartSeries)
    return () => {
      destroyChart()
    }
  }, [state.chartSeries, hiddenSeriesIds])

  const toggleSeries = (seriesId: string) => {
    setHiddenSeriesIds((current) => {
      const next = new Set(current)
      if (next.has(seriesId)) {
        next.delete(seriesId)
      } else {
        next.add(seriesId)
      }
      return next
    })
  }

  const visiblePointCount = visibleChartSeries.reduce(
    (total, series) => total + series.dataPoints.length,
    0,
  )
  const hasMultipleProviders = state.chartSeries.length > 1
  const singleSeries =
    state.chartSeries.length === 1 ? state.chartSeries[0] : null

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full p-4 gap-4 overflow-hidden">
        {state.error && (
          <div className="error-banner shrink-0 flex items-center justify-between gap-2">
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

        {/* Chart */}
        <div className="card flex-1 min-h-0 relative">
          {state.loading ? (
            <div className="flex flex-col items-center justify-center gap-4 h-full">
              <Spinner />
              <div className="text-center">
                {(() => {
                  const msg = state.loadingProgress?.message || 'Fetching data...'
                  const parts = msg.split('\n')
                  return (
                    <>
                      {parts.length > 1 && (
                        <p className="font-medium text-charcoal">
                          {parts[0]}
                        </p>
                      )}
                      <p className="text-sm text-warm-gray">
                        {parts[parts.length - 1]}
                      </p>
                    </>
                  )
                })()}
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
                {state.activeMetricKey != null || state.activeEventKeys.length > 0
                  ? 'Click Fetch Data in the sidebar to update the chart.'
                  : 'Select a user from the sidebar, then choose metrics or events to display.'}
              </p>
            </div>
          ) : (
            <div className="chart-container">
              <canvas
                ref={canvasRef}
                key={state.chartSeries.map((s) => s.id).join(',')}
              />
              {/* Provider visibility and data point count overlay */}
              <div className="absolute top-2 right-2 flex items-center gap-3 text-[10px] text-warm-gray-light bg-cream/80 px-2 py-1 rounded">
                <span>
                  {singleSeries
                    ? `${singleSeries.metricLabel}: ${visiblePointCount.toLocaleString()} pts`
                    : `${visiblePointCount} pts`}
                  {singleSeries?.provider && (
                    <>
                      {' | '}
                      <span className="capitalize">
                        {singleSeries.provider}
                      </span>
                    </>
                  )}
                </span>
                {hasMultipleProviders &&
                  state.chartSeries.map((series) => (
                    <label
                      key={series.id}
                      className="flex items-center gap-1 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={!hiddenSeriesIds.has(series.id)}
                        onChange={() => toggleSeries(series.id)}
                        style={{ accentColor: series.color }}
                      />
                      <span>
                        {series.provider ?? series.metricLabel}
                      </span>
                    </label>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Event list panel */}
        {state.eventSeries.length > 0 && (
          <div className="card shrink-0 max-h-48 overflow-y-auto">
            <p className="field-label mb-2">Event Data</p>
            <div className="grid grid-cols-2 gap-4">
              {/* Sleep column */}
              {(() => {
                const sleepSeries = state.eventSeries.find((s) => s.eventKey === 'sleep')
                if (!sleepSeries) return <div />
                return (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-semibold text-sage-dark">
                      😴 Sleep ({sleepSeries.dataPoints.length})
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {[...sleepSeries.dataPoints]
                        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                        .map((point, idx) => {
                          const end = (point.raw as { end_time: string }).end_time
                          const endStr = end
                            ? new Date(end).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                            : ''
                          return (
                            <p key={idx} className="text-xs text-warm-gray">
                              {new Date(point.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                              {endStr && <> → {endStr}</>}
                              {' — '}{point.label}
                            </p>
                          )
                        })}
                    </div>
                  </div>
                )
              })()}
              {/* Workouts column */}
              {(() => {
                const workoutSeries = state.eventSeries.find((s) => s.eventKey === 'workouts')
                if (!workoutSeries) return <div />
                return (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-semibold text-sage-dark">
                      🏋️ Workouts ({workoutSeries.dataPoints.length})
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {[...workoutSeries.dataPoints]
                        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                        .map((point, idx) => (
                          <p key={idx} className="text-xs text-warm-gray">
                            {new Date(point.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} — {point.label}
                          </p>
                        ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}
    </div>
  )
}
