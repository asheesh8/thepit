import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCall } from '../contexts/CallContext'

export default function FloatingCall() {
  const { activeRoom, rtc, endCall } = useCall()
  const location = useLocation()
  const navigate = useNavigate()
  const videoRef = useRef(null)

  // Only hide when the user is actually viewing the active call room (full overlay visible)
  // Keep showing on other /rooms threads or any other page
  const isViewingActiveCall = !!activeRoom && location.pathname === `/rooms/${activeRoom.id}`
  const show = !!activeRoom && rtc.mediaState.joined && !isViewingActiveCall

  const remoteStream = rtc.remoteStreams[0]?.stream
  const hasVideo = rtc.remoteStreams.some(r =>
    r.stream?.getVideoTracks().some(t => t.readyState !== 'ended')
  )

  useEffect(() => {
    const el = videoRef.current
    if (!el || !remoteStream) return
    el.srcObject = remoteStream
    el.play().catch(() => {})
  }, [remoteStream])

  if (!show) return null

  const initial = activeRoom.peerName?.[0]?.toUpperCase() || '?'

  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
      right: '12px',
      width: '130px',
      height: '175px',
      zIndex: 9500,
      borderRadius: '16px',
      overflow: 'hidden',
      border: '2px solid var(--green)',
      background: '#0a0a0a',
      boxShadow: '0 8px 40px rgba(0,0,0,0.75)',
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }}>
      {/* Tap main area → go back to full call */}
      <div
        onClick={() => navigate(`/rooms/${activeRoom.id}`)}
        style={{ width: '100%', height: '100%', cursor: 'pointer' }}
      >
        {hasVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '10px',
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: 'var(--dark)', border: '1.5px solid var(--green)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: 'var(--green)',
            }}>
              {activeRoom.peerAvatar
                ? <img src={activeRoom.peerAvatar} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                : initial
              }
            </div>
            <div style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--green)', letterSpacing: '0.1em' }}>
              {rtc.remoteStreams.length > 0 ? 'CONNECTED' : 'CALLING...'}
            </div>
          </div>
        )}
      </div>

      {/* Control strip */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '6px 8px 8px',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.88))',
        display: 'flex', gap: '6px', justifyContent: 'center',
      }}>
        <button
          onClick={e => { e.stopPropagation(); rtc.toggleMic() }}
          title={rtc.mediaState.mic ? 'Mute' : 'Unmute'}
          style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: rtc.mediaState.mic ? 'rgba(46,196,182,0.25)' : 'rgba(230,57,70,0.3)',
            border: `1.5px solid ${rtc.mediaState.mic ? 'var(--green)' : 'var(--red)'}`,
            color: rtc.mediaState.mic ? 'var(--green)' : 'var(--red)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: '13px',
            flexShrink: 0,
          }}
        >
          {rtc.mediaState.mic ? '🎤' : '🔇'}
        </button>
        <button
          onClick={e => { e.stopPropagation(); endCall() }}
          title="End call"
          style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: 'rgba(230,57,70,0.35)',
            border: '1.5px solid var(--red)',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: '14px', fontWeight: 700,
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>

      {/* Expand hint */}
      <div style={{
        position: 'absolute', top: '6px', left: 0, right: 0,
        textAlign: 'center', fontFamily: 'Space Mono', fontSize: '6px',
        color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', pointerEvents: 'none',
      }}>
        TAP TO EXPAND
      </div>
    </div>
  )
}
