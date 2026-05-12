import { useState, useRef, useCallback } from 'react'
import type { SpeechState } from './useBrowserSpeech'

interface UseWhisperSpeechReturn {
  state: SpeechState
  transcript: string
  error: string | null
  start: () => void
  stop: () => void
  reset: () => void
}

const BACKEND_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''

export function useWhisperSpeech(
  onTranscriptReady: (transcript: string) => void
): UseWhisperSpeechReturn {
  const [state, setState] = useState<SpeechState>('idle')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const reset = useCallback(() => {
    setTranscript('')
    setError(null)
    setState('idle')
  }, [])

  const stop = useCallback(() => {
    mediaRecorderRef.current?.stop()
  }, [])

  const start = useCallback(async () => {
    if (state === 'listening') {
      stop()
      return
    }

    setError(null)
    setTranscript('')
    chunksRef.current = []

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError(
        'Microphone access was denied. Please allow mic access and try again.'
      )
      setState('error')
      return
    }

    // Pick a supported MIME type (webm preferred for Whisper)
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : 'audio/ogg'

    const recorder = new MediaRecorder(stream, { mimeType })
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      // Stop all mic tracks
      stream.getTracks().forEach((t) => t.stop())

      if (chunksRef.current.length === 0) {
        setState('idle')
        return
      }

      setState('processing')
      const blob = new Blob(chunksRef.current, { type: mimeType })
      const extension = mimeType.includes('webm') ? 'webm' : 'ogg'

      const formData = new FormData()
      formData.append('audio', blob, `recording.${extension}`)

      try {
        const res = await fetch(`${BACKEND_BASE}/api/transcribe`, {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? `HTTP ${res.status}`)
        }

        const data = await res.json()
        const text: string = data.transcript ?? ''
        setTranscript(text)

        if (text.trim()) {
          onTranscriptReady(text.trim())
        } else {
          setError('No speech detected in the recording. Please try again.')
          setState('error')
        }
      } catch (err: any) {
        setError(`Transcription failed: ${err.message}`)
        setState('error')
      }
    }

    recorder.start(200) // collect data every 200ms
    setState('listening')
  }, [state, stop, onTranscriptReady])

  return { state, transcript, error, start, stop, reset }
}
