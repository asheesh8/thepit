import { useEffect, useRef } from 'react'

export default function ParticipantTile({ label, stream, muted = false, isLocal = false }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream
  }, [stream])

  return (
    <div style={{ position: 'relative', background: 'var(--dark)', border: '1px solid var(--border)', minHeight: '120px', overflow: 'hidden' }}>
      {stream ? (
        <video ref={ref} autoPlay playsInline muted={muted} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Bebas Neue', fontSize: '2rem', color: 'var(--border)' }}>
          {isLocal ? 'YOU' : 'PEER'}
        </div>
      )}
      <div style={{ position: 'absolute', left: 8, bottom: 8, background: 'rgba(0,0,0,0.65)', padding: '4px 8px', fontFamily: 'Space Mono', fontSize: '9px', color: '#fff' }}>
        {label}
      </div>
    </div>
  )
}
