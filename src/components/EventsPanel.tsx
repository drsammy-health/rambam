import type { EventType } from '../types'

type EventsPanelProps = {
  events: EventType[]
  activeEventKeys: string[]
  onToggle: (eventKey: string) => void
}

export default function EventsPanel({
  events,
  activeEventKeys,
  onToggle,
}: EventsPanelProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {events.map((ev) => {
        const active = activeEventKeys.includes(ev.key)
        return (
          <button
            key={ev.key}
            type="button"
            onClick={() => onToggle(ev.key)}
            className={active ? 'metric-chip-active' : 'metric-chip'}
          >
            {ev.label}
          </button>
        )
      })}
    </div>
  )
}
