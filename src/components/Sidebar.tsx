import { getUserDisplayName } from '../lib/openwearables/api'
import { useAppState } from '../store'

export default function Sidebar() {
  const { state, setPartial } = useAppState()

  const toggleUser = (userId: string) => {
    const isActive = state.activeUserIds.includes(userId)
    const next = isActive
      ? state.activeUserIds.filter((id) => id !== userId)
      : [...state.activeUserIds, userId]

    setPartial({
      activeUserIds: next,
      chartSeries: state.chartSeries.filter((s) => next.includes(s.userId)),
      activeMetricKeys: state.activeMetricKeys.filter((mk) =>
        state.chartSeries.some(
          (s) => next.includes(s.userId) && s.metricKey === mk,
        ),
      ),
    })
  }

  return (
    <aside className="sidebar flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h2
          className="text-sm font-semibold text-charcoal uppercase tracking-wide"
          style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
        >
          Users
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {state.users.length === 0 ? (
          <p className="text-xs text-warm-gray-light p-2">No users found.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {state.users.map((u) => {
              const active = state.activeUserIds.includes(u.id)
              return (
                <label
                  key={u.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm transition-colors ${
                    active
                      ? 'bg-sage-light text-sage-dark font-medium'
                      : 'hover:bg-cream-dark text-charcoal'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="accent-sage-dark"
                    checked={active}
                    onChange={() => toggleUser(u.id)}
                  />
                  <span className="truncate">{getUserDisplayName(u)}</span>
                </label>
              )
            })}
          </div>
        )}
      </div>

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
