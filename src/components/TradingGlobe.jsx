import { useEffect, useRef, useState, useCallback } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'

function isActive(start, end) {
  const h = new Date().getUTCHours()
  return start < end ? h >= start && h < end : h >= start || h < end
}

function nextOpen(start, end) {
  const now = new Date()
  const utcH = now.getUTCHours()
  const utcM = now.getUTCMinutes()
  const utcS = now.getUTCSeconds()
  const totalSecs = utcH * 3600 + utcM * 60 + utcS

  if (isActive(start, end)) return 0

  const openSecs = start * 3600
  let diff = openSecs - totalSecs
  if (diff < 0) diff += 86400
  return diff
}

function fmtCountdown(secs) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

const SESSIONS = [
  {
    name: 'SYDNEY', start: 21, end: 6, color: '#2ec4b6',
    cities: [
      { name: 'Sydney',    lat: -33.87, lon: 151.21 },
      { name: 'Melbourne', lat: -37.81, lon: 144.96 },
    ],
  },
  {
    name: 'TOKYO', start: 0, end: 9, color: '#f4a261',
    cities: [
      { name: 'Tokyo',     lat:  35.68, lon: 139.69 },
      { name: 'Hong Kong', lat:  22.32, lon: 114.17 },
      { name: 'Singapore', lat:   1.35, lon: 103.82 },
    ],
  },
  {
    name: 'LONDON', start: 7, end: 16, color: '#e63946',
    cities: [
      { name: 'London',    lat:  51.51, lon:  -0.13 },
      { name: 'Frankfurt', lat:  50.11, lon:   8.68 },
      { name: 'Dubai',     lat:  25.20, lon:  55.27 },
    ],
  },
  {
    name: 'NEW YORK', start: 13, end: 22, color: '#e63946',
    cities: [
      { name: 'New York', lat:  40.71, lon: -74.01 },
      { name: 'Chicago',  lat:  41.88, lon: -87.63 },
    ],
  },
]

export default function TradingGlobe() {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const svgRef = useRef(null)
  const [geoData, setGeoData] = useState(null)
  const [dims, setDims] = useState({ w: 800, h: 360 })
  const [pulse, setPulse] = useState(0)
  const [tick, setTick] = useState(0)

  // load geo data
  useEffect(() => {
    fetch('/world.json').then(r => r.json()).then(setGeoData)
  }, [])

  // measure container
  useEffect(() => {
    const obs = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      setDims({ w, h: Math.round(w * 0.42) })
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // pulse animation
  useEffect(() => {
    let frame
    const animate = (ts) => {
      setPulse((Math.sin(ts / 600) + 1) / 2)
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  // 1s ticker for countdown
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // draw map onto canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !geoData) return
    const { w, h } = dims
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    const projection = geoNaturalEarth1()
      .scale((w / 640) * 100)
      .translate([w / 2, h / 2])
    const path = geoPath(projection, ctx)
    ctx.clearRect(0, 0, w, h)
    geoData.features.forEach(f => {
      ctx.beginPath()
      path(f)
      ctx.fillStyle = '#0d1e16'
      ctx.strokeStyle = '#1c3826'
      ctx.lineWidth = 0.6
      ctx.fill()
      ctx.stroke()
    })
  }, [geoData, dims])

  useEffect(() => { draw() }, [draw])

  const sessions = SESSIONS.map(s => ({ ...s, live: isActive(s.start, s.end) }))
  const liveSessions = sessions.filter(s => s.live)
  const allCities = SESSIONS.flatMap(s =>
    s.cities.map(c => ({ ...c, color: s.color, active: isActive(s.start, s.end) }))
  )

  // next session countdown
  const nextSession = sessions
    .filter(s => !s.live)
    .map(s => ({ ...s, secs: nextOpen(s.start, s.end) }))
    .sort((a, b) => a.secs - b.secs)[0]

  const projection = geoData
    ? geoNaturalEarth1().scale((dims.w / 640) * 100).translate([dims.w / 2, dims.h / 2])
    : null

  return (
    <div ref={containerRef} style={{ border: '1px solid var(--border)', marginBottom: '28px', background: '#060d0a', overflow: 'hidden' }}>

      {/* header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: '#07100c', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontFamily: 'Space Mono', fontSize: '9px', letterSpacing: '0.18em', color: 'var(--dim)', whiteSpace: 'nowrap' }}>
          MARKET SESSIONS — UTC {new Date().getUTCHours().toString().padStart(2,'0')}:{new Date().getUTCMinutes().toString().padStart(2,'0')}
        </span>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {sessions.map(s => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                background: s.live ? s.color : '#1e2e22',
                boxShadow: s.live ? `0 0 7px ${s.color}` : 'none',
              }} />
              <span style={{ fontFamily: 'Space Mono', fontSize: '9px', letterSpacing: '0.1em', color: s.live ? s.color : 'var(--muted)', whiteSpace: 'nowrap' }}>
                {s.name}{s.live ? ' · LIVE' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* map */}
      <div style={{ position: 'relative', lineHeight: 0 }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%' }} />

        {geoData && projection && (
          <svg
            viewBox={`0 0 ${dims.w} ${dims.h}`}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          >
            {allCities.map(city => {
              const pt = projection([city.lon, city.lat])
              if (!pt) return null
              const [cx, cy] = pt
              const r = city.active ? 5 : 2.5
              return (
                <g key={city.name}>
                  {city.active && <>
                    <circle cx={cx} cy={cy} r={r + 8 * pulse} fill={city.color} opacity={0.08} />
                    <circle cx={cx} cy={cy} r={r + 4 * pulse} fill={city.color} opacity={0.15} />
                  </>}
                  <circle cx={cx} cy={cy} r={r} fill={city.active ? city.color : '#1e3024'} />
                  {city.active && <circle cx={cx} cy={cy} r={r} fill="none" stroke={city.color} strokeWidth={1.2} opacity={0.9} />}
                  <text x={cx + r + 4} y={cy + 3.5} fontFamily="Space Mono,monospace" fontSize={city.active ? 8 : 7} fill={city.active ? city.color : '#2a4030'} opacity={city.active ? 0.9 : 0.5}>
                    {city.name.toUpperCase()}
                  </text>
                </g>
              )
            })}
          </svg>
        )}

        {!geoData && (
          <div style={{ height: dims.h, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)' }}>
            LOADING MAP...
          </div>
        )}
      </div>

      {/* footer: active cities + next session countdown */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderTop: '1px solid var(--border)', background: '#07100c', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {liveSessions.length > 0 ? (
            <>
              <span style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--dim)', letterSpacing: '0.12em' }}>
                {liveSessions.length > 1 ? 'OVERLAP — PEAK LIQUIDITY' : 'ACTIVE'}
              </span>
              {liveSessions.flatMap(s => s.cities).map(c => (
                <span key={c.name} style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--dim)', letterSpacing: '0.08em' }}>
                  {c.name.toUpperCase()}
                </span>
              ))}
            </>
          ) : (
            <span style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--muted)', letterSpacing: '0.1em' }}>
              ALL SESSIONS CLOSED
            </span>
          )}
        </div>

        {nextSession && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--muted)', letterSpacing: '0.1em' }}>
              {nextSession.name} OPENS IN
            </span>
            <span style={{ fontFamily: 'Space Mono', fontSize: '11px', color: nextSession.color, letterSpacing: '0.1em', fontVariantNumeric: 'tabular-nums' }}>
              {fmtCountdown(nextSession.secs - tick >= 0 ? nextSession.secs - tick : nextOpen(nextSession.start, nextSession.end))}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
