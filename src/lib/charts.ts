import Chart from 'chart.js/auto'
import zoomPlugin from 'chartjs-plugin-zoom'

Chart.register(zoomPlugin)

let chartInstance: Chart | null = null

export function renderChart(
  canvas: HTMLCanvasElement,
  labels: string[],
  values: number[],
  label: string,
): void {
  if (chartInstance) {
    chartInstance.destroy()
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label,
          data: values,
          borderColor: '#6B8E7D',
          backgroundColor: 'rgba(107, 142, 125, 0.12)',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#6B8E7D',
          fill: true,
          tension: 0.3,
        },
      ],
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
        },
        tooltip: {
          enabled: true,
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
          title: {
            display: true,
            text: 'Time',
          },
          ticks: {
            maxTicksLimit: 10,
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: label,
          },
        },
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
