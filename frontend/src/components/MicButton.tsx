import { Mic, MicOff, Loader2 } from 'lucide-react'
import type { SpeechState } from '../hooks/useBrowserSpeech'

interface MicButtonProps {
  state: SpeechState
  onToggle: () => void
  disabled?: boolean
}

export function MicButton({ state, onToggle, disabled }: MicButtonProps) {
  const isListening = state === 'listening'
  const isProcessing = state === 'processing'
  const isError = state === 'error'

  const label = isListening
    ? 'Stop recording'
    : isProcessing
    ? 'Processing…'
    : 'Start recording'

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={onToggle}
        disabled={disabled || isProcessing}
        aria-label={label}
        className={[
          'relative flex items-center justify-center w-24 h-24 rounded-full',
          'transition-all duration-200 focus:outline-none focus-visible:ring-4',
          'focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-60',
          isListening
            ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-300'
            : isError
            ? 'bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-200'
            : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200',
        ].join(' ')}
      >
        {/* Pulse ring when listening */}
        {isListening && (
          <>
            <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />
            <span className="absolute inset-[-8px] rounded-full border-2 border-red-300 animate-pulse opacity-60" />
          </>
        )}

        {isProcessing ? (
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        ) : isListening ? (
          <MicOff className="w-10 h-10 text-white relative z-10" />
        ) : (
          <Mic className="w-10 h-10 text-white relative z-10" />
        )}
      </button>

      <span
        className={[
          'text-sm font-medium tracking-wide',
          isListening
            ? 'text-red-500'
            : isProcessing
            ? 'text-indigo-500'
            : isError
            ? 'text-amber-600'
            : 'text-slate-500',
        ].join(' ')}
      >
        {label}
      </span>
    </div>
  )
}
