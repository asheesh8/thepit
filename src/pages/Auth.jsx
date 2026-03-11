import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

export default function Auth() {
  const [mode, setMode] = useState('login') // login | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (mode === 'signup') {
      // check username taken
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .single()

      if (existing) {
        setError('Username already taken')
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }

      // create profile
      await supabase.from('profiles').insert({
        id: data.user.id,
        username: username.toLowerCase(),
      })
      setMessage('Check your email to confirm your account.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }

    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* logo */}
        <Link to="/" style={{ display: 'block', textAlign: 'center', marginBottom: '48px' }}>
          <span style={{ fontFamily: 'Bebas Neue', fontSize: '2.5rem', letterSpacing: '0.15em', color: '#e63946' }}>THE PIT</span>
        </Link>

        <div className="card" style={{ padding: '40px' }}>
          {/* tabs */}
          <div style={{ display: 'flex', marginBottom: '32px', borderBottom: '1px solid #242424' }}>
            {['login', 'signup'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }} style={{
                flex: 1, padding: '10px', background: 'none', border: 'none',
                fontFamily: 'Space Mono', fontSize: '11px', letterSpacing: '0.1em',
                color: mode === m ? '#e8e8e0' : '#444440',
                borderBottom: mode === m ? '1px solid #e63946' : '1px solid transparent',
                marginBottom: '-1px', cursor: 'pointer', textTransform: 'uppercase'
              }}>
                {m === 'login' ? 'SIGN IN' : 'JOIN'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mode === 'signup' && (
              <div>
                <label style={{ fontFamily: 'Space Mono', fontSize: '10px', letterSpacing: '0.1em', color: '#888880', display: 'block', marginBottom: '8px' }}>USERNAME</label>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="your_handle"
                  required
                  style={{
                    width: '100%', background: '#111', border: '1px solid #242424',
                    padding: '12px 14px', color: '#e8e8e0', fontSize: '14px', outline: 'none',
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ fontFamily: 'Space Mono', fontSize: '10px', letterSpacing: '0.1em', color: '#888880', display: 'block', marginBottom: '8px' }}>EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%', background: '#111', border: '1px solid #242424',
                  padding: '12px 14px', color: '#e8e8e0', fontSize: '14px', outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ fontFamily: 'Space Mono', fontSize: '10px', letterSpacing: '0.1em', color: '#888880', display: 'block', marginBottom: '8px' }}>PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%', background: '#111', border: '1px solid #242424',
                  padding: '12px 14px', color: '#e8e8e0', fontSize: '14px', outline: 'none',
                }}
              />
            </div>

            {error && (
              <div style={{ fontFamily: 'Space Mono', fontSize: '11px', color: '#e63946', padding: '10px', border: '1px solid #e63946', background: 'rgba(230,57,70,0.05)' }}>
                {error}
              </div>
            )}

            {message && (
              <div style={{ fontFamily: 'Space Mono', fontSize: '11px', color: '#2ec4b6', padding: '10px', border: '1px solid #2ec4b6', background: 'rgba(46,196,182,0.05)' }}>
                {message}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-red" style={{ width: '100%', justifyContent: 'center', padding: '14px', marginTop: '8px' }}>
              {loading ? '...' : mode === 'login' ? 'ENTER THE PIT' : 'CREATE ACCOUNT'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
