import { ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { useState } from 'react'

export interface HistoryEntry {
  id: string
  question: string
  answer: string
  timestamp: Date
}

interface HistoryPanelProps {
  entries: HistoryEntry[]
  onSelect: (entry: HistoryEntry) => void
}

function stripTypeLabel(text: string): string {
  return text.replace(/^\[Type:[^\]]+\]\s*\n?/i, '')
}

export function HistoryPanel({ entries, onSelect }: HistoryPanelProps) {
  const [open, setOpen] = useState(false)

  if (entries.length === 0) return null

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>History</span>
          <span className="ml-1 text-xs font-normal text-slate-400">
            ({entries.length})
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {open && (
        <ul className="border-t border-slate-100 divide-y divide-slate-50">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                onClick={() => onSelect(entry)}
                className="w-full text-left px-5 py-3 hover:bg-indigo-50 transition-colors group"
              >
                <p className="text-sm font-medium text-slate-700 truncate group-hover:text-indigo-700">
                  {entry.question}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                  {stripTypeLabel(entry.answer).slice(0, 100)}…
                </p>
                <p className="text-[10px] text-slate-300 mt-1">
                  {entry.timestamp.toLocaleTimeString()}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
