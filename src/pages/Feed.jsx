import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import EntryCard from '../components/EntryCard'
import { Link } from 'react-router-dom'

export default function Feed({ session }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | following | winning | losing

  useEffect(() => {
    loadEntries()
  }, [filter])

  const loadEntries = async () => {
    setLoading(true)
    let query = supabase
      .from('entries')
      .select(`
        *,
        profiles(username),
        reactions(type, user_id)
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(30)

    if (filter === 'winning') query = query.gt('pnl', 0)
    if (filter === 'losing') query = query.lt('pnl', 0)

    if (filter === 'following') {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', session.user.id)
      const ids = follows?.map(f => f.following_id) || []
      if (ids.length > 0) {
        query = query.in('user_id', ids)
      }
    }

    const { data } = await query

    // process reactions
    const processed = (data || []).map(entry => {
      const props = entry.reactions?.filter(r => r.type === 'props').length || 0
      const callout = entry.reactions?.filter(r => r.type === 'callout').length || 0
      const userReaction = entry.reactions?.find(r => r.user_id === session.user.id)?.type || null
      return { ...entry, props_count: props, callout_count: callout, user_reaction: userReaction }
    })

    setEntries(processed)
    setLoading(false)
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

        {/* header */}
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontSize: '3rem', letterSpacing: '0.05em', lineHeight: 1, marginBottom: '4px' }}>THE FLOOR</h1>
            <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: '#444440', letterSpacing: '0.1em' }}>
              REAL TRADES. REAL LOSSES. REAL GROWTH.
            </p>
          </div>
          <Link to="/new" className="btn btn-red" style={{ padding: '10px 20px', fontSize: '11px' }}>
            + LOG TRADE
          </Link>
        </div>

        {/* filter tabs */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '24px', borderBottom: '1px solid #242424' }}>
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Space Mono', fontSize: '10px', letterSpacing: '0.08em',
              color: filter === f.key ? '#e8e8e0' : '#444440',
              borderBottom: filter === f.key ? '1px solid #e63946' : '1px solid transparent',
              marginBottom: '-1px', transition: 'all 0.15s',
            }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* entries */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', fontFamily: 'Space Mono', fontSize: '11px', color: '#444440', letterSpacing: '0.1em' }}>
            LOADING THE FLOOR...
          </div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#2a2a2a', marginBottom: '12px' }}>EMPTY</div>
            <p style={{ fontFamily: 'Space Mono', fontSize: '11px', color: '#444440' }}>
              {filter === 'following' ? 'FOLLOW SOME TRADERS TO SEE THEIR ENTRIES' : 'NO TRADES YET. BE THE FIRST.'}
            </p>
          </div>
        ) : (
          entries.map(entry => (
            <EntryCard key={entry.id} entry={entry} session={session} />
          ))
        )}
      </div>
    </div>
  )
}
