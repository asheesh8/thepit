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
      base: 0.2 + Math.random() * 0.6,
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

          {/* star orb */}
          <div style={{
            width: '220px', height: '220px', borderRadius: '50%',
            border: '1px solid rgba(80,50,160,0.4)',
            background: 'radial-gradient(circle at 35% 35%, rgba(80,50,160,0.25), rgba(3,4,12,0.95))',
            boxShadow: '0 0 60px rgba(80,50,160,0.2), 0 0 120px rgba(230,57,70,0.08), inset 0 0 40px rgba(80,50,160,0.1)',
            display: 'grid', placeItems: 'center', position: 'relative',
          }}>
            {/* orbit ring */}
            <div style={{
              position: 'absolute', inset: '16px', borderRadius: '50%',
              border: '1px solid rgba(230,57,70,0.2)',
            }} />
            <div style={{
              fontFamily: 'Bebas Neue', fontSize: '3rem', color: 'var(--red)',
              letterSpacing: '0.1em', textShadow: '0 0 30px rgba(230,57,70,0.5)',
            }}>PIT</div>
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
