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
  const profilePath = profile?.username ? `/profile/${profile.username}` : '/settings'
  const primaryLinks = [
    { path: '/feed', label: 'FLOOR' },
    { path: '/rooms', label: 'DMs' },
    { path: '/new', label: '+ LOG TRADE' },
    { path: profilePath, label: 'PROFILE', mobileOnly: true },
  ]
  const moreLinks = [
    { path: '/journal', label: 'JOURNAL' },
    { path: '/strategies', label: 'STRATEGIES' },
    { path: '/backtesting', label: 'BACKTEST' },
    { path: '/review', label: 'REVIEW' },
    { path: '/vault', label: 'VAULT' },
    { path: '/connections', label: 'CONNECTIONS' },
    { path: '/settings', label: 'SETTINGS' },
  ]
  const moreActive = moreLinks.some(link => isActive(link.path))

  return (
    <nav className="app-nav">
      <Link to="/feed" className="app-nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        <svg width="22" height="22" viewBox="0 0 64 64" fill="none" style={{ flexShrink: 0 }}>
          <rect x="0" y="0" width="64" height="64" fill="#e63946"/>
          <polygon points="7,5 57,6 59,58 5,59" fill="#b82030"/>
          <polygon points="13,12 51,13 52,51 12,52" fill="#8c1828"/>
          <polygon points="19,18 45,19 46,45 18,46" fill="#620f1c"/>
          <polygon points="24,24 40,25 41,40 23,41" fill="#3e0813"/>
          <polygon points="28,28 36,29 36,36 27,37" fill="#010208"/>
        </svg>
        THE PIT
      </Link>

      <div className="app-nav-links">
        {primaryLinks.map(({ path, label, mobileOnly }) => (
          <Link key={`${path}-${label}`} to={path} className={`app-nav-link ${mobileOnly ? 'app-nav-mobile-profile' : ''} ${isActive(path) ? 'active' : ''}`}>
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
