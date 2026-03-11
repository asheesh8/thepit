import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import EntryCard from '../components/EntryCard'
import PostCard from '../components/PostCard'
import PostComposer from '../components/PostComposer'
import { Link } from 'react-router-dom'

export default function Feed({ session }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadFeed()
  }, [filter])

  const loadFeed = async () => {
    setLoading(true)

    // fetch trade entries
    let entryQuery = supabase
      .from('entries')
      .select('*, profiles(username), reactions(type, user_id)')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(30)

    if (filter === 'winning') entryQuery = entryQuery.gt('pnl', 0)
    if (filter === 'losing') entryQuery = entryQuery.lt('pnl', 0)

    let followingIds = []
    if (filter === 'following') {
      const { data: follows } = await supabase
        .from('follows').select('following_id').eq('follower_id', session.user.id)
      followingIds = follows?.map(f => f.following_id) || []
      if (followingIds.length > 0) entryQuery = entryQuery.in('user_id', followingIds)
    }

    // fetch free posts
    let postQuery = supabase
      .from('posts')
      .select('*, profiles(username), post_reactions(type, user_id)')
      .order('created_at', { ascending: false })
      .limit(30)

    if (filter === 'following' && followingIds.length > 0) {
      postQuery = postQuery.in('user_id', followingIds)
    }

    // don't show posts on winning/losing filters
    const [{ data: entries }, { data: posts }] = await Promise.all([
      entryQuery,
      filter === 'winning' || filter === 'losing' ? { data: [] } : postQuery,
    ])

    // process entry reactions
    const processedEntries = (entries || []).map(e => ({
      ...e,
      _type: 'entry',
      props_count: e.reactions?.filter(r => r.type === 'props').length || 0,
      callout_count: e.reactions?.filter(r => r.type === 'callout').length || 0,
      user_reaction: e.reactions?.find(r => r.user_id === session.user.id)?.type || null,
    }))

    // process post reactions
    const processedPosts = (posts || []).map(p => ({
      ...p,
      _type: 'post',
      props_count: p.post_reactions?.filter(r => r.type === 'props').length || 0,
      callout_count: p.post_reactions?.filter(r => r.type === 'callout').length || 0,
      user_reaction: p.post_reactions?.find(r => r.user_id === session.user.id)?.type || null,
    }))

    // merge and sort by date
    const merged = [...processedEntries, ...processedPosts].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    )

    setItems(merged)
    setLoading(false)
  }

  const handleNewPost = (post) => {
    setItems(prev => [{ ...post, _type: 'post', props_count: 0, callout_count: 0, user_reaction: null }, ...prev])
  }

  const filters = [
    { key: 'all', label: 'THE FLOOR' },
    { key: 'following', label: 'FOLLOWING' },
    { key: 'winning', label: 'GREEN DAYS' },
    { key: 'losing', label: 'RED DAYS' },
  ]

  return (
    <div style={{ paddingTop: '56px', minHeight: '100vh' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
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

        {/* filter tabs */}
        <div style={{ display: 'flex', marginBottom: '24px', borderBottom: '1px solid var(--border)' }}>
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Space Mono', fontSize: '10px', letterSpacing: '0.08em',
              color: filter === f.key ? 'var(--text)' : 'var(--dim)',
              borderBottom: filter === f.key ? '1px solid var(--red)' : '1px solid transparent',
              marginBottom: '-1px', transition: 'all 0.15s',
            }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* post composer */}
        {(filter === 'all' || filter === 'following') && (
          <PostComposer session={session} onPost={handleNewPost} />
        )}

        {/* feed items */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--dim)', letterSpacing: '0.1em' }}>
            LOADING THE FLOOR...
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: 'var(--border)', marginBottom: '12px' }}>EMPTY</div>
            <p style={{ fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--dim)' }}>
              {filter === 'following' ? 'FOLLOW SOME TRADERS TO SEE THEIR POSTS' : 'NO ACTIVITY YET. BE THE FIRST.'}
            </p>
          </div>
        ) : (
          items.map(item =>
            item._type === 'post'
              ? <PostCard key={`post-${item.id}`} post={item} session={session} />
              : <EntryCard key={`entry-${item.id}`} entry={item} session={session} />
          )
        )}
      </div>
    </div>
  )
}
