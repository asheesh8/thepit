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
    <div style={{ minHeight: '100vh', background: '#0a0a0a', position: 'relative', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, pointerEvents: 'none' }} />

      {/* horizontal rule lines */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 79px, #1a1a1a 79px, #1a1a1a 80px)',
        opacity: 0.4 }} />

      {/* main content */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '40px 24px', textAlign: 'center' }}>

        {/* overline */}
        <div style={{ fontFamily: 'Space Mono', fontSize: '10px', letterSpacing: '0.3em',
          color: '#e63946', marginBottom: '24px', opacity: 0.8 }}>
          FUTURES TRADING COMMUNITY
        </div>

        {/* main title */}
        <h1 style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(5rem, 18vw, 14rem)',
          letterSpacing: '0.02em', lineHeight: 0.9, color: '#f0f0e8',
          textShadow: '0 0 80px rgba(230,57,70,0.15)', marginBottom: '8px' }}>
          THE
        </h1>
        <h1 style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(5rem, 18vw, 14rem)',
          letterSpacing: '0.02em', lineHeight: 0.9,
          WebkitTextStroke: '1px #f0f0e8', color: 'transparent', marginBottom: '40px' }}>
          PIT
        </h1>

        {/* tagline */}
        <p style={{ fontFamily: 'DM Sans', fontSize: 'clamp(14px, 2vw, 18px)', fontWeight: 300,
          color: '#888880', maxWidth: '480px', lineHeight: 1.7, marginBottom: '48px', letterSpacing: '0.02em' }}>
          Log your trades. Face the truth. Get real feedback from people who've felt the same pain.
          No larping. No cope. Just the work.
        </p>

        {/* cta buttons */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/auth" className="btn btn-red" style={{ padding: '14px 36px', fontSize: '12px' }}>
            ENTER THE PIT
          </Link>
          <Link to="/feed" className="btn" style={{ padding: '14px 36px', fontSize: '12px' }}>
            VIEW THE FLOOR
          </Link>
        </div>

        {/* bottom stats strip */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0,
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
