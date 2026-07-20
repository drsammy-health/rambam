import { useState } from 'react'
import { generateAISummary, copyToClipboard } from '../lib/ai-summary'
import { useAppState } from '../store'

export default function CopySummaryButton() {
  const { state, setPartial } = useAppState()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const summary = generateAISummary(
      state.chartSeries,
      state.eventSeries,
      state.summaries,
      state.users,
      state.dateFrom || '',
      state.dateTo || '',
    )
    const ok = await copyToClipboard(summary)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      setPartial({ error: 'Clipboard access denied. Unable to copy summary.' })
    }
  }

  const hasData =
    state.chartSeries.length > 0 ||
    state.eventSeries.length > 0 ||
    state.summaries.activity.length > 0 ||
    state.summaries.sleep.length > 0 ||
    state.summaries.body != null ||
    state.summaries.data != null

  return (
    <button
      type="button"
      className="btn-secondary flex-1 text-[10px] whitespace-nowrap py-1.5 px-2"
      disabled={!hasData}
      onClick={handleCopy}
    >
      {copied ? 'Copied!' : 'Copy Summary'}
    </button>
  )
}
