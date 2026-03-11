import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useState, useEffect } from 'react'
import { useTheme } from '../hooks/useTheme'
import ThemeToggle from './ThemeToggle'

export default function Navbar({ session }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const { theme, toggle } = useTheme()

  useEffect(() => {
    if (!session) return
    supabase
      .from('profiles')
      .select('username')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setProfile(data))
  }, [session])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      borderBottom: '1px solid var(--border)',
      background: 'rgba(var(--black-rgb, 26,26,26), 0.95)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px', height: '56px',
      backgroundColor: 'var(--dark)',
      transition: 'background 0.2s, border-color 0.2s',
    }}>
      <Link to="/feed" style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', letterSpacing: '0.15em', color: 'var(--red)' }}>
        THE PIT
      </Link>

      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {[
          { path: '/feed', label: 'FLOOR' },
          { path: '/journal', label: 'JOURNAL' },
          { path: '/search', label: 'SEARCH' },
          { path: '/connections', label: 'CONNECTIONS' },
          { path: '/new', label: '+ LOG TRADE' },
        ].map(({ path, label }) => (
          <Link key={path} to={path} style={{
            padding: '6px 14px',
            fontFamily: 'Space Mono',
            fontSize: '10px',
            letterSpacing: '0.1em',
            color: isActive(path) ? 'var(--text)' : 'var(--dim)',
            borderBottom: isActive(path) ? '1px solid var(--red)' : '1px solid transparent',
            transition: 'all 0.15s',
          }}>
            {label}
          </Link>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {profile && (
          <Link to={`/profile/${profile.username}`} style={{
            fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--dim)',
            letterSpacing: '0.05em'
          }}>
            @{profile.username}
          </Link>
        )}
        <ThemeToggle theme={theme} toggle={toggle} />
        <button onClick={handleLogout} className="btn" style={{ padding: '6px 14px', fontSize: '10px' }}>
          EXIT
        </button>
      </div>
    </nav>
  )
}
