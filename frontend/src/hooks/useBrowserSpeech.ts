import { useState, useRef, useCallback } from 'react'

export type SpeechState = 'idle' | 'listening' | 'processing' | 'error'

interface UseBrowserSpeechReturn {
  state: SpeechState
  transcript: string
  interimTranscript: string
  error: string | null
  start: () => void
  stop: () => void
  reset: () => void
}

// Extend Window type for cross-browser Speech API
const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

export function useBrowserSpeech(
  onTranscriptReady: (transcript: string) => void
): UseBrowserSpeechReturn {
  const [state, setState] = useState<SpeechState>('idle')
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const reset = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setError(null)
    setState('idle')
  }, [])

  const start = useCallback(() => {
    if (!SpeechRecognition) {
      setError(
        'Speech recognition is not supported in this browser. Use Chrome or Edge, or switch to Whisper mode.'
      )
      setState('error')
      return
    }

    if (state === 'listening') {
      stop()
      return
    }

    setError(null)
    setTranscript('')
    setInterimTranscript('')

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    recognition.onstart = () => {
      setState('listening')
    }

    recognition.onresult = (event: any) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      setInterimTranscript(interim)
      if (final) {
        setTranscript(final)
      }
    }

    recognition.onend = () => {
      setInterimTranscript('')
      setState('idle')
      recognitionRef.current = null
    }

    recognition.onerror = (event: any) => {
      const msg =
        event.error === 'not-allowed'
          ? 'Microphone access was denied. Please allow mic access and try again.'
          : event.error === 'no-speech'
          ? 'No speech detected. Please try again.'
          : `Speech recognition error: ${event.error}`
      setError(msg)
      setState('error')
      recognitionRef.current = null
    }

    // Store final transcript on the ref so onend can access it
    recognition.onresult = (event: any) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      if (interim) setInterimTranscript(interim)
      if (final) {
        setTranscript(final)
        recognition._finalTranscript = final
      }
    }

    recognition.onend = () => {
      setInterimTranscript('')
      const captured = recognition._finalTranscript || ''
      setState(captured ? 'processing' : 'idle')
      if (captured) {
        onTranscriptReady(captured)
      }
      recognitionRef.current = null
    }

    recognition.start()
  }, [state, stop, transcript, onTranscriptReady])

  return { state, transcript, interimTranscript, error, start, stop, reset }
}
