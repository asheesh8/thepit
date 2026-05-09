import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const canvasRef = useRef(null)
  const galaxyRef = useRef(null)

  // starfield background
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 0.2 + Math.random() * 1.0,
      phase: Math.random() * Math.PI * 2,
      speed: 0.004 + Math.random() * 0.01,
      base: 0.15 + Math.random() * 0.45,
    }))
    let t = 0, raf
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      stars.forEach(s => {
        const a = s.base * (0.6 + 0.4 * Math.sin(s.phase + t * s.speed))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(210,218,240,${a})`
        ctx.fill()
      })
      t++
      raf = requestAnimationFrame(draw)
    }
    draw()
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  // full-viewport galaxy (blends additively over starfield via mix-blend-mode:screen)
  useEffect(() => {
    const canvas = galaxyRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // galaxy center: left-center of screen
    const getCX = () => window.innerWidth * 0.33
    const getCY = () => window.innerHeight * 0.46

    const ARMS = 3
    const MAX_R = 260

    const makeParticles = () => Array.from({ length: 550 }, (_, i) => {
      const arm = i % ARMS
      const t = Math.pow(Math.random(), 0.55)
      const r = 12 + t * MAX_R
      const armAngle = (arm / ARMS) * Math.PI * 2
      const spiralAngle = armAngle + (r / MAX_R) * 3.2 + (Math.random() - 0.5) * 0.55
      const speed = (0.014 / Math.sqrt(r / 14)) * (0.75 + Math.random() * 0.5)
      const innerRatio = 1 - r / MAX_R
      const colors = [
        [235 - innerRatio * 20, 55 + innerRatio * 55, 65 + innerRatio * 20],
        [140 + innerRatio * 30, 35 + innerRatio * 30, 215 - innerRatio * 20],
        [25 + innerRatio * 20, 155 + innerRatio * 65, 175 + innerRatio * 30],
      ]
      return {
        r, angle: spiralAngle,
        speed: speed * (Math.random() < 0.04 ? -0.3 : 1),
        size: Math.max(0.3, innerRatio * 2.2 + 0.3 + Math.random() * 0.9),
        opacity: 0.25 + Math.random() * 0.65,
        color: colors[arm],
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.018 + Math.random() * 0.038,
      }
    })

    let particles = makeParticles()
    let t = 0, raf

    const draw = () => {
      const W = canvas.width
      const H = canvas.height
      const CX = getCX()
      const CY = getCY()

      // fade existing canvas pixels (trail effect on transparent canvas)
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = 'rgba(0,0,0,0.048)'
      ctx.fillRect(0, 0, W, H)
      ctx.globalCompositeOperation = 'source-over'

      const rot = t * 0.0018

      // rotating nebula blob clouds
      ;[
        { ox: 0,    oy: 0,   r: 120, color: [200, 45, 70],  a: 0.07 },
        { ox: 75,  oy: -55,  r: 95,  color: [100, 28, 215], a: 0.065 },
        { ox: -65, oy: 60,   r: 100, color: [25, 155, 175], a: 0.05 },
        { ox: 130, oy: 20,   r: 75,  color: [230, 75, 45],  a: 0.045 },
        { ox: -115,oy: -35,  r: 85,  color: [80, 35, 195],  a: 0.045 },
        { ox: 40,  oy: 140,  r: 90,  color: [160, 40, 80],  a: 0.038 },
        { ox: -50, oy: -130, r: 80,  color: [35, 120, 200], a: 0.035 },
      ].forEach(({ ox, oy, r, color, a }) => {
        const bx = CX + ox * Math.cos(rot) - oy * Math.sin(rot)
        const by = CY + ox * Math.sin(rot) + oy * Math.cos(rot)
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, r)
        g.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${a})`)
        g.addColorStop(0.5, `rgba(${color[0]},${color[1]},${color[2]},${a * 0.4})`)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(bx, by, r, 0, Math.PI * 2)
        ctx.fill()
      })

      // warm galactic core
      ;[
        { r: 38, color: 'rgba(255,200,130,0.38)' },
        { r: 22, color: 'rgba(255,240,180,0.55)' },
        { r: 10, color: 'rgba(255,255,220,0.7)' },
      ].forEach(({ r, color }) => {
        const g = ctx.createRadialGradient(CX, CY, 0, CX, CY, r)
        g.addColorStop(0, color)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(CX, CY, r, 0, Math.PI * 2)
        ctx.fill()
      })

      // particles
      particles.forEach(p => {
        p.angle += p.speed
        p.twinkle += p.twinkleSpeed
        const x = CX + Math.cos(p.angle) * p.r
        const y = CY + Math.sin(p.angle) * p.r
        const tw = 0.72 + 0.28 * Math.sin(p.twinkle)
        const [r2, g2, b2] = p.color
        const op = p.opacity * tw

        // glow halo on larger particles
        if (p.size > 0.9) {
          const halo = ctx.createRadialGradient(x, y, 0, x, y, p.size * 4)
          halo.addColorStop(0, `rgba(${r2},${g2},${b2},${op * 0.45})`)
          halo.addColorStop(1, 'transparent')
          ctx.fillStyle = halo
          ctx.beginPath()
          ctx.arc(x, y, p.size * 4, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(x, y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r2},${g2},${b2},${op})`
        ctx.fill()
      })

      t++
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (mode === 'signup') {
      const { data: existing } = await supabase
        .from('profiles').select('id').eq('username', username.toLowerCase()).single()
      if (existing) { setError('Username already taken'); setLoading(false); return }

      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }

      await supabase.from('profiles').insert({ id: data.user.id, username: username.toLowerCase() })
      setMessage('Check your email to confirm your account.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 30%, rgba(230,57,70,0.14) 0%, transparent 40%), radial-gradient(ellipse at 80% 70%, rgba(46,196,182,0.08) 0%, transparent 40%), #03040c',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden',
    }}>
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
      <canvas ref={galaxyRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 2, mixBlendMode: 'screen' }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '920px',
        display: 'grid', gridTemplateColumns: '1fr 400px', gap: '64px', alignItems: 'center' }}>

        {/* left side — brand */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <Link to="/" style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', letterSpacing: '0.15em', color: 'var(--red)', display: 'inline-block' }}>
            ← THE PIT
          </Link>

          <div style={{ marginTop: '8px' }}>
            <h1 style={{ fontSize: 'clamp(2.8rem, 5vw, 4.2rem)', lineHeight: 0.92, marginBottom: '16px',
              textShadow: '0 0 80px rgba(80,50,160,0.3)' }}>
              GET YOUR<br />TRADING FLOOR.
            </h1>
            <p style={{ color: 'var(--dim)', lineHeight: 1.7, maxWidth: '400px', fontSize: '14px' }}>
              Journal, strategies, live review rooms, backtesting, and a public trading identity — all in one place.
            </p>
          </div>

          <div style={{ fontFamily: 'Space Mono', fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.2)' }}>
            ONE LIFE. ENDLESS POSSIBILITIES.
          </div>
        </div>

        {/* right side — form */}
        <div style={{
          background: 'rgba(8,10,22,0.85)',
          border: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
          padding: '36px',
          boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
        }}>
          {/* tabs */}
          <div style={{ display: 'flex', marginBottom: '32px', borderBottom: '1px solid var(--border)' }}>
            {['login', 'signup'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }} style={{
                flex: 1, padding: '10px', background: 'none', border: 'none',
                fontFamily: 'Space Mono', fontSize: '11px', letterSpacing: '0.1em',
                color: mode === m ? 'var(--text)' : 'var(--dim)',
                borderBottom: mode === m ? '1px solid var(--red)' : '1px solid transparent',
                marginBottom: '-1px', cursor: 'pointer',
              }}>
                {m === 'login' ? 'SIGN IN' : 'JOIN'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {mode === 'signup' && (
              <div>
                <label style={{ fontFamily: 'Space Mono', fontSize: '9px', letterSpacing: '0.12em', color: 'var(--dim)', display: 'block', marginBottom: '8px' }}>
                  USERNAME
                </label>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="your_handle"
                  required
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    padding: '13px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(230,57,70,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
            )}

            <div>
              <label style={{ fontFamily: 'Space Mono', fontSize: '9px', letterSpacing: '0.12em', color: 'var(--dim)', display: 'block', marginBottom: '8px' }}>
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  padding: '13px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(230,57,70,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            <div>
              <label style={{ fontFamily: 'Space Mono', fontSize: '9px', letterSpacing: '0.12em', color: 'var(--dim)', display: 'block', marginBottom: '8px' }}>
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  padding: '13px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(230,57,70,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            {error && (
              <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--red)', padding: '10px 12px',
                border: '1px solid rgba(230,57,70,0.3)', background: 'rgba(230,57,70,0.06)' }}>
                {error}
              </div>
            )}
            {message && (
              <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--green)', padding: '10px 12px',
                border: '1px solid rgba(46,196,182,0.3)', background: 'rgba(46,196,182,0.06)' }}>
                {message}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px', marginTop: '4px',
              background: loading ? 'rgba(230,57,70,0.3)' : 'var(--red)',
              border: 'none', color: '#fff', fontFamily: 'Space Mono',
              fontSize: '11px', letterSpacing: '0.12em', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.15s',
            }}>
              {loading ? '...' : mode === 'login' ? 'ENTER THE PIT' : 'CREATE ACCOUNT'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
