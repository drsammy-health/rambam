import { useEffect, useState } from 'react'
import CopySummaryButton from './CopySummaryButton'
import EventsPanel from './EventsPanel'
import MetricsPanel from './MetricsPanel'
import { fetchEventsForUser, fetchSeriesForUser, fetchSummariesForUser } from '../lib/fetch'
import { getUserDisplayName, setDebugMode, setDebugDir, setCustomOutputDir } from '../lib/openwearables/api'
import { useAppState } from '../store'
import type { ChartSeries, EventSeries } from '../types'

function getDefaultDateRange(): { from: string; to: string } {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const format = (d: Date) => d.toISOString().split('T')[0]
  return { from: format(sevenDaysAgo), to: format(now) }
}

export default function Sidebar() {
  const { state, setPartial } = useAppState()

  // Initialize default dates on first mount if not set
  useEffect(() => {
    if (!state.dateFrom || !state.dateTo) {
      const defaults = getDefaultDateRange()
      setPartial({
        dateFrom: state.dateFrom || defaults.from,
        dateTo: state.dateTo || defaults.to,
      })
    }
  }, [])

  const selectUser = (userId: string) => {
    if (state.activeUserId === userId) return
    setPartial({
      activeUserId: userId,
      chartSeries: [],
      eventSeries: [],
      activeMetricKeys: [],
      activeEventKeys: [],
      summaries: { activity: [], sleep: [], body: null, data: null },
    })
  }

  const toggleMetric = (metricKey: string) => {
    const isActive = state.activeMetricKeys.includes(metricKey)
    if (isActive) {
      setPartial({
        activeMetricKeys: state.activeMetricKeys.filter((k) => k !== metricKey),
        chartSeries: state.chartSeries.filter((s) => s.metricKey !== metricKey),
      })
    } else {
      setPartial({
        activeMetricKeys: [...state.activeMetricKeys, metricKey],
        chartSeries: [],
        eventSeries: [],
      })
    }
  }

  const toggleEvent = (eventKey: string) => {
    const isActive = state.activeEventKeys.includes(eventKey)
    if (isActive) {
      setPartial({
        activeEventKeys: state.activeEventKeys.filter((k) => k !== eventKey),
        eventSeries: state.eventSeries.filter((s) => s.eventKey !== eventKey),
      })
    } else {
      setPartial({
        activeEventKeys: [...state.activeEventKeys, eventKey],
        chartSeries: [],
        eventSeries: [],
      })
    }
  }

  const handleRefresh = async () => {
    const hasMetrics = state.activeMetricKeys.length > 0
    const hasEvents = state.activeEventKeys.length > 0
    if (!hasMetrics && !hasEvents && !state.fetchSummaries) return
    if (state.dateFrom && state.dateTo && state.dateFrom > state.dateTo) {
      setPartial({ error: 'From date must be before To date.' })
      return
    }

    setPartial({
      loading: true,
      error: null,
      chartSeries: [],
      eventSeries: [],
      summaries: { activity: [], sleep: [], body: null, data: null },
    })

    // Set debug output folder: <user>/<unix_timestamp>/
    const user = state.activeUserId
      ? state.users.find((u) => u.id === state.activeUserId)
      : null
    const userName = user ? getUserDisplayName(user) : 'unknown'
    const safeName = userName.replace(/[^a-zA-Z0-9]/g, '_')
    const unixTs = String(Math.floor(Date.now() / 1000))
    setDebugDir(`${safeName}/${unixTs}`)
    setCustomOutputDir(state.debugOutputDir)

    const allSeries: ChartSeries[] = []
    const allEventSeries: EventSeries[] = []
    const errors: string[] = []

    for (const metricKey of state.activeMetricKeys) {
      const metric = state.metrics.find((m) => m.key === metricKey)
      if (!metric || !state.activeUserId) continue

      const result = await fetchSeriesForUser(
        metric,
        state.activeUserId,
        state.users,
        state.dateFrom || '',
        state.dateTo || '',
        allSeries.length,
        state.resolution,
        (current, total, message) => {
          setPartial({
            loadingProgress: { current, total, message },
          })
        },
      )

      allSeries.push(...result.series)
      errors.push(...result.errors)
    }

    for (const eventKey of state.activeEventKeys) {
      const eventType = state.events.find((e) => e.key === eventKey)
      if (!eventType || !state.activeUserId) continue

      const result = await fetchEventsForUser(
        eventType,
        state.activeUserId,
        state.users,
        state.dateFrom || '',
        state.dateTo || '',
        allEventSeries.length,
        (current, total, message) => {
          setPartial({
            loadingProgress: { current, total, message },
          })
        },
      )

      allEventSeries.push(...result.series)
      errors.push(...result.errors)
    }

    // Fetch summaries if toggle is ON
    let summaries = state.summaries
    if (state.fetchSummaries && state.activeUserId) {
      const summaryResult = await fetchSummariesForUser(
        state.activeUserId,
        state.dateFrom || '',
        state.dateTo || '',
        (current, total, message) => {
          setPartial({
            loadingProgress: { current, total, message },
          })
        },
      )
      summaries = summaryResult.summaries
      errors.push(...summaryResult.errors)
    }

    setPartial({
      chartSeries: allSeries,
      eventSeries: allEventSeries,
      summaries,
      loading: false,
      loadingProgress: null,
      error: errors.length > 0 ? errors.join(' \u2022 ') : null,
    })

    setDebugDir(null)
  }

  const canRefresh =
    state.activeUserId &&
    (state.activeMetricKeys.length > 0 ||
      state.activeEventKeys.length > 0 ||
      state.fetchSummaries)
  const [debug, setDebug] = useState(false)

  return (
    <aside className="sidebar flex flex-col h-full">
      {/* Users section */}
      <div className="px-4 py-3 border-b border-border">
        <h2
          className="text-sm font-semibold text-charcoal uppercase tracking-wide"
          style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
        >
          Users
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {state.users.length === 0 ? (
          <p className="text-xs text-warm-gray-light p-2">No users found.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {state.users.map((u) => {
              const active = state.activeUserId === u.id
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => selectUser(u.id)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left w-full transition-colors ${
                    active
                      ? 'bg-sage-light text-sage-dark font-semibold ring-1 ring-sage'
                      : 'hover:bg-cream-dark text-charcoal'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      active ? 'bg-sage' : 'bg-border'
                    }`}
                  />
                  <span className="truncate">{getUserDisplayName(u)}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Date range — compact, side-by-side */}
      <div className="px-4 py-2 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <label className="text-[10px] font-medium text-warm-gray uppercase">From</label>
            <input
              type="date"
              className="w-full text-xs py-1 px-2"
              value={state.dateFrom || ''}
              onChange={(e) =>
                setPartial({
                  dateFrom: e.target.value,
                  chartSeries: [],
                  eventSeries: [],
                  summaries: { activity: [], sleep: [], body: null, data: null },
                })
              }
            />
          </div>
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <label className="text-[10px] font-medium text-warm-gray uppercase">To</label>
            <input
              type="date"
              className="w-full text-xs py-1 px-2"
              value={state.dateTo || ''}
              onChange={(e) =>
                setPartial({
                  dateTo: e.target.value,
                  chartSeries: [],
                  eventSeries: [],
                  summaries: { activity: [], sleep: [], body: null, data: null },
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Metrics section */}
      <div className="px-4 py-3">
        <p className="field-label mb-2">Metrics</p>
        <MetricsPanel
          metrics={state.metrics}
          activeMetricKeys={state.activeMetricKeys}
          onToggle={toggleMetric}
        />
      </div>

      {/* Events section */}
      <div className="px-4 py-3">
        <p className="field-label mb-2">Events</p>
        <EventsPanel
          events={state.events}
          activeEventKeys={state.activeEventKeys}
          onToggle={toggleEvent}
        />
      </div>

      {/* Resolution + toggles row */}
      <div className="px-4 pt-3 pb-1">
        <label className="field-label mb-1">Resolution</label>
        <select
          className="w-full text-xs"
          value={state.resolution}
          onChange={(e) =>
            setPartial({
              resolution: e.target.value as 'raw' | '1min' | '5min' | '15min' | '1hour',
              chartSeries: [],
              eventSeries: [],
            })
          }
        >
          <option value="raw">Raw</option>
          <option value="1min">1 minute</option>
          <option value="5min">5 minutes</option>
          <option value="15min">15 minutes</option>
          <option value="1hour">1 hour</option>
        </select>
        <div className="flex items-center gap-3 mt-2">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              className="accent-sage-dark"
              checked={state.fetchSummaries}
              onChange={(e) => {
                setPartial({ fetchSummaries: e.target.checked })
              }}
            />
            <span className="text-[10px] text-warm-gray">Summaries</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              className="accent-sage-dark"
              checked={debug}
              onChange={(e) => {
                setDebug(e.target.checked)
                setDebugMode(e.target.checked)
              }}
            />
            <span className="text-[10px] text-warm-gray">Save debug JSON</span>
          </label>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 py-3 flex gap-2">
        <button
          type="button"
          className="btn-primary flex-1 text-[10px] whitespace-nowrap py-1.5 px-2"
          disabled={!canRefresh || state.loading}
          onClick={handleRefresh}
        >
          {state.loading ? 'Loading...' : 'Fetch Data'}
        </button>
        <CopySummaryButton />
      </div>

      {/* Settings button */}
      <div className="p-3 border-t border-border">
        <button
          type="button"
          className="btn-secondary w-full text-xs"
          onClick={() =>
            setPartial({
              view: state.view === 'settings' ? 'dashboard' : 'settings',
            })
          }
        >
          {state.view === 'settings' ? 'Back to Dashboard' : 'Settings'}
        </button>
      </div>
    </aside>
  )
}
