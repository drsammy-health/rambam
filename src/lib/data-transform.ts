import type { ApiDataPoint } from './openwearables/types'
import type { ChartSeries } from '../types'

function escapeCsvCell(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function chartSeriesToCsv(seriesList: ChartSeries[]): string {
  const rows: Array<Array<string | number>> = [['timestamp', 'value', 'provider']]

  for (const series of seriesList) {
    for (const point of series.dataPoints) {
      rows.push([
        point.timestamp,
        point.value,
        point.source?.provider ?? '',
      ])
    }
  }

  return `${rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n')}\n`
}

function isAllowedGlucoseSource(name: string | null | undefined): boolean {
  return ['stelo', 'dexcom', 'dexcom g6', 'dexcom g7'].includes(
    name?.trim().toLowerCase() ?? '',
  )
}

/** Accept Stelo/Dexcom readings, including those imported through Apple Health. */
export function filterGlucoseProviders(points: ApiDataPoint[]): ApiDataPoint[] {
  return points.filter((dp) =>
    isAllowedGlucoseSource(dp.source?.source) ||
    isAllowedGlucoseSource(dp.source?.provider),
  )
}
