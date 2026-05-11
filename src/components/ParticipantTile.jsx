import { useEffect, useRef } from 'react'

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
  onContextMenu,
}) {
  const ref = useRef(null)
  const hasVideo = stream?.getVideoTracks?.().some(track => track.readyState === 'live')

  useEffect(() => {
    if (!ref.current) return
    if (stream) ref.current.srcObject = stream
    ref.current.volume = volume
  }, [stream, volume])

  return (
    <div className={`participant-tile ${featured ? 'participant-tile-featured' : ''}`} onContextMenu={onContextMenu}>
      {stream ? (
        hasVideo ? (
          <video
            ref={ref}
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
            <div className="participant-audio-label">AUDIO CONNECTED</div>
          </div>
        )
      ) : (
        <div className="participant-empty-tile">
          <div>{label}</div>
          <span>CONNECTING</span>
        </div>
      )}
      <div className="participant-label">
        <strong>{label}</strong>
        {sublabel && <span>{sublabel}</span>}
      </div>
      {pinned && (
        <div style={{ position: 'absolute', right: 10, top: 10, border: '1px solid var(--gold)', color: 'var(--gold)', padding: '5px 7px', fontFamily: 'Space Mono', fontSize: '8px', background: 'rgba(0,0,0,0.68)' }}>
          PINNED
        </div>
      )}
      {!active && (
        <div style={{ position: 'absolute', right: 10, bottom: 10, border: '1px solid var(--red)', color: 'var(--red)', padding: '5px 7px', fontFamily: 'Space Mono', fontSize: '8px', background: 'rgba(0,0,0,0.68)' }}>
          CAM OFF
        </div>
      )}
    </div>
  )
}
