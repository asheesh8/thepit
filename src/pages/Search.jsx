import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Avatar from '../components/Avatar'

function dmTitleFor(a, b) {
  return `DM:${[a, b].sort().join(':')}`
}

function relationLabel(user) {
  if (user.isFollowing && user.isFollower) return 'MUTUAL'
  if (user.isFollowing) return 'FOLLOWING'
  if (user.isFollower) return 'FOLLOWS YOU'
  return 'TRADER'
}

function UserCard({ user, session, onFollowChange }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const toggleFollow = async (event) => {
    event.preventDefault()
    event.stopPropagation()
    setBusy(true)
    if (user.isFollowing) {
      await supabase.from('follows').delete().match({ follower_id: session.user.id, following_id: user.id })
      onFollowChange(user.id, { isFollowing: false })
    } else {
      await supabase.from('follows').insert({ follower_id: session.user.id, following_id: user.id })
      onFollowChange(user.id, { isFollowing: true })
    }
    setBusy(false)
  }

  const openDm = async (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!user.isFollowing || !user.isFollower) return
    setBusy(true)
    const title = dmTitleFor(session.user.id, user.id)
    const { data: existing } = await supabase
      .from('live_rooms')
      .select('id')
      .eq('title', title)
      .eq('room_type', 'dm')
      .maybeSingle()
    if (existing?.id) {
      navigate(`/rooms/${existing.id}`)
      return
    }
    const { data } = await supabase
      .from('live_rooms')
      .insert({
        title,
        room_type: 'dm',
        is_public: false,
        room_password: '',
        host_id: session.user.id,
        dm_peer_id: user.id,
        status: 'live',
        agenda: `Direct message with @${user.username}`,
      })
      .select('id')
      .single()
    setBusy(false)
    if (data?.id) navigate(`/rooms/${data.id}`)
  }

  return (
    <Link to={`/profile/${user.username}`} className="search-user-card">
      <Avatar url={user.avatar_url} username={user.username} size={50} />
      <div className="search-user-main">
        <div className="search-user-topline">
          <div className="search-user-name">@{user.username}</div>
          <span className={`search-user-relation ${user.isFollowing && user.isFollower ? 'mutual' : ''}`}>
            {relationLabel(user)}
          </span>
        </div>
        {user.bio && <div className="search-user-bio">{user.bio}</div>}
        {user.trading_categories?.length > 0 && (
          <div className="search-user-tags">
            {user.trading_categories.slice(0, 4).map(category => (
              <span key={category}>{category}</span>
            ))}
          </div>
        )}
      </div>
      <div className="search-user-actions">
        {user.isFollowing && user.isFollower && (
          <button onClick={openDm} disabled={busy} className="btn btn-green">DM</button>
        )}
        <button onClick={toggleFollow} disabled={busy} className={`btn ${user.isFollowing ? '' : 'btn-red'}`}>
          {busy ? '...' : user.isFollowing ? 'FOLLOWING' : user.isFollower ? 'FOLLOW BACK' : 'FOLLOW'}
        </button>
      </div>
    </Link>
  )
}

export default function Search({ session }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [recent, setRecent] = useState([])
  const [followingIds, setFollowingIds] = useState(new Set())
  const [followerIds, setFollowerIds] = useState(new Set())
  const [loading, setLoading] = useState(false)

  const hydrateUsers = useCallback((users) => (
    (users || []).map(user => ({
      ...user,
      isFollowing: followingIds.has(user.id),
      isFollower: followerIds.has(user.id),
    }))
  ), [followerIds, followingIds])

  const loadRelationships = useCallback(async () => {
    const [followingRes, followerRes] = await Promise.all([
      supabase.from('follows').select('following_id').eq('follower_id', session.user.id),
      supabase.from('follows').select('follower_id').eq('following_id', session.user.id),
    ])
    setFollowingIds(new Set((followingRes.data || []).map(row => row.following_id)))
    setFollowerIds(new Set((followerRes.data || []).map(row => row.follower_id)))
  }, [session.user.id])

  useEffect(() => {
    loadRelationships()
  }, [loadRelationships])

  useEffect(() => {
    supabase.from('profiles')
      .select('id, username, bio, avatar_url, trading_categories')
      .neq('id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(16)
      .then(({ data }) => setRecent(data || []))
  }, [session.user.id])

  const search = useCallback(async (value) => {
    const clean = value.trim().replace(/^@/, '')
    if (!clean) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const safe = clean.replace(/[,%{}()[\]]/g, ' ').replace(/\s+/g, ' ').trim()
    const category = safe.split(' ')[0]
    if (!safe) {
      setResults([])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, username, bio, avatar_url, trading_categories')
      .or(`username.ilike.%${safe}%,bio.ilike.%${safe}%,trading_categories.cs.{${category}}`)
      .neq('id', session.user.id)
      .order('username')
      .limit(30)
    setResults(data || [])
    setLoading(false)
  }, [session.user.id])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 180)
    return () => clearTimeout(timer)
  }, [query, search])

  const updateUserRelation = (userId, patch) => {
    const apply = user => user.id === userId ? { ...user, ...patch } : user
    setRecent(prev => prev.map(apply))
    setResults(prev => prev.map(apply))
    if ('isFollowing' in patch) {
      setFollowingIds(prev => {
        const next = new Set(prev)
        if (patch.isFollowing) next.add(userId)
        else next.delete(userId)
        return next
      })
    }
  }

  const showResults = query.trim().length > 0
  const displayList = useMemo(
    () => hydrateUsers(showResults ? results : recent),
    [hydrateUsers, recent, results, showResults]
  )
  const mutualCount = displayList.filter(user => user.isFollowing && user.isFollower).length

  return (
    <div style={{ paddingTop: 'calc(56px + env(safe-area-inset-top, 0px))', minHeight: '100vh' }}>
      <div className="page-shell search-shell" style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px' }}>
        <div className="search-hero">
          <div>
            <h1>FIND TRADERS</h1>
            <p>{showResults ? `${displayList.length} RESULTS · ${mutualCount} MUTUAL` : 'SEARCH, FOLLOW BACK, OR DM MUTUALS'}</p>
          </div>
          <Link to="/connections" className="btn">CONNECTIONS</Link>
        </div>

        <div className="search-box">
          <span>@</span>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="username, bio, market..."
            autoFocus
          />
          {query && <button onClick={() => setQuery('')}>CLEAR</button>}
        </div>

        <div className="search-quick-row">
          {['forex', 'futures', 'options', 'scalper'].map(term => (
            <button key={term} onClick={() => setQuery(term)}>{term}</button>
          ))}
        </div>

        {loading && <div className="search-empty">SEARCHING...</div>}

        {!loading && showResults && displayList.length === 0 && (
          <div className="search-empty">
            <h2>NO MATCHES</h2>
            <p>Try a username, market, style, or part of their bio.</p>
          </div>
        )}

        {!loading && !showResults && (
          <div className="search-section-label">RECENT TRADERS</div>
        )}

        {!loading && displayList.map(user => (
          <UserCard
            key={user.id}
            user={user}
            session={session}
            onFollowChange={updateUserRelation}
          />
        ))}
      </div>
    </div>
  )
}
