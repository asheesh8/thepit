import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

export default function Auth() {
  const [mode, setMode] = useState('login') // login | signup | reset
  const [identifier, setIdentifier] = useState('') // email or username for login
  const [email, setEmail] = useState('')           // email for signup + reset
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

  // full-viewport galaxy — additive blending over starfield
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

    const getCX = () => window.innerWidth * 0.32
    const getCY = () => window.innerHeight * 0.44

    const ARMS = 3

    // exponential radius distribution — dense core, arms bleeding far out
    const makeParticles = () => Array.from({ length: 700 }, (_, i) => {
      const arm = i % ARMS
      // Most particles near center, long tail extending outward
      const u = Math.random()
      const r = 8 + (-Math.log(1 - u * 0.93)) * 80
      const clampedR = Math.min(r, 500)

      const armAngle = (arm / ARMS) * Math.PI * 2
      // Looser spiral so arms spread, not coil tight
      const spiralAngle = armAngle + (clampedR / 300) * 2.4 + (Math.random() - 0.5) * (0.5 + clampedR * 0.0018)
      const speed = (0.011 / Math.sqrt(clampedR / 12)) * (0.6 + Math.random() * 0.8)

      const innerRatio = Math.max(0, 1 - clampedR / 260)
      // outer particles fade out naturally
      const baseOpacity = Math.max(0.04, (0.15 + Math.random() * 0.7) * (0.08 + innerRatio * 0.92))

      const armColors = [
        [235, 55, 70],
        [135, 38, 215],
        [22, 158, 172],
      ]
      return {
        r: clampedR, angle: spiralAngle,
        speed: speed * (Math.random() < 0.03 ? -0.25 : 1),
        size: Math.max(0.25, innerRatio * 2.4 + 0.25 + Math.random() * 0.8),
        opacity: baseOpacity,
        color: armColors[arm],
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.014 + Math.random() * 0.03,
      }
    })

    const particles = makeParticles()
    let t = 0, raf

    const draw = () => {
      const W = canvas.width
      const H = canvas.height
      const CX = getCX()
      const CY = getCY()

      // clearRect each frame — additive blending handled by lighter compositing
      ctx.clearRect(0, 0, W, H)
      // Use additive blending on canvas: overlapping particles brighten each other
      ctx.globalCompositeOperation = 'lighter'

      const rot = t * 0.0014

      // large drifting nebula clouds — much bigger and more spread out than before
      ;[
        { ox: 0,    oy: 0,    r: 200, color: [160, 35, 60],  a: 0.055 },
        { ox: 160,  oy: -90,  r: 160, color: [85,  22, 190], a: 0.05 },
        { ox: -130, oy: 110,  r: 170, color: [18, 130, 155], a: 0.04 },
        { ox: 280,  oy: 40,   r: 140, color: [200, 55, 35],  a: 0.035 },
        { ox: -240, oy: -70,  r: 150, color: [65,  28, 170], a: 0.038 },
        { ox: 80,   oy: 250,  r: 160, color: [130, 30, 70],  a: 0.03 },
        { ox: -90,  oy: -240, r: 145, color: [28, 100, 180], a: 0.03 },
        // wide bleed toward right half of screen
        { ox: 420,  oy: -60,  r: 220, color: [80, 20, 140],  a: 0.025 },
        { ox: 360,  oy: 200,  r: 200, color: [160, 40, 50],  a: 0.022 },
      ].forEach(({ ox, oy, r, color, a }) => {
        const bx = CX + ox * Math.cos(rot) - oy * Math.sin(rot)
        const by = CY + ox * Math.sin(rot) + oy * Math.cos(rot)
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, r)
        g.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${a})`)
        g.addColorStop(0.4, `rgba(${color[0]},${color[1]},${color[2]},${a * 0.3})`)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(bx, by, r, 0, Math.PI * 2)
        ctx.fill()
      })

      // warm bright core
      ;[
        { r: 55, a: 0.18, rgb: '255,190,110' },
        { r: 28, a: 0.35, rgb: '255,230,160' },
        { r: 12, a: 0.55, rgb: '255,255,210' },
      ].forEach(({ r, a, rgb }) => {
        const g = ctx.createRadialGradient(CX, CY, 0, CX, CY, r)
        g.addColorStop(0, `rgba(${rgb},${a})`)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(CX, CY, r, 0, Math.PI * 2)
        ctx.fill()
      })

      // particles — lighter compositing makes dense regions bright naturally
      particles.forEach(p => {
        p.angle += p.speed
        p.twinkle += p.twinkleSpeed
        const x = CX + Math.cos(p.angle) * p.r
        const y = CY + Math.sin(p.angle) * p.r
        const tw = 0.75 + 0.25 * Math.sin(p.twinkle)
        const [r2, g2, b2] = p.color
        const op = p.opacity * tw

        // soft glow halo — larger halo on bigger particles
        const haloR = p.size * (p.r < 80 ? 6 : 4)
        const halo = ctx.createRadialGradient(x, y, 0, x, y, haloR)
        halo.addColorStop(0, `rgba(${r2},${g2},${b2},${op * 0.5})`)
        halo.addColorStop(1, 'transparent')
        ctx.fillStyle = halo
        ctx.beginPath()
        ctx.arc(x, y, haloR, 0, Math.PI * 2)
        ctx.fill()

        ctx.beginPath()
        ctx.arc(x, y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r2},${g2},${b2},${op})`
        ctx.fill()
      })

      ctx.globalCompositeOperation = 'source-over'

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

    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/settings`,
      })
      if (error) setError(error.message)
      else setMessage('Check your email for a password reset link.')
      setLoading(false)
      return
    }

    if (mode === 'signup') {
      const { data: existing } = await supabase
        .from('profiles').select('id').eq('username', username.toLowerCase()).single()
      if (existing) { setError('Username already taken'); setLoading(false); return }

      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }

      await supabase.from('profiles').insert({ id: data.user.id, username: username.toLowerCase(), email })
      setMessage('Check your email to confirm your account.')
      setLoading(false)
      return
    }

    // login — resolve username → email if needed
    let loginEmail = identifier.trim()
    if (!loginEmail.includes('@')) {
      const { data: prof } = await supabase
        .from('profiles').select('email').eq('username', loginEmail.toLowerCase()).single()
      if (!prof?.email) {
        setError('Username not found or this account was created before username login was supported. Try your email address.')
        setLoading(false)
        return
      }
      loginEmail = prof.email
    }

    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  const labelStyle = { fontFamily: 'Space Mono', fontSize: '9px', letterSpacing: '0.12em', color: 'var(--dim)', display: 'block', marginBottom: '8px' }
  const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '13px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box' }

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

          <svg viewBox="0 0 64 64" width="90" height="90" style={{ filter: 'drop-shadow(0 0 18px rgba(230,57,70,0.55))', display: 'block' }}>
            <rect x="0" y="0" width="64" height="64" fill="#e63946"/>
            <polygon points="7,5 57,6 59,58 5,59" fill="#b82030"/>
            <polygon points="13,12 51,13 52,51 12,52" fill="#8c1828"/>
            <polygon points="19,18 45,19 46,45 18,46" fill="#620f1c"/>
            <polygon points="24,24 40,25 41,40 23,41" fill="#3e0813"/>
            <polygon points="28,28 36,29 36,36 27,37" fill="#010208"/>
          </svg>

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
          {mode !== 'reset' && (
            <div style={{ display: 'flex', marginBottom: '32px', borderBottom: '1px solid var(--border)' }}>
              {['login', 'signup'].map(m => (
                <button key={m} onClick={() => { setMode(m); setError(''); setMessage('') }} style={{
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
          )}

          {/* reset password view */}
          {mode === 'reset' && (
            <div style={{ marginBottom: '28px' }}>
              <button onClick={() => { setMode('login'); setError(''); setMessage('') }} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', letterSpacing: '0.1em', padding: 0, marginBottom: '20px', display: 'block',
              }}>← BACK TO SIGN IN</button>
              <div style={{ fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--text)', letterSpacing: '0.1em', marginBottom: '6px' }}>RESET PASSWORD</div>
              <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', lineHeight: 1.6 }}>Enter your email and we'll send you a reset link.</div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* signup username */}
            {mode === 'signup' && (
              <div>
                <label style={labelStyle}>USERNAME</label>
                <input value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="your_handle" required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'rgba(230,57,70,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
            )}

            {/* login: email or username */}
            {mode === 'login' && (
              <div>
                <label style={labelStyle}>EMAIL OR USERNAME</label>
                <input value={identifier} onChange={e => setIdentifier(e.target.value)}
                  placeholder="you@email.com or your_handle" required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'rgba(230,57,70,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
            )}

            {/* signup + reset: email */}
            {(mode === 'signup' || mode === 'reset') && (
              <div>
                <label style={labelStyle}>EMAIL</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'rgba(230,57,70,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
            )}

            {/* password — login + signup only */}
            {mode !== 'reset' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>PASSWORD</label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => { setMode('reset'); setError(''); setMessage('') }} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--dim)', letterSpacing: '0.08em', padding: 0,
                    }}>FORGOT?</button>
                  )}
                </div>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'rgba(230,57,70,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
            )}

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
              {loading ? '...' : mode === 'login' ? 'ENTER THE PIT' : mode === 'signup' ? 'CREATE ACCOUNT' : 'SEND RESET LINK'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
