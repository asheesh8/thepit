import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCall } from '../contexts/CallContext'
import useRingtone from '../hooks/useRingtone'

/**
 * Persistent audio player for a single remote stream.
 * Stays mounted for the lifetime of the call so audio never drops
 * during page navigation. Uses a <video> element (not <audio>) so the
 * browser treats it the same as ParticipantTile and doesn't fight us
 * with two different audio decoders for the same track.
 */
function RemoteAudio({ stream }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !stream) return
    el.srcObject = stream
    el.muted = false        // must set the DOM property, not just the React attr
    el.volume = 1
    el.play().catch(() => {})
  }, [stream])
  // Completely invisible — no layout impact
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      style={{ position: 'fixed', width: 0, height: 0, opacity: 0, pointerEvents: 'none', zIndex: -1 }}
    />
  )
}

export default function FloatingCall() {
  const { activeRoom, rtc, endCall } = useCall()
  const location = useLocation()
  const navigate = useNavigate()
  const videoRef = useRef(null)

  // Only hide the VISUAL widget when looking at the full call UI for this room.
  // Audio players render regardless (they keep audio alive across navigation).
  const isViewingActiveCall = !!activeRoom && location.pathname === `/rooms/${activeRoom.id}`

  // Best stream to show visually in the widget
  const displayStream = rtc.remoteStreams.find(r =>
    r.stream?.getVideoTracks().some(t => t.readyState !== 'ended')
  )?.stream ?? rtc.remoteStreams[0]?.stream

  const hasVideo = !!rtc.remoteStreams.find(r =>
    r.stream?.getVideoTracks().some(t => t.readyState !== 'ended')
  )
  const isCalling = !!activeRoom && rtc.mediaState.joined && rtc.remoteStreams.length === 0

  useRingtone(isCalling, activeRoom ? `outgoing:${activeRoom.id}` : 'outgoing')

  // Wire the visual video element
  useEffect(() => {
    const el = videoRef.current
    if (!el || !displayStream) return
    el.srcObject = displayStream
    el.muted = false
    el.play().catch(() => {})
  }, [displayStream])

  // No active room → nothing to render at all
  if (!activeRoom) return null

  const initial = activeRoom.peerName?.[0]?.toUpperCase() || '?'

  return (
    <>
      {/*
       * Always-on hidden audio players for every remote stream.
       * These render even when the widget is hidden (user is on the rooms page
       * looking at the full call UI).  On the rooms page ParticipantTile also
       * plays the audio — but ParticipantTile unmounts on navigation while
       * these stay alive, giving seamless audio continuity.
       *
       * We skip the one stream we'll display in the widget's <video> element
       * to avoid playing it twice; the widget's <video> handles that one.
       */}
      {rtc.remoteStreams
        .filter(r => r.stream !== displayStream)
        .map(r => <RemoteAudio key={r.stream.id} stream={r.stream} />)}

      {/* ── Floating visual widget ── */}
      {rtc.mediaState.joined && !isViewingActiveCall && (
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
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <>
                {/* Audio for the display stream when there's no video to show */}
                {displayStream && <RemoteAudio key={displayStream.id} stream={displayStream} />}
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
              </>
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
      )}
    </>
  )
}
