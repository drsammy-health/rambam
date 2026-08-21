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

export function renderChart(
  canvas: HTMLCanvasElement,
  seriesList: ChartSeries[],
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

  // Build sorted union of all timestamps across series
  const allTimestamps = Array.from(
    new Set(seriesList.flatMap((s) => s.dataPoints.map((d) => d.timestamp))),
  ).sort()

  const labels = allTimestamps.map(formatLabel)
  const pointMaps = seriesList.map(
    (series) => new Map(series.dataPoints.map((point) => [point.timestamp, point])),
  )

  // Build datasets mapped to the unified label array
  const datasets = seriesList.map((series, index) => {
    const pointMap = pointMaps[index]
    const data = allTimestamps.map((ts) => pointMap.get(ts)?.value ?? null)

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
              const series = seriesList[context.datasetIndex]
              const val = context.parsed.y
              const ts = allTimestamps[context.dataIndex]
              const dp = pointMaps[context.datasetIndex].get(ts)
              const provider = dp?.source?.provider
              if (val == null) return `${series.metricLabel}: —`
              return provider
                ? [`${series.metricLabel}: ${val} ${series.unit}`, `  ${provider}`]
                : `${series.metricLabel}: ${val} ${series.unit}`
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
