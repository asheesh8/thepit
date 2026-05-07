import { useEffect, useState } from 'react'

const SESSIONS = [
  { name: 'SYDNEY',   start: 21, end: 6,  color: '#2ec4b6' },
  { name: 'TOKYO',    start: 0,  end: 9,  color: '#f4a261' },
  { name: 'LONDON',   start: 7,  end: 16, color: '#e63946' },
  { name: 'NEW YORK', start: 13, end: 22, color: '#e63946' },
]

function isActive({ start, end }) {
  const h = new Date().getUTCHours()
  return start < end ? h >= start && h < end : h >= start || h < end
}

function secsUntilOpen(start) {
  const now = new Date()
  const utcH = now.getUTCHours()
  const utcM = now.getUTCMinutes()
  const utcS = now.getUTCSeconds()
  const currentSecs = utcH * 3600 + utcM * 60 + utcS
  const openSecs = start * 3600
  let diff = openSecs - currentSecs
  if (diff <= 0) diff += 86400
  return diff
}

function formatHMS(totalSecs) {
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

function computeState() {
  const active = SESSIONS.filter(isActive)

  // Find the inactive session opening soonest
  const inactive = SESSIONS.filter(s => !isActive(s))
  let nextSession = null
  let nextSecs = Infinity
  for (const s of inactive) {
    const secs = secsUntilOpen(s.start)
    if (secs < nextSecs) {
      nextSecs = secs
      nextSession = s
    }
  }
  // Edge case: all sessions active — find the one opening soonest (after close)
  if (!nextSession && SESSIONS.length > 0) {
    for (const s of SESSIONS) {
      const secs = secsUntilOpen(s.start)
      if (secs < nextSecs) {
        nextSecs = secs
        nextSession = s
      }
    }
  }

  return { active, nextSession, nextSecs }
}

export default function MarketSessionWidget() {
  const [state, setState] = useState(() => computeState())

  useEffect(() => {
    const id = setInterval(() => setState(computeState()), 1000)
    return () => clearInterval(id)
  }, [])

  const { active, nextSession, nextSecs } = state

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 1000,
      width: '220px',
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: '6px',
      padding: '10px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
    }}>

      {/* Active sessions row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        minHeight: '16px',
      }}>
        {active.length === 0 ? (
          <span style={{
            fontFamily: 'Space Mono',
            fontSize: '9px',
            color: 'var(--dim)',
            letterSpacing: '0.1em',
          }}>
            ALL SESSIONS CLOSED
          </span>
        ) : active.map(s => (
          <span key={s.name} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontFamily: 'Space Mono',
            fontSize: '9px',
            color: s.color,
            letterSpacing: '0.08em',
          }}>
            {/* Glowing dot */}
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: s.color,
              flexShrink: 0,
              boxShadow: `0 0 5px 1px ${s.color}`,
              animation: 'msw-pulse 2s ease-in-out infinite',
            }} />
            {s.name}
          </span>
        ))}
      </div>

      {/* Countdown row */}
      {nextSession && (
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '5px',
          borderTop: '1px solid var(--border)',
          paddingTop: '6px',
        }}>
          <span style={{
            fontFamily: 'Space Mono',
            fontSize: '8px',
            color: 'var(--dim)',
            letterSpacing: '0.1em',
            whiteSpace: 'nowrap',
          }}>
            {nextSession.name} OPENS IN
          </span>
          <span style={{
            fontFamily: 'Bebas Neue',
            fontSize: '1rem',
            color: nextSession.color,
            letterSpacing: '0.05em',
            lineHeight: 1,
          }}>
            {formatHMS(nextSecs)}
          </span>
        </div>
      )}

      {/* Pulse keyframe injected once */}
      <style>{`
        @keyframes msw-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </div>
  )
}
