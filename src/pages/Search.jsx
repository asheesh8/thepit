import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import Avatar from '../components/Avatar'

function UserCard({ user, session }) {
  const [following, setFollowing] = useState(false)
  const [loadingFollow, setLoadingFollow] = useState(false)

  useEffect(() => {
    supabase.from('follows').select('follower_id').eq('follower_id', session.user.id).eq('following_id', user.id).maybeSingle()
      .then(({ data }) => setFollowing(!!data))
  }, [user.id])

  const toggleFollow = async (e) => {
    e.preventDefault()
    setLoadingFollow(true)
    if (following) {
      await supabase.from('follows').delete().match({ follower_id: session.user.id, following_id: user.id })
      setFollowing(false)
    } else {
      await supabase.from('follows').insert({ follower_id: session.user.id, following_id: user.id })
      setFollowing(true)
    }
    setLoadingFollow(false)
  }

  return (
    <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
      <Link to={`/profile/${user.username}`} style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0, textDecoration: 'none' }}>
        <Avatar url={user.avatar_url} username={user.username} size={42} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', letterSpacing: '0.05em', color: 'var(--text)' }}>@{user.username}</div>
          {user.bio && (
            <div style={{ fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>
              {user.bio}
            </div>
          )}
          {user.trading_categories?.length > 0 && (
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
              {user.trading_categories.slice(0, 3).map(cat => (
                <span key={cat} className="tag" style={{ fontSize: '8px', color: 'var(--dim)', opacity: 0.7 }}>{cat.toUpperCase()}</span>
              ))}
            </div>
          )}
        </div>
      </Link>
      {user.id !== session.user.id && (
        <button onClick={toggleFollow} disabled={loadingFollow} className={`btn ${following ? '' : 'btn-red'}`} style={{ padding: '6px 14px', fontSize: '10px', flexShrink: 0 }}>
          {loadingFollow ? '...' : following ? 'FOLLOWING' : 'FOLLOW'}
        </button>
      )}
    </div>
  )
}

export default function Search({ session }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [recent, setRecent]   = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load recent/active traders to show before any search
    supabase.from('profiles')
      .select('id, username, bio, avatar_url, trading_categories')
      .neq('id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(12)
      .then(({ data }) => setRecent(data || []))
  }, [])

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, username, bio, avatar_url, trading_categories')
      .ilike('username', `%${q.trim()}%`)
      .neq('id', session.user.id)
      .order('username')
      .limit(20)
    setResults(data || [])
    setLoading(false)
  }, [session.user.id])

  useEffect(() => {
    const t = setTimeout(() => search(query), 280)
    return () => clearTimeout(t)
  }, [query, search])

  const showResults = query.trim().length > 0
  const displayList = showResults ? results : recent

  return (
    <div style={{ paddingTop: 'calc(56px + env(safe-area-inset-top, 0px))', minHeight: '100vh' }}>
      <div className="page-shell search-shell" style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 24px' }}>

        <h1 style={{ fontSize: '3rem', letterSpacing: '0.05em', lineHeight: 1, marginBottom: '4px' }}>FIND TRADERS</h1>
        <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.1em', marginBottom: '24px' }}>
          {showResults ? `${results.length} RESULTS` : 'RECENTLY JOINED'}
        </p>

        <div style={{ position: 'relative', marginBottom: '24px' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="search by username..."
            autoFocus
            style={{
              width: '100%', background: 'var(--dark)', border: '1px solid var(--border)',
              padding: '14px 44px 14px 16px', color: 'var(--text)', fontSize: '14px', outline: 'none',
              fontFamily: 'Space Mono', boxSizing: 'border-box', transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--red)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{
              position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--dim)', cursor: 'pointer', fontSize: '16px', lineHeight: 1,
            }}>×</button>
          )}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '24px', fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--dim)' }}>
            SEARCHING...
          </div>
        )}

        {!loading && showResults && results.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '2.5rem', color: 'var(--border)', marginBottom: '8px' }}>NO RESULTS</div>
            <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)' }}>no traders found for "{query}"</p>
          </div>
        )}

        {!loading && displayList.map(user => (
          <UserCard key={user.id} user={user} session={session} />
        ))}
      </div>
    </div>
  )
}
