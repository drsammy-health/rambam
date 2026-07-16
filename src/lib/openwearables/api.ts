import { invoke } from '@tauri-apps/api/core'
import type {
  ApiDataPoint,
  ApiResponse,
  ApiUser,
  PaginatedApiData,
  ProgressCallback,
} from './types'

const API_VERSION = '/api/v1'

export const PAGE_LIMIT = 100
export const MAX_PAGES = 20
export const DEFAULT_DAYS = 7

export function getUserDisplayName(user: ApiUser): string {
  if (user.name) return user.name
  if (user.first_name && user.last_name)
    return `${user.first_name} ${user.last_name}`
  if (user.first_name) return user.first_name
  if (user.last_name) return user.last_name
  if (user.email) return user.email
  return `User ${user.id}`
}

async function apiFetch<T>(path: string): Promise<ApiResponse<T>> {
  try {
    const body = await invoke<string>('fetch_url', {
      path: API_VERSION + path,
    })
    const data: T = JSON.parse(body)
    return { ok: true, data }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function fetchUsers(): Promise<ApiResponse<ApiUser[]>> {
  const result = await apiFetch<{ items: ApiUser[] }>('/users')
  if (!result.ok) return result

  const users = result.data.items || []
  return { ok: true, data: users }
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

/**
 * Fetch all pages of timeseries data, following next_cursor links.
 * Uses resolution=1hour by default to avoid excessive point counts for charting.
 * Safety cap: stops after MAX_PAGES to prevent runaway requests.
 */
export async function fetchAllTimeseries(
  userId: string,
  metric: string,
  startDate?: string,
  endDate?: string,
  resolution: 'raw' | '1min' | '5min' | '15min' | '1hour' = '1hour',
  maxPages = MAX_PAGES,
  onProgress?: ProgressCallback,
): Promise<ApiResponse<ApiDataPoint[]>> {
  const params = new URLSearchParams()
  params.set('types', metric)
  params.set('resolution', resolution)
  params.set('limit', String(PAGE_LIMIT))

  const now = new Date()
  const defaultStart = new Date(
    now.getTime() - DEFAULT_DAYS * 24 * 60 * 60 * 1000,
  )

  params.set('start_time', startDate || formatDate(defaultStart))
  params.set('end_time', endDate || formatDate(now))

  let cursor: string | null = null
  let totalPages = maxPages
  const allData: ApiDataPoint[] = []

  for (let page = 0; page < maxPages; page++) {
    const pageParams = new URLSearchParams(params)
    if (cursor) pageParams.set('cursor', cursor)

    const result = await apiFetch<PaginatedApiData>(
      `/users/${userId}/timeseries?${pageParams.toString()}`,
    )
    if (!result.ok) {
      if (allData.length > 0) {
        return { ok: true, data: allData }
      }
      return result
    }

    if (page === 0) {
      const totalEstimate = Math.ceil(
        (result.data.pagination.total_count || 0) / PAGE_LIMIT,
      )
      totalPages = Math.min(totalEstimate, maxPages)
    }

    const pageData = result.data.data
      .filter(
        (d): d is typeof d & { value: number } =>
          d.value !== undefined && d.value !== null,
      )
      .map((d) => ({
        timestamp: d.timestamp,
        value: d.value,
      }))

    allData.push(...pageData)
    onProgress?.(page + 1, totalPages, `Fetched ${allData.length} points...`)

    if (
      !result.data.pagination.has_more ||
      !result.data.pagination.next_cursor
    ) {
      break
    }

    cursor = result.data.pagination.next_cursor
  }

  return { ok: true, data: allData }
}
