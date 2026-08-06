import type { Metric } from '../types'

export type MetricsPanelProps = {
  metrics: Metric[]
  activeMetricKey: string | null
  onToggle: (metricKey: string) => void
}

export default function MetricsPanel({
  metrics,
  activeMetricKey,
  onToggle,
}: MetricsPanelProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {metrics.map((m) => {
        const active = activeMetricKey === m.key
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
