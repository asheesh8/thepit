import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'

export default function Landing() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()

    // stars: small background layer
    const stars = Array.from({ length: 260 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 0.25 + Math.random() * 1.1,
      phase: Math.random() * Math.PI * 2,
      speed: 0.004 + Math.random() * 0.012,
      base: 0.25 + Math.random() * 0.65,
    }))

    // bright accent stars
    const bright = Array.from({ length: 18 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 1.6 + Math.random() * 2.2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.002 + Math.random() * 0.006,
      base: 0.55 + Math.random() * 0.45,
      // subtle color tints
      hue: Math.random() < 0.4 ? '#b8d4ff' : Math.random() < 0.5 ? '#ffd6c8' : '#ffffff',
    }))

    let t = 0
    let raf
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // faint stars
      stars.forEach(s => {
        const alpha = s.base * (0.6 + 0.4 * Math.sin(s.phase + t * s.speed))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(220,225,240,${alpha})`
        ctx.fill()
      })

      // bright stars with soft glow
      bright.forEach(s => {
        const alpha = s.base * (0.7 + 0.3 * Math.sin(s.phase + t * s.speed))
        // glow
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5)
        g.addColorStop(0, `rgba(200,220,255,${alpha * 0.35})`)
        g.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r * 5, 0, Math.PI * 2)
        ctx.fillStyle = g
        ctx.fill()
        // core
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = s.hue
        ctx.globalAlpha = alpha
        ctx.fill()
        ctx.globalAlpha = 1
      })

      t++
      raf = requestAnimationFrame(draw)
    }
    draw()

    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <div className="landing-screen" style={{ background: 'radial-gradient(ellipse at 60% 40%, #0b0d1a 0%, #03040c 60%, #010208 100%)' }}>

      {/* starfield canvas */}
      <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, pointerEvents: 'none', zIndex: 1 }} />

      {/* nebula blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
        <div style={{ position: 'absolute', top: '-8%', right: '-4%', width: '700px', height: '700px',
          background: 'radial-gradient(circle, rgba(80,50,160,0.13) 0%, transparent 68%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '-8%', width: '800px', height: '800px',
          background: 'radial-gradient(circle, rgba(46,196,182,0.055) 0%, transparent 68%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: '20%', left: '25%', width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(230,57,70,0.04) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: '55%', right: '15%', width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(120,80,200,0.07) 0%, transparent 70%)', borderRadius: '50%' }} />
      </div>

      {/* subtle space grid */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 3,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 79px, rgba(255,255,255,0.018) 79px, rgba(255,255,255,0.018) 80px)',
      }} />

      {/* main content */}
      <div className="landing-shell" style={{ position: 'relative', zIndex: 10 }}>

        <div className="landing-copy">
          <div style={{ fontFamily: 'Space Mono', fontSize: '10px', letterSpacing: '0.3em',
            color: '#2ec4b6', marginBottom: '20px', opacity: 0.85 }}>
            FUTURES TRADING COMMUNITY
          </div>
          <h1 className="landing-title" style={{ textShadow: '0 0 120px rgba(80,50,180,0.35), 0 0 60px rgba(230,57,70,0.15)' }}>
            THE PIT
          </h1>
          <p style={{ fontFamily: 'DM Sans', fontSize: 'clamp(15px, 2vw, 19px)', fontWeight: 300,
            color: '#9a9cb8', maxWidth: '520px', lineHeight: 1.75, marginBottom: '12px', letterSpacing: '0.02em' }}>
            Log your trades. Face the truth. Get real feedback from people who've felt the same pain.
          </p>
          <p style={{ fontFamily: 'Space Mono', fontSize: '10px', letterSpacing: '0.18em',
            color: '#4a4c6a', marginBottom: '36px' }}>
            ONE LIFE. ENDLESS POSSIBILITIES.
          </p>
          <div className="landing-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/auth" className="btn btn-red" style={{ padding: '14px 30px', fontSize: '12px' }}>
              ENTER THE PIT
            </Link>
            <Link to="/feed" className="btn" style={{ padding: '14px 30px', fontSize: '12px',
              borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.55)' }}>
              VIEW THE FLOOR
            </Link>
          </div>
        </div>

        <div className="pit-3d-stack">
          <div className="pit-glass-card pit-glass-card-back" style={{ borderColor: 'rgba(80,60,160,0.25)', background: 'rgba(8,9,20,0.72)' }} />
          <div className="pit-glass-card" style={{ borderColor: 'rgba(80,60,160,0.3)', background: 'linear-gradient(145deg, rgba(18,20,40,0.96), rgba(6,8,18,0.97))' }}>
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
        <div className="landing-stats-strip" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20,
          borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(3,4,12,0.92)',
          backdropFilter: 'blur(12px)',
          display: 'flex', justifyContent: 'center', gap: '48px', padding: '16px 24px' }}>
          {[
            { label: 'TRACK YOUR TRADES', val: 'JOURNAL' },
            { label: 'REAL FEEDBACK', val: 'COMMUNITY' },
            { label: 'AI ROAST', val: 'PIT BOSS' },
            { label: 'LEARN TOGETHER', val: 'RESOURCES' },
          ].map(({ label, val }) => (
            <div key={val} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', letterSpacing: '0.1em', color: 'rgba(220,222,240,0.85)' }}>{val}</div>
              <div style={{ fontFamily: 'Space Mono', fontSize: '9px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.2)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
