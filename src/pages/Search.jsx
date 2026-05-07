import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import Avatar from '../components/Avatar'

export default function Search({ session }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, username, bio, avatar_url, trading_categories, experience_level')
      .ilike('username', `%${query.trim()}%`)
      .neq('id', session.user.id)
      .limit(20)
    setResults(data || [])
    setLoading(false)
  }

  return (
    <div style={{ paddingTop: '56px', minHeight: '100vh' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 24px' }}>

        <h1 style={{ fontSize: '3rem', letterSpacing: '0.05em', lineHeight: 1, marginBottom: '4px' }}>FIND TRADERS</h1>
        <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.1em', marginBottom: '32px' }}>
          SEARCH BY USERNAME
        </p>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="search username..."
            autoFocus
            style={{
              flex: 1, background: 'var(--dark)', border: '1px solid var(--border)',
              padding: '14px 16px', color: 'var(--text)', fontSize: '14px', outline: 'none',
              fontFamily: 'Space Mono',
            }}
          />
          <button type="submit" className="btn btn-red" style={{ padding: '14px 24px', fontSize: '11px' }}>
            SEARCH
          </button>
        </form>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--dim)' }}>
            SEARCHING...
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '2.5rem', color: 'var(--border)', marginBottom: '8px' }}>NO RESULTS</div>
            <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.06em' }}>no traders found for "{query}"</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {results.map(user => (
            <Link key={user.id} to={`/profile/${user.username}`}>
              <div
                className="card"
                style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--red)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <Avatar url={user.avatar_url} username={user.username} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', letterSpacing: '0.05em' }}>@{user.username}</div>
                  {user.bio && (
                    <div style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--dim)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.bio}
                    </div>
                  )}
                  {user.trading_categories?.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                      {user.trading_categories.map(cat => (
                        <span key={cat} className="tag" style={{ fontSize: '8px', color: 'var(--dim)', opacity: 0.7 }}>{cat.toUpperCase()}</span>
                      ))}
                    </div>
                  )}
                </div>
                <span style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--red)', letterSpacing: '0.1em', flexShrink: 0 }}>VIEW →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}


