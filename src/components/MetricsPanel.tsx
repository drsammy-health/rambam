import type { Metric } from '../types'

export type MetricsPanelProps = {
  metrics: Metric[]
  activeMetricKeys: string[]
  onToggle: (metricKey: string) => void
}

export default function MetricsPanel({
  metrics,
  activeMetricKeys,
  onToggle,
}: MetricsPanelProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {metrics.map((m) => {
        const active = activeMetricKeys.includes(m.key)
        return (
          <button
            key={m.key}
            type="button"
            className={active ? 'metric-chip-active' : 'metric-chip'}
            onClick={() => onToggle(m.key)}
          >
            {m.label}
          </button>
        )
      })}
    </div>
  )
}
