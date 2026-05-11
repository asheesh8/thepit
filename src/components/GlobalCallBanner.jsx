import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { showDeviceNotification } from '../lib/deviceNotifications'

/**
 * Listens on the user's personal broadcast channel `user-calls-{userId}` and
 * shows a fullscreen-style ANSWER / DECLINE banner whenever an incoming call
 * arrives — even if the user is nowhere near /rooms.
 *
 * If the user is already inside the target room the Rooms.jsx inline banner
 * handles it, so this component stays silent (prevents double-banners).
 */
export default function GlobalCallBanner({ session }) {
  const [call, setCall] = useState(null)
  const dismissTimer = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const userId = session?.user?.id

  useEffect(() => {
    if (!userId) return
    const ch = supabase
      .channel(`user-calls-${userId}`)
      .on('broadcast', { event: 'call-invite' }, ({ payload }) => {
        if (!payload?.roomId) return
        // If already inside that exact room, skip — Rooms.jsx will show its own banner
        if (location.pathname === `/rooms/${payload.roomId}`) return
        setCall(payload)
        // Auto-dismiss after 30 s if unanswered
        clearTimeout(dismissTimer.current)
        dismissTimer.current = setTimeout(() => setCall(null), 30_000)
        showDeviceNotification({
          title: `${payload.callerName || 'Someone'} is calling`,
          body: payload.title || 'Tap to answer',
          tag: `gcall-${payload.roomId}`,
          url: `/rooms/${payload.roomId}`,
          type: 'call',
          requireInteraction: true,
        })
      })
      .subscribe()
    return () => {
      clearTimeout(dismissTimer.current)
      supabase.removeChannel(ch)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  if (!call) return null

  const answer = () => {
    clearTimeout(dismissTimer.current)
    setCall(null)
    navigate(`/rooms/${call.roomId}`, { state: { openId: call.roomId, autoJoinCall: true } })
  }

  const decline = () => {
    clearTimeout(dismissTimer.current)
    setCall(null)
  }

  return (
    <div className="incoming-call-banner">
      <div>
        <div className="incoming-call-kicker">INCOMING CALL</div>
        <div className="incoming-call-title">{call.callerName || 'Someone'} is calling</div>
        <div className="incoming-call-room">{call.title || 'Tap to join'}</div>
      </div>
      <div className="incoming-call-actions">
        <button className="btn" onClick={decline}>DECLINE</button>
        <button className="btn btn-green" onClick={answer}>ANSWER</button>
      </div>
    </div>
  )
}
