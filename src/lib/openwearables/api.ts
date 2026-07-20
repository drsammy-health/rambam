import { invoke } from '@tauri-apps/api/core'
import type {
  ApiDataPoint,
  ApiResponse,
  ApiUser,
  ApiWorkout,
  ApiSleep,
  PaginatedApiData,
  ProgressCallback,
  ActivitySummary,
  SleepSummary,
  RecoverySummary,
  BodySummary,
  UserDataSummaryResponse,
} from './types'

const API_VERSION = '/api/v1'

let debugMode = false
let debugDir: string | null = null
let customOutputDir: string | null = null

export function setDebugMode(enabled: boolean): void {
  debugMode = enabled
}

export function setDebugDir(dir: string | null): void {
  debugDir = dir
}

export function setCustomOutputDir(dir: string | null): void {
  customOutputDir = dir
}

export const PAGE_LIMIT = 100
export const MAX_PAGES = 20
export const DEFAULT_DAYS = 7

export async function saveDebugJson(data: unknown, filename: string): Promise<string> {
  const json = JSON.stringify(data, null, 2)
  const fullPath = debugDir ? `${debugDir}/${filename}` : filename
  const path: string = await invoke('save_debug_json', {
    filename: fullPath,
    data: json,
    outputDir: customOutputDir,
  })
  return path
}

export async function getDefaultDebugDir(): Promise<string> {
  const dir: string = await invoke('get_default_debug_dir')
  return dir
}

export async function pickFolder(): Promise<string | null> {
  const dir: string | null = await invoke('pick_folder')
  return dir
}

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

    if (debugMode && result.ok) {
      saveDebugJson(result.data, `rambam-debug-${metric}-${Date.now()}.json`).catch((err) => {
        console.error('Debug save failed:', err)
      })
    }

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
        source: d.source || undefined,
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

export async function fetchAllEvents(
  userId: string,
  eventType: 'workouts' | 'sleep',
  startDate?: string,
  endDate?: string,
  maxPages = MAX_PAGES,
  onProgress?: ProgressCallback,
): Promise<ApiResponse<(ApiWorkout | ApiSleep)[]>> {
  const params = new URLSearchParams()
  params.set('limit', '50')

  const now = new Date()
  const defaultStart = new Date(
    now.getTime() - DEFAULT_DAYS * 24 * 60 * 60 * 1000,
  )

  params.set('start_date', startDate || formatDate(defaultStart))
  params.set('end_date', endDate || formatDate(now))

  let cursor: string | null = null
  let totalPages = maxPages
  const allData: (ApiWorkout | ApiSleep)[] = []

  for (let page = 0; page < maxPages; page++) {
    const pageParams = new URLSearchParams(params)
    if (cursor) pageParams.set('cursor', cursor)

    const result = await apiFetch<PaginatedApiData>(
      `/users/${userId}/events/${eventType}?${pageParams.toString()}`,
    )
    if (!result.ok) {
      if (allData.length > 0) {
        return { ok: true, data: allData }
      }
      return result
    }

    if (page === 0) {
      const totalEstimate = Math.ceil(
        (result.data.pagination.total_count || 0) / 50,
      )
      totalPages = Math.min(totalEstimate, maxPages)
    }

    allData.push(...(result.data.data as unknown as (ApiWorkout | ApiSleep)[]))
    onProgress?.(page + 1, totalPages, `Fetched ${allData.length} events...`)

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

// ── Summary Fetchers ───────────────────────────────────────────────────────

/**
 * Fetch all pages of activity summaries.
 */
export async function fetchActivitySummaries(
  userId: string,
  startDate?: string,
  endDate?: string,
  maxPages = MAX_PAGES,
  onProgress?: ProgressCallback,
): Promise<ApiResponse<ActivitySummary[]>> {
  const params = new URLSearchParams()
  params.set('limit', String(PAGE_LIMIT))

  const now = new Date()
  const defaultStart = new Date(
    now.getTime() - DEFAULT_DAYS * 24 * 60 * 60 * 1000,
  )

  params.set('start_date', startDate || formatDate(defaultStart))
  params.set('end_date', endDate || formatDate(now))

  let cursor: string | null = null
  let totalPages = maxPages
  const allData: ActivitySummary[] = []

  for (let page = 0; page < maxPages; page++) {
    const pageParams = new URLSearchParams(params)
    if (cursor) pageParams.set('cursor', cursor)

    const result = await apiFetch<PaginatedApiData>(
      `/users/${userId}/summaries/activity?${pageParams.toString()}`,
    )

    if (debugMode && result.ok) {
      saveDebugJson(result.data, `rambam-debug-activity-summary-${Date.now()}.json`).catch((err) => {
        console.error('Debug save failed:', err)
      })
    }

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

    allData.push(...(result.data.data as unknown as ActivitySummary[]))
    onProgress?.(page + 1, totalPages, `Fetched ${allData.length} activity summaries...`)

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

/**
 * Fetch all pages of sleep summaries.
 */
export async function fetchSleepSummaries(
  userId: string,
  startDate?: string,
  endDate?: string,
  maxPages = MAX_PAGES,
  onProgress?: ProgressCallback,
): Promise<ApiResponse<SleepSummary[]>> {
  const params = new URLSearchParams()
  params.set('limit', String(PAGE_LIMIT))

  const now = new Date()
  const defaultStart = new Date(
    now.getTime() - DEFAULT_DAYS * 24 * 60 * 60 * 1000,
  )

  params.set('start_date', startDate || formatDate(defaultStart))
  params.set('end_date', endDate || formatDate(now))

  let cursor: string | null = null
  let totalPages = maxPages
  const allData: SleepSummary[] = []

  for (let page = 0; page < maxPages; page++) {
    const pageParams = new URLSearchParams(params)
    if (cursor) pageParams.set('cursor', cursor)

    const result = await apiFetch<PaginatedApiData>(
      `/users/${userId}/summaries/sleep?${pageParams.toString()}`,
    )

    if (debugMode && result.ok) {
      saveDebugJson(result.data, `rambam-debug-sleep-summary-${Date.now()}.json`).catch((err) => {
        console.error('Debug save failed:', err)
      })
    }

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

    allData.push(...(result.data.data as unknown as SleepSummary[]))
    onProgress?.(page + 1, totalPages, `Fetched ${allData.length} sleep summaries...`)

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

/**
 * Fetch all pages of recovery summaries.
 */
export async function fetchRecoverySummaries(
  userId: string,
  startDate?: string,
  endDate?: string,
  maxPages = MAX_PAGES,
  onProgress?: ProgressCallback,
): Promise<ApiResponse<RecoverySummary[]>> {
  const params = new URLSearchParams()
  params.set('limit', String(PAGE_LIMIT))

  const now = new Date()
  const defaultStart = new Date(
    now.getTime() - DEFAULT_DAYS * 24 * 60 * 60 * 1000,
  )

  params.set('start_date', startDate || formatDate(defaultStart))
  params.set('end_date', endDate || formatDate(now))

  let cursor: string | null = null
  let totalPages = maxPages
  const allData: RecoverySummary[] = []

  for (let page = 0; page < maxPages; page++) {
    const pageParams = new URLSearchParams(params)
    if (cursor) pageParams.set('cursor', cursor)

    const result = await apiFetch<PaginatedApiData>(
      `/users/${userId}/summaries/recovery?${pageParams.toString()}`,
    )

    if (debugMode && result.ok) {
      saveDebugJson(result.data, `rambam-debug-recovery-summary-${Date.now()}.json`).catch((err) => {
        console.error('Debug save failed:', err)
      })
    }

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

    allData.push(...(result.data.data as unknown as RecoverySummary[]))
    onProgress?.(page + 1, totalPages, `Fetched ${allData.length} recovery summaries...`)

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

/**
 * Fetch body summary (single response, not paginated).
 */
export async function fetchBodySummary(
  userId: string,
  startDate?: string,
  endDate?: string,
): Promise<ApiResponse<BodySummary | null>> {
  const params = new URLSearchParams()

  const now = new Date()
  const defaultStart = new Date(
    now.getTime() - DEFAULT_DAYS * 24 * 60 * 60 * 1000,
  )

  params.set('start_date', startDate || formatDate(defaultStart))
  params.set('end_date', endDate || formatDate(now))

  const result = await apiFetch<BodySummary | null>(
    `/users/${userId}/summaries/body?${params.toString()}`,
  )

  if (debugMode && result.ok) {
    saveDebugJson(result.data, `rambam-debug-body-summary-${Date.now()}.json`).catch((err) => {
      console.error('Debug save failed:', err)
    })
  }

  return result
}

/**
 * Fetch data summary (single response, not paginated).
 */
export async function fetchDataSummary(
  userId: string,
  startDate?: string,
  endDate?: string,
): Promise<ApiResponse<UserDataSummaryResponse>> {
  const params = new URLSearchParams()

  const now = new Date()
  const defaultStart = new Date(
    now.getTime() - DEFAULT_DAYS * 24 * 60 * 60 * 1000,
  )

  params.set('start_date', startDate || formatDate(defaultStart))
  params.set('end_date', endDate || formatDate(now))

  const result = await apiFetch<UserDataSummaryResponse>(
    `/users/${userId}/summaries/data?${params.toString()}`,
  )

  if (debugMode && result.ok) {
    saveDebugJson(result.data, `rambam-debug-data-summary-${Date.now()}.json`).catch((err) => {
      console.error('Debug save failed:', err)
    })
  }

  return result
}
