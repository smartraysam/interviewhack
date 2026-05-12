import { AlertCircle, X } from 'lucide-react'

interface ErrorBannerProps {
  message: string
  onDismiss: () => void
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
    >
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
      <span className="flex-1 leading-snug">{message}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss error"
        className="shrink-0 text-red-400 hover:text-red-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
