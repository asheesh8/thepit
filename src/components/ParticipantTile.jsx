import { useEffect, useRef } from 'react'

export default function ParticipantTile({
  label,
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

  useEffect(() => {
    if (!ref.current) return
    if (stream) ref.current.srcObject = stream
    ref.current.volume = volume
  }, [stream, volume])

  return (
    <div className={`participant-tile ${featured ? 'participant-tile-featured' : ''}`} onContextMenu={onContextMenu}>
      {stream ? (
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
        <div style={{ height: '100%', minHeight: featured ? '260px' : '128px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Bebas Neue', fontSize: featured ? '3.4rem' : '2rem', color: 'var(--border)' }}>
          {label}
        </div>
      )}
      <div style={{ position: 'absolute', left: 10, bottom: 10, background: 'rgba(0,0,0,0.68)', border: '1px solid rgba(255,255,255,0.1)', padding: '5px 8px', fontFamily: 'Space Mono', fontSize: '9px', color: '#fff' }}>
        {label}
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
