import { useState, useCallback, useRef } from 'react'
import { BrainCircuit } from 'lucide-react'
import { MicButton } from './components/MicButton'
import { AnswerDisplay } from './components/AnswerDisplay'
import { StatusBar } from './components/StatusBar'
import { HistoryPanel, type HistoryEntry } from './components/HistoryPanel'
import { ErrorBanner } from './components/ErrorBanner'
import { useBrowserSpeech } from './hooks/useBrowserSpeech'
import { useWhisperSpeech } from './hooks/useWhisperSpeech'
import './App.css'

const SPEECH_MODE = (import.meta.env.VITE_SPEECH_MODE ?? 'browser') as 'browser' | 'whisper'
const BACKEND_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''

function generateId() {
  return Math.random().toString(36).slice(2)
}

function App() {
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [streamingAnswer, setStreamingAnswer] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isConnected, setIsConnected] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  const eventSourceRef = useRef<EventSource | null>(null)
  const answerBufferRef = useRef('')

  // ── Send question to backend and stream the answer ──────────────────────
  const askQuestion = useCallback((question: string) => {
    const trimmed = question.trim()
    if (!trimmed) return

    // Abort any in-flight stream
    eventSourceRef.current?.close()
    answerBufferRef.current = ''

    setCurrentQuestion(trimmed)
    setStreamingAnswer('')
    setIsStreaming(true)
    setError(null)
    setIsConnected(true)

    // EventSource only supports GET; use fetch + ReadableStream for POST SSE
    const ctrl = new AbortController()

    fetch(`${BACKEND_BASE}/api/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: trimmed }),
      signal: ctrl.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? `HTTP ${res.status}`)
        }

        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { value, done } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Parse SSE lines
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (line.startsWith('data:')) {
              const raw = line.slice(5).trim()
              if (raw === '[DONE]') {
                const finalAnswer = answerBufferRef.current
                setIsStreaming(false)
                // Save to history (max 5 entries)
                setHistory((prev) => [
                  { id: generateId(), question: trimmed, answer: finalAnswer, timestamp: new Date() },
                  ...prev.slice(0, 4),
                ])
                return
              }
              try {
                const token: string = JSON.parse(raw)
                answerBufferRef.current += token
                setStreamingAnswer(answerBufferRef.current)
              } catch {
                // skip malformed SSE data
              }
            } else if (line.startsWith('event: error')) {
              // handled on next data line — skip
            }
          }
        }
        setIsStreaming(false)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(`Failed to get answer: ${err.message}`)
        setIsConnected(false)
        setIsStreaming(false)
      })

    // Store abort controller so we can cancel on next call
    eventSourceRef.current = { close: () => ctrl.abort() } as any
  }, [])

  // ── Speech hooks (mode-aware) ────────────────────────────────────────────
  const browserSpeech = useBrowserSpeech(askQuestion)
  const whisperSpeech = useWhisperSpeech(askQuestion)
  const speech = SPEECH_MODE === 'whisper' ? whisperSpeech : browserSpeech

  const handleMicToggle = () => {
    setError(null)
    speech.start()
  }

  const handleHistorySelect = (entry: HistoryEntry) => {
    setCurrentQuestion(entry.question)
    setStreamingAnswer(entry.answer)
    setIsStreaming(false)
  }

  const displayError = error ?? speech.error

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-indigo-600" />
            <span className="font-bold text-slate-800 text-lg tracking-tight">
              InterviewHack
            </span>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-600">
            AI Answer Agent
          </span>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Status bar */}
        <StatusBar
          speechMode={SPEECH_MODE}
          isConnected={isConnected}
          isStreaming={isStreaming}
        />

        {/* Error banner */}
        {displayError && (
          <ErrorBanner
            message={displayError}
            onDismiss={() => {
              setError(null)
              speech.reset()
            }}
          />
        )}

        {/* Mic section */}
        <section className="flex flex-col items-center gap-4 py-6">
          <MicButton
            state={speech.state}
            onToggle={handleMicToggle}
            disabled={isStreaming}
          />

          {/* Interim transcript (browser mode only) */}
          {SPEECH_MODE === 'browser' && (speech as { interimTranscript?: string }).interimTranscript && (
            <p className="text-sm text-slate-400 italic text-center max-w-xs">
              "{(speech as { interimTranscript?: string }).interimTranscript}…"
            </p>
          )}

          <p className="text-center text-sm text-slate-400 max-w-xs leading-relaxed">
            {SPEECH_MODE === 'browser'
              ? 'Tap the mic, ask your interview question, then tap again to stop.'
              : 'Tap the mic to start recording. Tap again to send for transcription.'}
          </p>
        </section>

        {/* Current answer */}
        {(currentQuestion || isStreaming) && (
          <AnswerDisplay
            question={currentQuestion}
            answer={streamingAnswer}
            isStreaming={isStreaming}
          />
        )}

        {/* History */}
        <HistoryPanel entries={history} onSelect={handleHistorySelect} />
      </main>

      {/* ── Footer ── */}
      <footer className="text-center py-4 text-xs text-slate-300">
        Powered by GPT-4o · {SPEECH_MODE === 'browser' ? 'Web Speech API' : 'Whisper'}
      </footer>
    </div>
  )
}

export default App

