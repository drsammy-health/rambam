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

  // Build sorted union of all timestamps
  const allTimestamps = Array.from(
    new Set(seriesList.flatMap((s) => s.dataPoints.map((d) => d.timestamp))),
  ).sort()

  const labels = allTimestamps.map(formatLabel)

  // Build datasets mapped to the unified label array
  const datasets = seriesList.map((series) => {
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
              const s = seriesList[context.datasetIndex]
              const val = context.parsed.y
              if (val == null) return `${s.label}: —`
              return `${s.label}: ${val} ${s.unit}`
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
