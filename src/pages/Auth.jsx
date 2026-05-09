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

  // galaxy ooze around pit mark
  useEffect(() => {
    const canvas = galaxyRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const S = 560
    canvas.width = S
    canvas.height = S
    const CX = S / 2
    const CY = S / 2

    // particles in 3 spiral arms
    const particles = Array.from({ length: 320 }, (_, i) => {
      const arm = i % 3
      const baseAngle = (arm / 3) * Math.PI * 2
      const radius = 95 + Math.random() * 185
      const spiralOffset = (radius - 95) * 0.018
      return {
        arm,
        angle: baseAngle + spiralOffset + Math.random() * 0.6,
        radius,
        speed: (0.0006 + Math.random() * 0.001) * (Math.random() < 0.5 ? 1 : -0.3),
        size: 0.4 + Math.random() * 1.8,
        opacity: 0.2 + Math.random() * 0.7,
        color: Math.random() < 0.45
          ? [230, 60, 90]
          : Math.random() < 0.55
            ? [160, 60, 210]
            : [46, 190, 182],
        drift: (Math.random() - 0.5) * 0.0004,
      }
    })

    let t = 0, raf

    const draw = () => {
      ctx.clearRect(0, 0, S, S)

      // outer ambient glow layers (slow rotation)
      const rot = t * 0.0025
      ;[
        { r: 240, clr: [80, 30, 160], a: 0.09 },
        { r: 180, clr: [230, 50, 80], a: 0.08 },
        { r: 130, clr: [46, 150, 182], a: 0.055 },
      ].forEach(({ r, clr, a }) => {
        for (let arm = 0; arm < 3; arm++) {
          const ang = rot + (arm / 3) * Math.PI * 2
          const bx = CX + Math.cos(ang) * r * 0.55
          const by = CY + Math.sin(ang) * r * 0.55
          const g = ctx.createRadialGradient(bx, by, 0, bx, by, r)
          g.addColorStop(0, `rgba(${clr[0]},${clr[1]},${clr[2]},${a})`)
          g.addColorStop(1, 'transparent')
          ctx.fillStyle = g
          ctx.beginPath()
          ctx.arc(bx, by, r, 0, Math.PI * 2)
          ctx.fill()
        }
      })

      // draw particles
      particles.forEach(p => {
        p.angle += p.speed
        p.radius += p.drift
        if (p.radius < 90) p.radius = 90
        if (p.radius > 280) p.radius = 95

        const x = CX + Math.cos(p.angle) * p.radius
        const y = CY + Math.sin(p.angle) * p.radius
        const fade = Math.max(0, Math.min(1, (p.radius - 90) / 40))
        const [r, g, b] = p.color

        // glow halo
        if (p.size > 1) {
          const glow = ctx.createRadialGradient(x, y, 0, x, y, p.size * 4)
          glow.addColorStop(0, `rgba(${r},${g},${b},${p.opacity * fade * 0.4})`)
          glow.addColorStop(1, 'transparent')
          ctx.fillStyle = glow
          ctx.beginPath()
          ctx.arc(x, y, p.size * 4, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(x, y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${p.opacity * fade})`
        ctx.fill()
      })

      // center dark fade so pit mark stays crisp
      const fade = ctx.createRadialGradient(CX, CY, 0, CX, CY, 105)
      fade.addColorStop(0, 'rgba(3,4,12,1)')
      fade.addColorStop(0.6, 'rgba(3,4,12,0.7)')
      fade.addColorStop(1, 'rgba(3,4,12,0)')
      ctx.fillStyle = fade
      ctx.fillRect(0, 0, S, S)

      // outer edge vignette
      const vignette = ctx.createRadialGradient(CX, CY, S * 0.38, CX, CY, S * 0.5)
      vignette.addColorStop(0, 'transparent')
      vignette.addColorStop(1, 'rgba(3,4,12,0.75)')
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, S, S)

      t++
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
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

      {/* nebula blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(80,50,160,0.1) 0%, transparent 65%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-15%', right: '-5%', width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(46,196,182,0.06) 0%, transparent 65%)', borderRadius: '50%' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '920px',
        display: 'grid', gridTemplateColumns: '1fr 400px', gap: '64px', alignItems: 'center' }}>

        {/* left side — brand */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <Link to="/" style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', letterSpacing: '0.15em', color: 'var(--red)', display: 'inline-block' }}>
            ← THE PIT
          </Link>

          {/* galaxy pit mark */}
          <div style={{ position: 'relative', width: '300px', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* galaxy canvas behind */}
            <canvas ref={galaxyRef} style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 0,
              width: '560px',
              height: '560px',
            }} />
            {/* pit mark on top */}
            <svg viewBox="0 0 64 64" width="190" height="190" style={{ position: 'relative', zIndex: 1 }}>
              <rect x="0" y="0" width="64" height="64" fill="#e63946"/>
              <polygon points="7,5 57,6 59,58 5,59" fill="#b82030"/>
              <polygon points="13,12 51,13 52,51 12,52" fill="#8c1828"/>
              <polygon points="19,18 45,19 46,45 18,46" fill="#620f1c"/>
              <polygon points="24,24 40,25 41,40 23,41" fill="#3e0813"/>
              <polygon points="28,28 36,29 36,36 27,37" fill="#010208"/>
            </svg>
          </div>

          <div>
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
