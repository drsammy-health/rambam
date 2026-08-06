import { invoke } from '@tauri-apps/api/core'

export type SettingsResponse = {
  url: string
  has_key: boolean
  debug_output_dir: string | null
}

export async function loadSettings(): Promise<SettingsResponse> {
  return invoke<SettingsResponse>('load_settings')
}

export async function saveSettings(url: string, key: string, debugOutputDir?: string | null): Promise<void> {
  return invoke('save_settings', { url, key, debug_output_dir: debugOutputDir })
}

export async function resetSettings(): Promise<void> {
  return invoke('reset_settings')
}

export async function saveCsvFile(filename: string, data: string): Promise<string | null> {
  return invoke<string | null>('save_csv_file', { filename, data })
}
