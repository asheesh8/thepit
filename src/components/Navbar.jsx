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
    { path: '/rooms', label: 'DMs' },
    { path: '/new', label: '+ LOG TRADE' },
  ]
  const moreLinks = [
    { path: '/journal', label: 'JOURNAL' },
    { path: '/strategies', label: 'STRATEGIES' },
    { path: '/backtesting', label: 'BACKTEST' },
    { path: '/review', label: 'REVIEW' },
    { path: '/connections', label: 'CONNECTIONS' },
    { path: '/settings', label: 'SETTINGS' },
  ]
  const moreActive = moreLinks.some(link => isActive(link.path))

  return (
    <nav className="app-nav">
      <Link to="/feed" className="app-nav-brand">
        THE PIT
      </Link>

      <div className="app-nav-links">
        {primaryLinks.map(({ path, label }) => (
          <Link key={path} to={path} className={`app-nav-link ${isActive(path) ? 'active' : ''}`}>
            {label}
          </Link>
        ))}
        <div className="app-nav-more-wrap">
          <button
            onClick={() => setShowMore(prev => !prev)}
            className={`app-nav-link app-nav-more ${moreActive ? 'active' : ''}`}
          >
            MORE
          </button>
          {showMore && (
            <div className="app-nav-menu">
              {moreLinks.map(({ path, label }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setShowMore(false)}
                  className={`app-nav-menu-link ${isActive(path) ? 'active' : ''}`}
                >
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="app-nav-user">
        {profile && (
          <Link to={`/profile/${profile.username}`} className="app-nav-profile">
            <span
              className="app-nav-avatar"
              style={{ background: profile.avatar_url ? `url(${profile.avatar_url}) center/cover` : 'var(--black)' }}
            >
              {!profile.avatar_url && profile.username?.slice(0, 1).toUpperCase()}
            </span>
            <span className="app-nav-profile-name">@{profile.username}</span>
          </Link>
        )}
        <ThemeToggle theme={theme} toggle={toggle} />
        <button onClick={handleLogout} className="btn app-nav-exit">
          EXIT
        </button>
      </div>
    </nav>
  )
}
