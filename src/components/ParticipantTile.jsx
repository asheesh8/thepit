import { useCallback, useEffect, useRef, useState } from 'react'

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
  const tileRef  = useRef(null)
  const [hasVideo, setHasVideo] = useState(false)
  const [fsActive, setFsActive] = useState(false)

  // Recompute hasVideo from the live stream state
  const recheckVideo = useCallback(() => {
    const has = !!stream?.getVideoTracks().some(
      t => t.readyState !== 'ended' && t.enabled !== false
    )
    setHasVideo(has)
  }, [stream])

  // Keep srcObject in sync.
  // The <video> element is ALWAYS mounted when stream exists (just CSS-hidden when no video).
  // This guarantees videoRef.current is non-null when this effect runs.
  useEffect(() => {
    const el = videoRef.current
    if (!stream) {
      setHasVideo(false)
      if (el) el.srcObject = null
      return
    }

    el.srcObject = stream
    el.play().catch(() => {})
    recheckVideo()

    // Recheck & replay whenever tracks are added (e.g. video arrives after audio)
    const onAdd = () => {
      el.srcObject = null
      el.srcObject = stream
      el.play().catch(() => {})
      recheckVideo()
    }
    stream.addEventListener('addtrack', onAdd)
    return () => stream.removeEventListener('addtrack', onAdd)
  }, [stream, recheckVideo])

  // Volume is separate so it doesn't retrigger srcObject assignment
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
    if (document.fullscreenElement) document.exitFullscreen()
    else tileRef.current?.requestFullscreen?.()
  }

  return (
    <div
      ref={tileRef}
      className={`participant-tile${featured ? ' participant-tile-featured' : ''}${spotlit ? ' participant-tile-spotlit' : ''}`}
      onContextMenu={onContextMenu}
      onClick={onSpotlight}
    >
      {stream ? (
        <>
          {/* Video element is ALWAYS in the DOM so srcObject can always be set.
              Hide it with display:none when no video — never unmount it. */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={muted}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: hasVideo ? 'block' : 'none',
              transform: mirror ? 'scaleX(-1)' : 'none',
            }}
          />
          {!hasVideo && (
            <div className="participant-audio-only">
              <div className="participant-audio-avatar">{label.slice(0, 1)}</div>
              <div className="participant-audio-label">AUDIO ONLY</div>
            </div>
          )}
        </>
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

      {/* Fullscreen button */}
      <button className="participant-fs-btn" onClick={requestFullscreen} title="Fullscreen">
        {fsActive ? '⊠' : '⛶'}
      </button>

      {spotlit && <div className="participant-spotlight-badge">FOCUS</div>}
      {pinned && !spotlit && <div className="participant-pin-badge">PINNED</div>}
      {!active && <div className="participant-cam-off-badge">CAM OFF</div>}
    </div>
  )
}
