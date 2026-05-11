import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications'
import { showDeviceNotification } from '../lib/deviceNotifications'

export function useToastQueue() {
  const [toasts, setToasts] = useState([])

  const push = useCallback((n) => {
    const id = Date.now()
    setToasts(prev => [...prev.slice(-2), { ...n, id }])   // max 3 at once
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, push, dismiss }
}

function typeIcon(type) {
  if (type === 'message') return '💬'
  if (type === 'call') return '📞'
  if (type === 'reaction') return '⚡'
  if (type === 'follow')   return '👤'
  return '🔔'
}

function Toast({ toast, onDismiss }) {
  const navigate = useNavigate()
  const swipeX = useRef(0)

  const go = () => {
    onDismiss(toast.id)
    if (toast.link) navigate(toast.link)
  }

  return (
    <div
      className="pit-toast"
      onClick={go}
      onTouchStart={e => { swipeX.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        if (Math.abs(e.changedTouches[0].clientX - swipeX.current) > 60) onDismiss(toast.id)
      }}
    >
      <span className="pit-toast-icon">{typeIcon(toast.type)}</span>
      <div className="pit-toast-body">
        <div className="pit-toast-title">{toast.title}</div>
        {toast.body && <div className="pit-toast-text">{toast.body}</div>}
      </div>
      <button className="pit-toast-close" onClick={e => { e.stopPropagation(); onDismiss(toast.id) }}>×</button>
    </div>
  )
}

export default function NotificationToast({ session }) {
  const { toasts, push, dismiss } = useToastQueue()
  useRealtimeNotifications(session, notification => {
    push(notification)
    showDeviceNotification({
      title: notification.title || 'The Pit',
      body: notification.body,
      tag: notification.roomId ? `${notification.type}-${notification.roomId}` : notification.type,
      url: notification.link || '/',
    })
  })

  if (toasts.length === 0) return null

  return (
    <div className="pit-toast-stack">
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>
  )
}
