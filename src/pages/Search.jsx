import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

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
      .select('*')
      .ilike('username', `%${query.trim()}%`)
      .neq('id', session.user.id)
      .limit(20)

    setResults(data || [])
    setLoading(false)
  }

  return (
    <div style={{ paddingTop: '56px', minHeight: '100vh' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 24px' }}>

        <h1 style={{ fontSize: '3rem', letterSpacing: '0.05em', marginBottom: '4px' }}>FIND TRADERS</h1>
        <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: '#444440', letterSpacing: '0.1em', marginBottom: '32px' }}>
          SEARCH BY USERNAME
        </p>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="search username..."
            autoFocus
            style={{
              flex: 1, background: '#111', border: '1px solid #242424',
              padding: '14px 16px', color: '#e8e8e0', fontSize: '14px', outline: 'none',
              fontFamily: 'Space Mono',
            }}
          />
          <button type="submit" className="btn btn-red" style={{ padding: '14px 24px', fontSize: '11px' }}>
            SEARCH
          </button>
        </form>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', fontFamily: 'Space Mono', fontSize: '11px', color: '#444440' }}>
            SEARCHING...
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#2a2a2a', marginBottom: '8px' }}>NO RESULTS</div>
            <p style={{ fontFamily: 'Space Mono', fontSize: '11px', color: '#444440' }}>no traders found for "{query}"</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {results.map(user => (
            <Link key={user.id} to={`/profile/${user.username}`}>
              <div className="card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#e63946'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#242424'}>
                <div>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', letterSpacing: '0.05em' }}>@{user.username}</div>
                  {user.bio && <div style={{ fontFamily: 'DM Sans', fontSize: '13px', color: '#888880', marginTop: '4px' }}>{user.bio}</div>}
                </div>
                <span style={{ fontFamily: 'Space Mono', fontSize: '10px', color: '#e63946', letterSpacing: '0.1em' }}>VIEW →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
