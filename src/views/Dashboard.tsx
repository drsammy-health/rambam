import { useEffect, useRef } from 'react'
import Spinner from '../components/Spinner'
import { destroyChart, renderChart } from '../lib/charts'
import { useAppState } from '../store'

export default function Dashboard() {
  const { state, setPartial } = useAppState()
  const canvasRef = useRef<HTMLCanvasElement>(null)

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

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full p-4 gap-4 overflow-hidden">
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
                {state.activeMetricKeys.length > 0 || state.activeEventKeys.length > 0
                  ? 'Click Fetch Data in the sidebar to update the chart.'
                  : 'Select a user from the sidebar, then choose metrics or events to display.'}
              </p>
            </div>
          ) : (
            <div className="chart-container">
              <canvas ref={canvasRef} />
            </div>
          )}
        </div>

        {/* Event list panel */}
        {state.eventSeries.length > 0 && (
          <div className="card flex-shrink-0 max-h-48 overflow-y-auto">
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
