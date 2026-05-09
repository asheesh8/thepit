import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'

export default function Landing() {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  // Live candlestick chart
  useEffect(() => {
    const canvas = chartRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const setup = () => {
      const rect = canvas.parentElement.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
    }
    setup()

    const CANDLE_W = 7
    const GAP = 5
    const STEP = CANDLE_W + GAP
    const PAD = 10

    let W = canvas.width
    let H = canvas.height
    let MAX = Math.ceil(W / STEP) + 2

    let price = 4380
    let momentum = 0

    const makeCandle = () => {
      momentum = momentum * 0.78 + (Math.random() - 0.47) * 6
      const open = price
      const close = open + momentum + (Math.random() - 0.5) * 8
      const high = Math.max(open, close) + Math.random() * 6
      const low = Math.min(open, close) - Math.random() * 6
      price = close
      return { open, close, high, low }
    }

    let candles = Array.from({ length: MAX }, makeCandle)
    let scrollX = 0
    const SPEED = 0.5
    let raf

    const draw = () => {
      W = canvas.width
      H = canvas.height

      ctx.clearRect(0, 0, W, H)

      // subtle grid lines
      ctx.strokeStyle = 'rgba(46,196,182,0.06)'
      ctx.lineWidth = 1
      for (let row = 1; row < 4; row++) {
        const y = Math.round((H / 4) * row) + 0.5
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
        ctx.stroke()
      }

      const highs = candles.map(c => c.high)
      const lows = candles.map(c => c.low)
      const maxP = Math.max(...highs)
      const minP = Math.min(...lows)
      const range = maxP - minP || 1
      const toY = p => PAD + ((maxP - p) / range) * (H - PAD * 2)

      ctx.save()
      ctx.translate(-scrollX, 0)

      // draw price line connecting closes
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(46,196,182,0.18)'
      ctx.lineWidth = 1
      candles.forEach((c, i) => {
        const x = i * STEP + STEP / 2
        if (i === 0) ctx.moveTo(x, toY(c.close))
        else ctx.lineTo(x, toY(c.close))
      })
      ctx.stroke()

      candles.forEach((c, i) => {
        const x = i * STEP + STEP / 2
        const bull = c.close >= c.open
        const color = bull ? '#2ec4b6' : '#e63946'

        // wick
        ctx.strokeStyle = bull ? 'rgba(46,196,182,0.7)' : 'rgba(230,57,70,0.7)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, toY(c.high))
        ctx.lineTo(x, toY(c.low))
        ctx.stroke()

        // body
        const bTop = toY(Math.max(c.open, c.close))
        const bBot = toY(Math.min(c.open, c.close))
        const bH = Math.max(bBot - bTop, 1.5)
        ctx.fillStyle = color
        ctx.fillRect(x - CANDLE_W / 2, bTop, CANDLE_W, bH)

        // inner highlight on bullish candles
        if (bull && bH > 4) {
          ctx.fillStyle = 'rgba(255,255,255,0.12)'
          ctx.fillRect(x - CANDLE_W / 2 + 1, bTop + 1, CANDLE_W - 2, Math.min(bH - 2, 4))
        }
      })

      ctx.restore()

      // right-side fade mask
      const fade = ctx.createLinearGradient(W - 28, 0, W, 0)
      fade.addColorStop(0, 'transparent')
      fade.addColorStop(1, '#04090a')
      ctx.fillStyle = fade
      ctx.fillRect(W - 28, 0, 28, H)

      // left-side fade
      const fadeL = ctx.createLinearGradient(0, 0, 20, 0)
      fadeL.addColorStop(0, '#04090a')
      fadeL.addColorStop(1, 'transparent')
      ctx.fillStyle = fadeL
      ctx.fillRect(0, 0, 20, H)

      // current price label
      const lastClose = candles[candles.length - 1].close
      const lastY = toY(lastClose) - scrollX / STEP  // approx
      const labelY = Math.max(PAD + 10, Math.min(H - PAD - 4, toY(lastClose)))
      ctx.fillStyle = 'rgba(46,196,182,0.9)'
      ctx.font = '8px "Space Mono", monospace'
      ctx.textAlign = 'right'
      ctx.fillText(lastClose.toFixed(0), W - 6, labelY + 3)
    }

    const animate = () => {
      scrollX += SPEED
      if (scrollX >= STEP) {
        scrollX -= STEP
        candles.push(makeCandle())
        candles.shift()
      }
      draw()
      raf = requestAnimationFrame(animate)
    }
    animate()

    return () => cancelAnimationFrame(raf)
  }, [])

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
              <canvas ref={chartRef} style={{ display: 'block', width: '100%', height: '100%' }} />
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
