import { useEffect, useState } from 'react'

type NotificationToastProps = {
  message: string
  type?: 'error' | 'success' | 'info'
  onClose?: () => void
}

function NotificationToast({ message, type = 'info', onClose }: NotificationToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(true)

    const fadeTimer = setTimeout(() => {
      setVisible(false)
    }, 4700)

    const closeTimer = setTimeout(() => {
      if (onClose) {
        onClose()
      }
    }, 5000)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(closeTimer)
    }
  }, [message, onClose])

  const tone = type === 'error'
    ? 'bg-rose-600 border border-rose-500/30 text-white'
    : type === 'success'
      ? 'bg-emerald-600 border border-emerald-500/30 text-white'
      : 'bg-slate-900 border border-slate-800 text-slate-200'

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.5)] transition-all duration-300 transform ${
        visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'
      } ${tone}`}
    >
      <p className="text-xs font-semibold tracking-wide flex items-center gap-2">
        {type === 'error' && <span>⚠️</span>}
        {type === 'success' && <span>✓</span>}
        {message}
      </p>
    </div>
  )
}

export default NotificationToast
