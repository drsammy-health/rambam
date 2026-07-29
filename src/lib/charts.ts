import Chart from 'chart.js/auto'
import zoomPlugin from 'chartjs-plugin-zoom'
import type { ChartSeries } from '../types'

Chart.register(zoomPlugin)

const crosshairPlugin = {
  id: 'crosshair',
  afterEvent(chart: Chart, args: { event: { type: string; x: number; y: number } }) {
    const { event } = args
    if (event.type === 'mousemove') {
      ;(chart as unknown as Record<string, number | undefined>).__crosshairX = event.x
    }
    if (event.type === 'mouseout') {
      ;(chart as unknown as Record<string, number | undefined>).__crosshairX = undefined
    }
  },
  afterDraw(chart: Chart) {
    const x = (chart as unknown as Record<string, number | undefined>).__crosshairX
    if (x == null) return

    const { ctx, chartArea } = chart
    if (!chartArea) return

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x, chartArea.top)
    ctx.lineTo(x, chartArea.bottom)
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(120, 113, 108, 0.4)'
    ctx.setLineDash([4, 4])
    ctx.stroke()
    ctx.restore()
  },
}

Chart.register(crosshairPlugin)

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

/** Provider priority for blood glucose: lower number = higher priority. */
const GLUCOSE_PROVIDER_PRIORITY: Record<string, number> = {
  stelo: 1,
  dexcom: 2,
}

function getProviderPriority(provider: string | undefined): number {
  if (!provider) return 999
  return GLUCOSE_PROVIDER_PRIORITY[provider.toLowerCase()] ?? 999
}

/** Bucket data points so timestamps align across series. */
function bucketSeriesData(
  series: ChartSeries,
  resolution: string,
): ChartSeries {
  const isGlucose = series.metricKey === 'blood_glucose'

  // For glucose, we need to track per-provider values within each bucket
  type BucketData = {
    providers: Map<string, { sum: number; count: number }>
  }
  const buckets = new Map<string, BucketData>()

  for (const dp of series.dataPoints) {
    const bucketTs = bucketTimestamp(dp.timestamp, resolution)
    const existing = buckets.get(bucketTs)
    const provider = dp.source?.provider ?? 'unknown'
    if (existing) {
      const prov = existing.providers.get(provider)
      if (prov) {
        prov.sum += dp.value
        prov.count += 1
      } else {
        existing.providers.set(provider, { sum: dp.value, count: 1 })
      }
    } else {
      buckets.set(bucketTs, {
        providers: new Map([[provider, { sum: dp.value, count: 1 }]]),
      })
    }
  }

  const bucketedPoints = Array.from(buckets.entries())
    .map(([timestamp, { providers }]) => {
      let chosenProvider: string | undefined
      let chosenSum: number
      let chosenCount: number

      if (isGlucose) {
        // Pick the provider with the highest priority (lowest number)
        let bestPriority = Infinity
        for (const [provider, { sum, count }] of providers) {
          const priority = getProviderPriority(provider)
          if (priority < bestPriority) {
            bestPriority = priority
            chosenProvider = provider
            chosenSum = sum
            chosenCount = count
          }
        }
      } else {
        // Fallback: use the first provider we see (existing behavior)
        const first = Array.from(providers.entries())[0]
        chosenProvider = first[0]
        chosenSum = first[1].sum
        chosenCount = first[1].count
      }

      return {
        timestamp,
        value: Math.round((chosenSum! / chosenCount!) * 10) / 10,
        source:
          chosenProvider && chosenProvider !== 'unknown'
            ? { provider: chosenProvider, device: null }
            : undefined,
      }
    })
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  return { ...series, dataPoints: bucketedPoints }
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
              if (val == null) return `${s.label}: —`
              return provider
                ? `${s.label}: ${val} ${s.unit} (${provider})`
                : `${s.label}: ${val} ${s.unit}`
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
