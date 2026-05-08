import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'

export default function Landing() {
  const canvasRef = useRef(null)

  // animated ticker tape background
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const tickers = ['ES', 'NQ', 'MNQ', 'MES', 'YM', 'RTY', 'CL', 'GC', 'ZB', 'ZN']
    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: 0.2 + Math.random() * 0.4,
      ticker: tickers[Math.floor(Math.random() * tickers.length)],
      opacity: 0.03 + Math.random() * 0.06,
      size: 10 + Math.random() * 14,
    }))

    let raf
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.font = `bold 12px 'Space Mono', monospace`
      particles.forEach(p => {
        ctx.globalAlpha = p.opacity
        ctx.fillStyle = '#e8e8e0'
        ctx.fillText(p.ticker, p.x, p.y)
        p.y -= p.speed
        if (p.y < -20) {
          p.y = canvas.height + 20
          p.x = Math.random() * canvas.width
        }
      })
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }
    draw()

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <div className="landing-screen">
      <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, pointerEvents: 'none' }} />

      {/* horizontal rule lines */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 79px, #1a1a1a 79px, #1a1a1a 80px)',
        opacity: 0.4 }} />

      {/* main content */}
      <div className="landing-shell">

        <div className="landing-copy">
          <div style={{ fontFamily: 'Space Mono', fontSize: '10px', letterSpacing: '0.3em',
            color: '#2ec4b6', marginBottom: '20px', opacity: 0.9 }}>
            FUTURES TRADING COMMUNITY
          </div>
          <h1 className="landing-title">THE PIT</h1>
          <p style={{ fontFamily: 'DM Sans', fontSize: 'clamp(15px, 2vw, 19px)', fontWeight: 300,
            color: '#b8b6ad', maxWidth: '560px', lineHeight: 1.7, marginBottom: '34px', letterSpacing: '0.02em' }}>
            A trading floor for your journal, strategies, backtests, live review rooms, callouts, music, and public trading identity.
          </p>
          <div className="landing-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/auth" className="btn btn-red" style={{ padding: '14px 30px', fontSize: '12px' }}>
              ENTER THE PIT
            </Link>
            <Link to="/feed" className="btn btn-green" style={{ padding: '14px 30px', fontSize: '12px' }}>
              VIEW THE FLOOR
            </Link>
          </div>
        </div>

        <div className="pit-3d-stack">
          <div className="pit-glass-card pit-glass-card-back" />
          <div className="pit-glass-card">
            <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--green)', letterSpacing: '0.16em' }}>LIVE ROOM</div>
            <h2 style={{ fontSize: '2.6rem', lineHeight: 1, marginTop: '12px' }}>VOICE. CAMERA. SCREEN.</h2>
            <div className="mini-chart">
              {Array.from({ length: 12 }).map((_, i) => <span key={i} style={{ height: `${28 + (i % 5) * 14}px`, background: i % 3 === 0 ? 'var(--red)' : 'var(--green)' }} />)}
            </div>
            <div className="landing-feature-grid">
              {['JOURNAL', 'BACKTEST', 'PFP PROFILE', 'ROOMS'].map(item => <div key={item}>{item}</div>)}
            </div>
          </div>
        </div>

        {/* bottom stats strip */}
        <div className="landing-stats-strip" style={{ position: 'fixed', bottom: 0, left: 0, right: 0,
          borderTop: '1px solid #242424', background: 'rgba(10,10,10,0.9)',
          display: 'flex', justifyContent: 'center', gap: '48px', padding: '16px 24px' }}>
          {[
            { label: 'TRACK YOUR TRADES', val: 'JOURNAL' },
            { label: 'REAL FEEDBACK', val: 'COMMUNITY' },
            { label: 'AI ROAST', val: 'PIT BOSS' },
            { label: 'LEARN TOGETHER', val: 'RESOURCES' },
          ].map(({ label, val }) => (
            <div key={val} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', letterSpacing: '0.1em', color: '#e8e8e0' }}>{val}</div>
              <div style={{ fontFamily: 'Space Mono', fontSize: '9px', letterSpacing: '0.15em', color: '#444440' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
