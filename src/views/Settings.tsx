import { useCallback, useRef, useState } from 'react'
import { fetchUsers } from '../lib/openwearables/api'
import { DEFAULT_API_URL } from '../lib/openwearables/config'
import { resetSettings, saveSettings } from '../lib/tauri'
import { useAppState } from '../store'
import type { StatusMessage } from '../types'

export default function Settings() {
  const { state, setPartial } = useAppState()

  const [url, setUrl] = useState(state.apiUrl)
  const [key, setKey] = useState('')
  const [status, setStatus] = useState<StatusMessage | null>(null)
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showStatus = useCallback(
    (message: string, type: 'success' | 'error' | 'neutral') => {
      if (statusTimer.current) {
        clearTimeout(statusTimer.current)
        statusTimer.current = null
      }
      setStatus({ message, type })
      if (type !== 'neutral') {
        statusTimer.current = setTimeout(() => {
          setStatus(null)
        }, 4000)
      }
    },
    [],
  )

  const handleSave = async () => {
    const trimmedUrl = url.trim()
    const trimmedKey = key.trim()

    if (!trimmedUrl) {
      showStatus('Please enter an API URL.', 'error')
      return
    }

    try {
      await saveSettings(trimmedUrl, trimmedKey)
      setPartial({ apiUrl: trimmedUrl, view: 'dashboard', hasApiKey: true })
      showStatus('Settings saved. Switching to Dashboard...', 'success')
    } catch (err) {
      showStatus(
        `Failed to save: ${err instanceof Error ? err.message : String(err)}`,
        'error',
      )
    }
  }

  const handleTest = async () => {
    const trimmedUrl = url.trim()
    const trimmedKey = key.trim()

    if (!trimmedUrl) {
      showStatus('Please enter an API URL before testing.', 'error')
      return
    }

    showStatus('Testing with current inputs...', 'neutral')

    try {
      await saveSettings(trimmedUrl, trimmedKey)
      setPartial({ apiUrl: trimmedUrl, hasApiKey: true })

      const result = await fetchUsers()
      if (result.ok) {
        showStatus(
          `Connection OK. Found ${result.data.length} users.`,
          'success',
        )
      } else {
        showStatus(`Failed: ${result.error}`, 'error')
      }
    } catch (err) {
      showStatus(
        `Error: ${err instanceof Error ? err.message : String(err)}`,
        'error',
      )
    }
  }

  const handleReset = async () => {
    try {
      await resetSettings()
      setPartial({ apiUrl: DEFAULT_API_URL, hasApiKey: false })
      setUrl(DEFAULT_API_URL)
      setKey('')
      showStatus('Reset to defaults. URL and key restored.', 'success')
    } catch (err) {
      showStatus(
        `Failed to reset: ${err instanceof Error ? err.message : String(err)}`,
        'error',
      )
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
  }

  const statusColor =
    status?.type === 'success'
      ? 'text-success-text'
      : status?.type === 'error'
        ? 'text-error-text'
        : 'text-warm-gray'

  return (
    <div className="max-w-150 mx-auto flex flex-col gap-4 pt-8">
      <div className="card">
        <h2 className="text-base font-semibold mb-4">API Configuration</h2>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">API URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com"
            />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">API Key</label>
              <span
                className="text-xs font-medium"
                style={{
                  color: state.hasApiKey
                    ? 'var(--color-success-text)'
                    : 'var(--color-error-text)',
                }}
              >
                {state.hasApiKey ? 'Saved in keychain' : 'Not configured'}
              </span>
            </div>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                state.hasApiKey
                  ? '•••••••••••• (key saved)'
                  : 'Enter your API key'
              }
            />
            <p className="text-xs text-warm-gray">
              {state.hasApiKey
                ? 'Type a new key above to replace the saved one.'
                : 'Your API key will be stored securely in the OS keychain.'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button type="button" className="btn-primary" onClick={handleSave}>
              Save
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleTest}
            >
              Test Connection
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleReset}
            >
              Reset to Defaults
            </button>
          </div>
          {status && (
            <p className={`text-sm min-h-5 ${statusColor}`}>{status.message}</p>
          )}
        </div>
      </div>
    </div>
  )
}
