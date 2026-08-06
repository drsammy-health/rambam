import { useState } from 'react'
import { copyToClipboard, generateAISummary } from '../lib/ai-summary'
import { chartSeriesToCsv } from '../lib/data-transform'
import { getUserDisplayName } from '../lib/openwearables/api'
import { saveCsvFile } from '../lib/tauri'
import { useAppState } from '../store'

type AISummaryModalProps = {
  onClose: () => void
}

export default function AISummaryModal({ onClose }: AISummaryModalProps) {
  const { state, setPartial } = useAppState()
  const [exporting, setExporting] = useState(false)

  const summary = generateAISummary(
    state.chartSeries,
    state.eventSeries,
    state.summaries,
    state.users,
    state.dateFrom || '',
    state.dateTo || '',
  )

  const handleCopy = async () => {
    const copied = await copyToClipboard(summary)
    if (!copied) {
      setPartial({ error: 'Clipboard access denied. Unable to copy summary.' })
    }
  }

  const handleExport = async () => {
    const activeUser = state.users.find((user) => user.id === state.activeUserId)
    const userName = activeUser ? getUserDisplayName(activeUser) : 'user'
    const safeUserName = userName
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
    const metric = state.chartSeries[0]?.metricKey ?? 'health_data'
    const filename = [safeUserName || 'user', state.dateFrom, state.dateTo, metric]
      .filter(Boolean)
      .join('_') + '.csv'

    setExporting(true)
    try {
      await saveCsvFile(filename, chartSeriesToCsv(state.chartSeries))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setPartial({ error: `Unable to export CSV: ${message}` })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl flex flex-col w-full max-w-3xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-charcoal">
            AI Summary — {summary.length.toLocaleString()} characters
          </h2>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center p-0 text-warm-gray hover:text-charcoal"
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              className="shrink-0"
            >
              <path d="M5 5L19 19M19 5L5 19" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 min-h-0">
          <pre className="text-xs text-charcoal whitespace-pre-wrap break-all font-mono bg-cream/50 rounded p-3">
            {summary}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
          <button
            type="button"
            className="btn-secondary text-xs py-1.5 px-3"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="btn-secondary text-xs py-1.5 px-3"
            disabled={state.chartSeries.length === 0 || exporting}
            onClick={handleExport}
          >
            {exporting ? 'Exporting...' : 'Export Raw CSV'}
          </button>
          <button
            type="button"
            className="btn-primary text-xs py-1.5 px-3"
            onClick={handleCopy}
          >
            Copy to Clipboard
          </button>
        </div>
      </div>
    </div>
  )
}
