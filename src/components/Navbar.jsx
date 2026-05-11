import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useState, useEffect } from 'react'
import { useTheme } from '../hooks/useTheme'
import ThemeToggle from './ThemeToggle'

const PitLogo = () => (
  <svg width="22" height="22" viewBox="0 0 64 64" fill="none" style={{ flexShrink: 0 }}>
    <rect x="0" y="0" width="64" height="64" fill="#e63946"/>
    <polygon points="7,5 57,6 59,58 5,59" fill="#b82030"/>
    <polygon points="13,12 51,13 52,51 12,52" fill="#8c1828"/>
    <polygon points="19,18 45,19 46,45 18,46" fill="#620f1c"/>
    <polygon points="24,24 40,25 41,40 23,41" fill="#3e0813"/>
    <polygon points="28,28 36,29 36,36 27,37" fill="#010208"/>
  </svg>
)

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

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  const profilePath = profile?.username ? `/profile/${profile.username}` : '/settings'

  const desktopLinks = [
    { path: '/feed', label: 'FLOOR' },
    { path: '/rooms', label: 'DMs' },
    { path: '/new', label: '+ LOG TRADE' },
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

  const bottomTabs = [
    { path: '/feed', label: 'FLOOR', icon: FloorIcon },
    { path: '/rooms', label: 'DMs', icon: DmsIcon },
    { path: '/new', label: 'LOG', icon: null, isAction: true },
    { path: '/journal', label: 'JOURNAL', icon: JournalIcon },
    { path: profilePath, label: 'PROFILE', icon: null, isProfile: true },
  ]

  const moreActive = moreLinks.some(link => isActive(link.path))

  return (
    <>
      {/* ── Desktop / top nav ── */}
      <nav className="app-nav">
        <Link to="/feed" className="app-nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <PitLogo />
          THE PIT
        </Link>

        {/* desktop links — hidden on mobile via CSS */}
        <div className="app-nav-links">
          {desktopLinks.map(({ path, label }) => (
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
            <Link to={profilePath} className="app-nav-profile">
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
          <button onClick={handleLogout} className="btn app-nav-exit">EXIT</button>
        </div>
      </nav>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="mobile-tab-bar">
        {/* backdrop dismiss for more menu */}
        {showMore && (
          <div className="mobile-more-backdrop" onClick={() => setShowMore(false)} />
        )}

        {/* more sheet — slides up above tab bar */}
        {showMore && (
          <div className="mobile-more-sheet">
            <div className="mobile-more-sheet-inner">
              {moreLinks.map(({ path, label }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setShowMore(false)}
                  className={`mobile-more-item ${isActive(path) ? 'active' : ''}`}
                >
                  {label}
                </Link>
              ))}
              <button onClick={() => { setShowMore(false); handleLogout() }} className="mobile-more-item mobile-more-exit">
                EXIT
              </button>
            </div>
          </div>
        )}

        <div className="mobile-tab-bar-inner">
          {bottomTabs.map(({ path, label, icon: Icon, isAction, isProfile }) => {
            if (isAction) return (
              <Link key={path} to={path} className="mobile-tab-action">
                <span className="mobile-tab-action-plus">+</span>
                <span className="mobile-tab-label">{label}</span>
              </Link>
            )
            if (isProfile) return (
              <Link key={path} to={path} className={`mobile-tab ${isActive(path) ? 'active' : ''}`}>
                <span
                  className="mobile-tab-avatar"
                  style={{ background: profile?.avatar_url ? `url(${profile.avatar_url}) center/cover` : 'var(--dark)' }}
                >
                  {!profile?.avatar_url && (profile?.username?.[0]?.toUpperCase() || '?')}
                </span>
                <span className="mobile-tab-label">{label}</span>
              </Link>
            )
            return (
              <Link key={path} to={path} className={`mobile-tab ${isActive(path) ? 'active' : ''}`}>
                <span className="mobile-tab-icon"><Icon active={isActive(path)} /></span>
                <span className="mobile-tab-label">{label}</span>
              </Link>
            )
          })}

          {/* MORE tab */}
          <button
            onClick={() => setShowMore(prev => !prev)}
            className={`mobile-tab ${moreActive || showMore ? 'active' : ''}`}
          >
            <span className="mobile-tab-icon"><MoreIcon active={moreActive || showMore} /></span>
            <span className="mobile-tab-label">MORE</span>
          </button>
        </div>
      </nav>
    </>
  )
}

function FloorIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="8" height="8" rx="1" fill={active ? '#e63946' : 'none'} stroke={active ? '#e63946' : 'currentColor'} strokeWidth="1.8"/>
      <rect x="13" y="3" width="8" height="8" rx="1" fill="none" stroke={active ? '#e63946' : 'currentColor'} strokeWidth="1.8"/>
      <rect x="3" y="13" width="8" height="8" rx="1" fill="none" stroke={active ? '#e63946' : 'currentColor'} strokeWidth="1.8"/>
      <rect x="13" y="13" width="8" height="8" rx="1" fill="none" stroke={active ? '#e63946' : 'currentColor'} strokeWidth="1.8"/>
    </svg>
  )
}

function DmsIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        fill={active ? 'rgba(230,57,70,0.15)' : 'none'}
        stroke={active ? '#e63946' : 'currentColor'} strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  )
}

function JournalIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="2" width="16" height="20" rx="2"
        fill={active ? 'rgba(230,57,70,0.15)' : 'none'}
        stroke={active ? '#e63946' : 'currentColor'} strokeWidth="1.8"/>
      <line x1="8" y1="8" x2="16" y2="8" stroke={active ? '#e63946' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="8" y1="12" x2="16" y2="12" stroke={active ? '#e63946' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="8" y1="16" x2="12" y2="16" stroke={active ? '#e63946' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function MoreIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="5" cy="12" r="1.5" fill={active ? '#e63946' : 'currentColor'}/>
      <circle cx="12" cy="12" r="1.5" fill={active ? '#e63946' : 'currentColor'}/>
      <circle cx="19" cy="12" r="1.5" fill={active ? '#e63946' : 'currentColor'}/>
    </svg>
  )
}
