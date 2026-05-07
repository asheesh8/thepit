import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useState, useEffect } from 'react'
import { useTheme } from '../hooks/useTheme'
import ThemeToggle from './ThemeToggle'

export default function Navbar({ session }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [showMore, setShowMore] = useState(false)
  const { theme, toggle } = useTheme()

  useEffect(() => {
    if (!session) return
    supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setProfile(data))
  }, [session])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path
  const primaryLinks = [
    { path: '/feed', label: 'FLOOR' },
    { path: '/rooms', label: 'ROOMS' },
    { path: '/new', label: '+ LOG TRADE' },
  ]
  const moreLinks = [
    { path: '/journal', label: 'JOURNAL' },
    { path: '/strategies', label: 'STRATEGIES' },
    { path: '/backtesting', label: 'BACKTEST' },
    { path: '/calendar', label: 'CALENDAR' },
    { path: '/review', label: 'REVIEW' },
    { path: '/search', label: 'SEARCH' },
    { path: '/connections', label: 'CONNECTIONS' },
  ]
  const moreActive = moreLinks.some(link => isActive(link.path))

  const navLinkStyle = (active) => ({
    padding: '6px 14px',
    fontFamily: 'Space Mono',
    fontSize: '10px',
    letterSpacing: '0.1em',
    color: active ? 'var(--text)' : 'var(--dim)',
    borderBottom: active ? '1px solid var(--red)' : '1px solid transparent',
    transition: 'all 0.15s',
  })

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
        {primaryLinks.map(({ path, label }) => (
          <Link key={path} to={path} style={navLinkStyle(isActive(path))}>
            {label}
          </Link>
        ))}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMore(prev => !prev)}
            style={{
              ...navLinkStyle(moreActive),
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
            }}
          >
            MORE
          </button>
          {showMore && (
            <div style={{
              position: 'absolute',
              top: '32px',
              right: 0,
              minWidth: '180px',
              background: 'var(--dark)',
              border: '1px solid var(--border)',
              padding: '8px',
              zIndex: 200,
              boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
            }}>
              {moreLinks.map(({ path, label }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setShowMore(false)}
                  style={{
                    display: 'block',
                    padding: '10px 12px',
                    fontFamily: 'Space Mono',
                    fontSize: '10px',
                    letterSpacing: '0.1em',
                    color: isActive(path) ? 'var(--red)' : 'var(--dim)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {profile && (
          <Link to={`/profile/${profile.username}`} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--dim)',
            letterSpacing: '0.05em'
          }}>
            <span style={{
              width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--border)',
              background: profile.avatar_url ? `url(${profile.avatar_url}) center/cover` : 'var(--black)',
              color: 'var(--red)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px'
            }}>
              {!profile.avatar_url && profile.username?.slice(0, 1).toUpperCase()}
            </span>
            <span>@{profile.username}</span>
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
