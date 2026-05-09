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
  const logoRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    // origin = center of the pit logo
    const getOrigin = () => {
      if (logoRef.current) {
        const r = logoRef.current.getBoundingClientRect()
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      }
      return { x: window.innerWidth * 0.28, y: window.innerHeight * 0.44 }
    }

    const COLORS = [
      [230, 57, 70],   // red
      [180, 32, 50],   // deep red
      [140, 24, 80],   // dark magenta
      [100, 20, 180],  // purple
      [255, 180, 100], // warm gold
      [255, 230, 180], // near white
    ]

    const spawn = (ox, oy) => {
      const angle = Math.random() * Math.PI * 2
      const speed = 0.3 + Math.pow(Math.random(), 2) * 2.8
      const color = COLORS[Math.floor(Math.random() * COLORS.length)]
      return {
        x: ox + (Math.random() - 0.5) * 8,
        y: oy + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 120 + Math.random() * 200,
        size: 0.4 + Math.random() * 1.4,
        color,
        haloScale: 4 + Math.random() * 8,
      }
    }

    const { x: ox, y: oy } = getOrigin()
    const particles = Array.from({ length: 500 }, () => {
      const p = spawn(ox, oy)
      // stagger initial life so they don't all burst at once
      p.life = Math.random() * p.maxLife
      p.x = ox + Math.cos(Math.random() * Math.PI * 2) * Math.random() * 300
      p.y = oy + Math.sin(Math.random() * Math.PI * 2) * Math.random() * 200
      return p
    })

    let raf
    const draw = () => {
      const W = canvas.width
      const H = canvas.height
      const { x: cx, y: cy } = getOrigin()

      // trail fade — low alpha fill instead of clearRect creates glowing streaks
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = 'rgba(3,4,12,0.18)'
      ctx.fillRect(0, 0, W, H)

      ctx.globalCompositeOperation = 'lighter'

      // warm glow at logo origin
      ;[
        { r: 80, a: 0.06, rgb: '230,57,70' },
        { r: 40, a: 0.12, rgb: '255,140,80' },
        { r: 18, a: 0.22, rgb: '255,210,140' },
      ].forEach(({ r, a, rgb }) => {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
        g.addColorStop(0, `rgba(${rgb},${a})`)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
      })

      particles.forEach(p => {
        p.life++
        if (p.life >= p.maxLife || p.x < -60 || p.x > W + 60 || p.y < -60 || p.y > H + 60) {
          Object.assign(p, spawn(cx, cy))
          return
        }

        // drag: slow down over time, slight upward drift for nebula feel
        p.vx *= 0.992
        p.vy *= 0.992
        p.vy -= 0.004
        p.x += p.vx
        p.y += p.vy

        const lifeRatio = p.life / p.maxLife
        // fade in then out
        const alpha = Math.sin(lifeRatio * Math.PI) * (0.5 + Math.random() * 0.5)
        const [r, g, b] = p.color

        // glow halo
        const hr = p.size * p.haloScale
        const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, hr)
        halo.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.4})`)
        halo.addColorStop(1, 'transparent')
        ctx.fillStyle = halo
        ctx.beginPath(); ctx.arc(p.x, p.y, hr, 0, Math.PI * 2); ctx.fill()

        // core point
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
        ctx.fill()
      })

      ctx.globalCompositeOperation = 'source-over'
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
      background: '#03040c',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden',
    }}>
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '920px',
        display: 'grid', gridTemplateColumns: '1fr 400px', gap: '64px', alignItems: 'center' }}>

        {/* left side — brand */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <Link to="/" style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', letterSpacing: '0.15em', color: 'var(--red)', display: 'inline-block' }}>
            ← THE PIT
          </Link>

          <svg ref={logoRef} viewBox="0 0 64 64" width="90" height="90" style={{ filter: 'drop-shadow(0 0 22px rgba(230,57,70,0.7))', display: 'block' }}>
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
