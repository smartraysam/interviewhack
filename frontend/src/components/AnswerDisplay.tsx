import { useState } from 'react'
import { Copy, Check, Loader2 } from 'lucide-react'

const TYPE_BADGES: Record<string, { label: string; color: string }> = {
  Technical: {
    label: 'Technical',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  Behavioral: {
    label: 'Behavioral / STAR',
    color: 'bg-green-100 text-green-700 border-green-200',
  },
  'System Design': {
    label: 'System Design',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  General: {
    label: 'General',
    color: 'bg-slate-100 text-slate-600 border-slate-200',
  },
}

function detectType(text: string): string | null {
  const firstLine = text.split('\n')[0] ?? ''
  const match = firstLine.match(/\[Type:\s*(.+?)\]/i)
  return match ? match[1].trim() : null
}

function stripTypeLabel(text: string): string {
  return text.replace(/^\[Type:[^\]]+\]\s*\n?/i, '')
}

interface AnswerDisplayProps {
  question: string
  answer: string
  isStreaming: boolean
}

export function AnswerDisplay({ question, answer, isStreaming }: AnswerDisplayProps) {
  const [copied, setCopied] = useState(false)

  const detectedType = detectType(answer)
  const badge = detectedType ? TYPE_BADGES[detectedType] ?? null : null
  const displayText = stripTypeLabel(answer)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available
    }
  }

  if (!answer && !isStreaming) return null

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Question header */}
      <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
              Question
            </p>
            <p className="text-sm text-slate-700 font-medium leading-snug break-words">
              {question}
            </p>
          </div>
          {badge && (
            <span
              className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${badge.color}`}
            >
              {badge.label}
            </span>
          )}
        </div>
      </div>

      {/* Answer body */}
      <div className="px-5 py-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Suggested Answer
          </p>
          {!isStreaming && displayText && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors"
              aria-label="Copy answer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
        </div>

        {isStreaming && !displayText ? (
          <div className="flex items-center gap-2 text-slate-400 py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Thinking…</span>
          </div>
        ) : (
          <div className="prose prose-slate prose-sm max-w-none">
            <p className="text-slate-800 text-base leading-relaxed whitespace-pre-wrap break-words">
              {displayText}
              {isStreaming && (
                <span className="inline-block w-0.5 h-4 bg-indigo-500 animate-pulse ml-0.5 align-middle" />
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
