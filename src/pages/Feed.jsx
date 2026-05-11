/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import EntryCard from '../components/EntryCard'
import PostCard from '../components/PostCard'
import PostComposer from '../components/PostComposer'
import NotificationsRail from '../components/NotificationsRail'
import BacktestReflectionCard from '../components/BacktestReflectionCard'
import { Link } from 'react-router-dom'
import ForexNewsPanel from '../components/ForexNewsPanel'
import TradingGlobe from '../components/TradingGlobe'
import PinnedRulesPanel from '../components/PinnedRulesPanel'
import ActivityCalendarWidget from '../components/ActivityCalendarWidget'
import { usePullToRefresh } from '../hooks/usePullToRefresh'

const POLL_INTERVAL = 5000

export default function Feed({ session }) {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [feed, setFeed]       = useState('foryou')   // 'foryou' | 'following'
  const [filter, setFilter]   = useState('all')       // 'all' | 'winning' | 'losing'
  const pollRef               = useRef(null)

  const loadFeed = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    if (!silent) setError('')

    let followingIds = []
    if (feed === 'following') {
      const { data: follows, error: followsError } = await supabase
        .from('follows').select('following_id').eq('follower_id', session.user.id)
      if (followsError) {
        setError(followsError.message)
        if (!silent) setLoading(false)
        return
      }
      followingIds = follows?.map(f => f.following_id) || []
      if (followingIds.length === 0) {
        setItems([])
        if (!silent) setLoading(false)
        return
      }
    }

    let entryQuery = supabase
      .from('entries')
      .select('*, profiles(username, avatar_url), strategies(name), reactions(type, user_id)')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(40)

    if (filter === 'winning') entryQuery = entryQuery.gt('pnl', 0)
    if (filter === 'losing')  entryQuery = entryQuery.lt('pnl', 0)
    if (feed === 'following') entryQuery = entryQuery.in('user_id', followingIds)

    let postQuery = supabase
      .from('posts')
      .select('*, profiles(username, avatar_url), post_reactions(type, user_id)')
      .order('created_at', { ascending: false })
      .limit(30)

    if (feed === 'following') postQuery = postQuery.in('user_id', followingIds)

    let reflectionQuery = supabase
      .from('backtest_reflections')
      .select('*, profiles!backtest_reflections_user_id_profiles_fkey(username, avatar_url), strategies(name)')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(20)

    if (feed === 'following') reflectionQuery = reflectionQuery.in('user_id', followingIds)

    const skipPosts = filter === 'winning' || filter === 'losing'

    const [entryResult, postResult, reflectionResult] = await Promise.all([
      entryQuery,
      skipPosts ? { data: [] } : postQuery,
      skipPosts ? { data: [] } : reflectionQuery,
    ])

    const loadError = entryResult.error || postResult.error || reflectionResult.error
    if (loadError) {
      setError(loadError.message)
      if (!silent) setLoading(false)
      return
    }

    const entries = entryResult.data || []
    const posts = postResult.data || []
    const reflections = reflectionResult.data || []

    const processedEntries = entries.map(e => ({
      ...e, _type: 'entry',
      props_count:   e.reactions?.filter(r => r.type === 'props').length   || 0,
      callout_count: e.reactions?.filter(r => r.type === 'callout').length || 0,
      user_reaction: e.reactions?.find(r => r.user_id === session.user.id)?.type || null,
    }))

    const processedPosts = posts.map(p => ({
      ...p, _type: 'post',
      props_count:   p.post_reactions?.filter(r => r.type === 'props').length   || 0,
      callout_count: p.post_reactions?.filter(r => r.type === 'callout').length || 0,
      user_reaction: p.post_reactions?.find(r => r.user_id === session.user.id)?.type || null,
    }))

    const processedReflections = reflections.map(r => ({ ...r, _type: 'backtest_reflection' }))

    const merged = [...processedEntries, ...processedPosts, ...processedReflections]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    setItems(merged)
    if (!silent) setLoading(false)
  }, [feed, filter, session.user.id])

  // initial load + when tab/filter changes
  useEffect(() => {
    loadFeed()
  }, [feed, filter])

  // 5-second background poll
  useEffect(() => {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(() => loadFeed(true), POLL_INTERVAL)
    return () => clearInterval(pollRef.current)
  }, [loadFeed])

  // pull-to-refresh
  const { pullY, refreshing, triggered } = usePullToRefresh(loadFeed)

  const handleNewPost = (post) => {
    setItems(prev => [{ ...post, _type: 'post', props_count: 0, callout_count: 0, user_reaction: null }, ...prev])
  }

  const subFilters = [
    { key: 'all',     label: 'ALL' },
    { key: 'winning', label: 'GREEN' },
    { key: 'losing',  label: 'RED' },
  ]

  const quickLinks = [
    { to: '/journal',     icon: '📔', label: 'Journal' },
    { to: '/calendar',    icon: '📅', label: 'Calendar' },
    { to: '/rooms',       icon: '💬', label: 'DMs' },
    { to: '/strategies',  icon: '⚡', label: 'Strategies' },
    { to: '/backtesting', icon: '🔬', label: 'Backtest' },
    { to: '/connections', icon: '👥', label: 'People' },
  ]

  return (
    <div style={{ paddingTop: 'calc(56px + env(safe-area-inset-top, 0px))', minHeight: '100vh' }}>

      {/* pull-to-refresh indicator */}
      {(pullY > 0 || refreshing) && (
        <div className="pull-indicator" style={{ '--pull-y': `${Math.min(pullY, 60)}px` }}>
          <div className={`pull-spinner ${refreshing || triggered ? 'spinning' : ''}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      )}

      <div className="floor-shell">
        <div className="floor-left-rail">
          <NotificationsRail session={session} />
          <ActivityCalendarWidget session={session} />
          <PinnedRulesPanel session={session} context="feed" />
        </div>

        <main className="floor-feed">

          <div className="page-title-row" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <h1 style={{ fontSize: '3rem', letterSpacing: '0.05em', lineHeight: 1, marginBottom: '4px' }}>THE FLOOR</h1>
              <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.1em', opacity: 0.6 }}>
                REAL TRADES. REAL LOSSES. REAL GROWTH.
              </p>
            </div>
            <Link to="/new" className="btn btn-red" style={{ padding: '10px 20px', fontSize: '11px' }}>
              + LOG TRADE
            </Link>
          </div>

          <div className="floor-quicklinks">
            {quickLinks.map(link => (
              <Link key={link.to} to={link.to} className="floor-quicklink">
                <span className="floor-quicklink-icon">{link.icon}</span>
                <span className="floor-quicklink-label">{link.label}</span>
              </Link>
            ))}
          </div>

          <div className="pinned-rules-mobile-slot">
            <PinnedRulesPanel session={session} context="feed" variant="strip" />
          </div>

          {/* FOR YOU / FOLLOWING primary tabs */}
          <div className="feed-primary-tabs">
            {[
              { key: 'foryou',    label: 'FOR YOU' },
              { key: 'following', label: 'FOLLOWING' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => { setFeed(t.key); setFilter('all') }}
                className={`feed-primary-tab ${feed === t.key ? 'active' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* sub-filters */}
          <div className="feed-sub-filters">
            {subFilters.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`feed-sub-filter ${filter === f.key ? 'active' : ''}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <PostComposer session={session} onPost={handleNewPost} />

          {loading ? (
            <div className="mobile-empty-state" style={{ textAlign: 'center', padding: '60px', fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--dim)', letterSpacing: '0.1em' }}>
              LOADING THE FLOOR...
            </div>
          ) : error ? (
            <div className="mobile-empty-state" style={{ textAlign: 'center', padding: '60px' }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: 'var(--red)', marginBottom: '12px' }}>FLOOR ERROR</div>
              <p style={{ fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--dim)', lineHeight: 1.7 }}>
                {error}
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="mobile-empty-state" style={{ textAlign: 'center', padding: '60px' }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: 'var(--border)', marginBottom: '12px' }}>EMPTY</div>
              <p style={{ fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--dim)' }}>
                {feed === 'following' ? 'FOLLOW SOME TRADERS TO SEE THEIR POSTS' : 'NO ACTIVITY YET. BE THE FIRST.'}
              </p>
            </div>
          ) : (
            items.map(item =>
              item._type === 'post'
                ? <PostCard key={`post-${item.id}`} post={item} session={session} />
                : item._type === 'backtest_reflection'
                  ? <BacktestReflectionCard key={`reflection-${item.id}`} reflection={item} session={session} showAuthor />
                  : <EntryCard key={`entry-${item.id}`} entry={item} session={session} />
            )
          )}
        </main>

        <aside className="floor-right-rail" style={{ position: 'sticky', top: '76px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <TradingGlobe />
          <ForexNewsPanel />
        </aside>
      </div>
    </div>
  )
}
