import Chart from 'chart.js/auto'
import zoomPlugin from 'chartjs-plugin-zoom'
import type { ChartSeries } from '../types'

Chart.register(zoomPlugin)

let chartInstance: Chart | null = null

const PALETTE = [
  '#6B8E7D',
  '#D4A373',
  '#8B5CF6',
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#EC4899',
  '#6366F1',
  '#14B8A6',
  '#F97316',
  '#84CC16',
]

export function getSeriesColor(index: number): string {
  return PALETTE[index % PALETTE.length]
}

function formatLabel(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Bucket a timestamp to a resolution interval using Unix time. */
function bucketTimestamp(ts: string, resolution: string): string {
  const ms = new Date(ts).getTime()
  switch (resolution) {
    case '1hour': return new Date(Math.floor(ms / 3_600_000) * 3_600_000).toISOString()
    case '15min': return new Date(Math.floor(ms / 900_000) * 900_000).toISOString()
    case '5min':  return new Date(Math.floor(ms / 300_000) * 300_000).toISOString()
    case '1min':  return new Date(Math.floor(ms / 60_000) * 60_000).toISOString()
    default:      return ts
  }
}

/** Check whether a provider is an allowed glucose source. */
function isAllowedGlucoseProvider(provider: string | undefined): boolean {
  if (!provider) return false
  const p = provider.toLowerCase()
  return p.includes('stelo') || p.includes('dexcom')
}

/** Bucket data points so timestamps align across series. */
function bucketSeriesData(
  series: ChartSeries,
  resolution: string,
): ChartSeries {
  // For blood glucose, drop anything that isn't Stelo or Dexcom.
  const isGlucose = series.metricKey === 'blood_glucose'
  const points = isGlucose
    ? series.dataPoints.filter((dp) => isAllowedGlucoseProvider(dp.source?.provider))
    : series.dataPoints

  const buckets = new Map<string, { sum: number; count: number; provider?: string }>()
  for (const dp of points) {
    const ts = bucketTimestamp(dp.timestamp, resolution)
    const b = buckets.get(ts)
    if (b) {
      b.sum += dp.value
      b.count += 1
      // If we ever mix providers in one bucket, just mark it mixed
      if (b.provider && b.provider !== (dp.source?.provider ?? '')) {
        b.provider = 'mixed'
      }
    } else {
      buckets.set(ts, {
        sum: dp.value,
        count: 1,
        provider: dp.source?.provider,
      })
    }
  }

  const dataPoints = Array.from(buckets.entries())
    .map(([timestamp, { sum, count, provider }]) => ({
      timestamp,
      value: Math.round((sum / count) * 10) / 10,
      source:
        provider && provider !== 'mixed'
          ? { provider, device: null }
          : undefined,
    }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  return { ...series, dataPoints }
}

export function renderChart(
  canvas: HTMLCanvasElement,
  seriesList: ChartSeries[],
  resolution: 'raw' | '1min' | '5min' | '15min' | '1hour' = '1hour',
): void {
  if (chartInstance) {
    chartInstance.destroy()
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  if (seriesList.length === 0) {
    chartInstance = null
    return
  }

  // Bucket each series so timestamps align to the resolution grid
  const bucketedSeries = seriesList.map((s) => bucketSeriesData(s, resolution))

  // Build sorted union of all bucketed timestamps
  const allTimestamps = Array.from(
    new Set(bucketedSeries.flatMap((s) => s.dataPoints.map((d) => d.timestamp))),
  ).sort()

  const labels = allTimestamps.map(formatLabel)

  // Build datasets mapped to the unified label array
  const datasets = bucketedSeries.map((series) => {
    const pointMap = new Map(
      series.dataPoints.map((d) => [d.timestamp, d.value]),
    )
    const data = allTimestamps.map((ts) => pointMap.get(ts) ?? null)

    return {
      label: series.label,
      data,
      borderColor: series.color,
      backgroundColor: series.color + '1E',
      borderWidth: 2,
      pointRadius: series.continuous ? 0 : 3,
      pointHoverRadius: 4,
      pointBackgroundColor: series.color,
      fill: false,
      tension: 0.3,
      spanGaps: series.continuous,
      yAxisID: series.unit,
    }
  })

  // Collect unique units and build right-stacked y-axes
  const units = Array.from(new Set(seriesList.map((s) => s.unit)))
  const yScales: Record<string, object> = {}
  for (const unit of units) {
    yScales[unit] = {
      display: true,
      position: 'right',
      title: {
        display: true,
        text: unit,
      },
    } as const
  }

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      transitions: {
        active: { animation: { duration: 0 } },
      },
      interaction: {
        intersect: false,
        mode: 'index',
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16,
          },
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context) => {
              const s = bucketedSeries[context.datasetIndex]
              const val = context.parsed.y
              const ts = allTimestamps[context.dataIndex]
              const dp = s.dataPoints.find((d) => d.timestamp === ts)
              const provider = dp?.source?.provider
              const metricName = s.label.split(' — ').pop() ?? s.label
              if (val == null) return `${metricName}: —`
              return provider
                ? [`${metricName}: ${val} ${s.unit}`, `  ${provider}`]
                : `${metricName}: ${val} ${s.unit}`
            },
          },
        },
        zoom: {
          pan: {
            enabled: true,
            mode: 'x',
          },
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true,
            },
            mode: 'x',
          },
        },
      },
      scales: {
        x: {
          display: true,
          ticks: {
            maxTicksLimit: 10,
          },
        },
        ...yScales,
      },
    },
  })
}

export function destroyChart(): void {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
}
