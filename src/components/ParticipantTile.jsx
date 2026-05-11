import { useEffect, useRef, useState } from 'react'

export default function ParticipantTile({
  label,
  sublabel,
  stream,
  muted = false,
  volume = 1,
  mirror = true,
  featured = false,
  active = true,
  pinned = false,
  spotlit = false,
  onContextMenu,
  onSpotlight,
}) {
  const videoRef = useRef(null)
  const tileRef = useRef(null)
  const [fsActive, setFsActive] = useState(false)
  const hasVideo = stream?.getVideoTracks?.().some(track => track.readyState === 'live' && track.enabled !== false)

  // Sync srcObject whenever stream changes OR new tracks are added to it
  useEffect(() => {
    const el = videoRef.current
    if (!el || !stream) return
    el.srcObject = stream
    el.volume = Math.max(0, Math.min(1, volume))
    el.play().catch(() => {})

    const onAddTrack = () => {
      el.srcObject = null
      el.srcObject = stream
      el.play().catch(() => {})
    }
    stream.addEventListener('addtrack', onAddTrack)
    return () => stream.removeEventListener('addtrack', onAddTrack)
  }, [stream])

  // Keep volume in sync separately
  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = Math.max(0, Math.min(1, volume))
  }, [volume])

  // Track native fullscreen state
  useEffect(() => {
    const onChange = () => setFsActive(document.fullscreenElement === tileRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const requestFullscreen = (e) => {
    e.stopPropagation()
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      tileRef.current?.requestFullscreen?.()
    }
  }

  return (
    <div
      ref={tileRef}
      className={`participant-tile${featured ? ' participant-tile-featured' : ''}${spotlit ? ' participant-tile-spotlit' : ''}`}
      onContextMenu={onContextMenu}
      onClick={onSpotlight}
    >
      {stream ? (
        hasVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={muted}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transform: mirror ? 'scaleX(-1)' : 'none',
            }}
          />
        ) : (
          <div className="participant-audio-only">
            <div className="participant-audio-avatar">{label.slice(0, 1)}</div>
            <div className="participant-audio-label">AUDIO ONLY</div>
          </div>
        )
      ) : (
        <div className="participant-empty-tile">
          <div>{label}</div>
          <span>CONNECTING...</span>
        </div>
      )}

      {/* Bottom label */}
      <div className="participant-label">
        <strong>{label}</strong>
        {sublabel && <span>{sublabel}</span>}
      </div>

      {/* Fullscreen button — top-right */}
      <button
        className="participant-fs-btn"
        onClick={requestFullscreen}
        title="Fullscreen"
      >
        {fsActive ? '⊠' : '⛶'}
      </button>

      {/* Spotlight indicator */}
      {spotlit && (
        <div className="participant-spotlight-badge">FOCUS</div>
      )}

      {pinned && !spotlit && (
        <div className="participant-pin-badge">PINNED</div>
      )}

      {!active && (
        <div className="participant-cam-off-badge">CAM OFF</div>
      )}
    </div>
  )
}
