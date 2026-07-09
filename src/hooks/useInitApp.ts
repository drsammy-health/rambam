import { useEffect, useState } from 'react'
import { fetchUsers } from '../lib/openwearables/api'
import { loadSettings } from '../lib/tauri'
import { useAppState } from '../store'

export function useInitApp(): boolean {
  const { setPartial } = useAppState()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function init() {
      try {
        const settings = await loadSettings()
        setPartial({ apiUrl: settings.url, hasApiKey: settings.has_key })

        if (!settings.has_key) {
          setPartial({ view: 'settings' })
          setReady(true)
          return
        }

        const result = await fetchUsers()
        if (result.ok) {
          setPartial({ users: result.data })
        } else {
          setPartial({ error: `Failed to load users: ${result.error}` })
        }
      } catch (err) {
        setPartial({ error: err instanceof Error ? err.message : String(err) })
      } finally {
        setReady(true)
      }
    }

    init()
  }, [setPartial])

  return ready
}
