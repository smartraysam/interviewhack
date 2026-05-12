import { Wifi, WifiOff, Mic, Radio } from 'lucide-react'

interface StatusBarProps {
  speechMode: 'browser' | 'whisper'
  isConnected: boolean
  isStreaming: boolean
}

export function StatusBar({ speechMode, isConnected, isStreaming }: StatusBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500">
      {/* Left: speech mode */}
      <div className="flex items-center gap-1.5">
        <Mic className="w-3.5 h-3.5" />
        <span className="font-medium">
          {speechMode === 'browser' ? 'Browser Speech' : 'Whisper (Server)'}
        </span>
      </div>

      {/* Right: connection + streaming status */}
      <div className="flex items-center gap-3">
        {isStreaming && (
          <div className="flex items-center gap-1 text-indigo-500 font-medium">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Streaming</span>
          </div>
        )}
        <div
          className={`flex items-center gap-1 ${
            isConnected ? 'text-green-600' : 'text-slate-400'
          }`}
        >
          {isConnected ? (
            <Wifi className="w-3.5 h-3.5" />
          ) : (
            <WifiOff className="w-3.5 h-3.5" />
          )}
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
    </div>
  )
}
