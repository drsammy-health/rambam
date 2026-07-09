import { invoke } from '@tauri-apps/api/core'

export type SettingsResponse = {
  url: string
  has_key: boolean
}

export async function loadSettings(): Promise<SettingsResponse> {
  return invoke<SettingsResponse>('load_settings')
}

export async function saveSettings(url: string, key: string): Promise<void> {
  return invoke('save_settings', { url, key })
}

export async function resetSettings(): Promise<void> {
  return invoke('reset_settings')
}
