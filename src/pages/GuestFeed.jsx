import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getTradeContext } from '../lib/discipline'

function timeAgo(value) {
  const diff = Date.now() - new Date(value).getTime()
  const m = Math.max(1, Math.floor(diff / 60000))
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function GuestEntryCard({ entry }) {
  const pnl = entry.pnl || 0
  const pnlLabel = pnl > 0 ? `+$${pnl.toFixed(2)}` : pnl < 0 ? `-$${Math.abs(pnl).toFixed(2)}` : '$0.00'
  const pnlClass = pnl > 0 ? 'pnl-positive' : pnl < 0 ? 'pnl-negative' : 'pnl-neutral'
  const context = getTradeContext(entry.trade_context)
  const username = entry.profiles?.username || 'trader'

  return (
    <div className="card" style={{ padding: '20px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)',
            background: entry.profiles?.avatar_url ? `url(${entry.profiles.avatar_url}) center/cover` : 'var(--dark)',
            color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontFamily: 'Space Mono', flexShrink: 0 }}>
            {!entry.profiles?.avatar_url && username[0].toUpperCase()}
          </div>
          <div>
            <Link to={`/auth`} style={{ fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--text)' }}>
              @{username}
            </Link>
            <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', marginTop: '2px' }}>
              {timeAgo(entry.created_at)}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className={`${pnlClass}`} style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', letterSpacing: '0.05em' }}>
            {pnlLabel}
          </div>
          <span className="tag" style={{ fontSize: '8px', color: context.color, borderColor: context.color }}>
            {context.shortLabel}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: entry.notes ? '10px' : 0 }}>
        {entry.symbol && (
          <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: 'var(--text)', letterSpacing: '0.05em' }}>
            {entry.symbol}
          </span>
        )}
        {entry.direction && (
          <span className="tag" style={{ fontSize: '8px', color: entry.direction === 'long' ? 'var(--green)' : 'var(--red)',
            borderColor: entry.direction === 'long' ? 'var(--green)' : 'var(--red)' }}>
            {entry.direction.toUpperCase()}
          </span>
        )}
        {entry.strategies?.name && (
          <span style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)' }}>
            {entry.strategies.name}
          </span>
        )}
      </div>

      {entry.notes && (
        <p style={{ fontSize: '13px', color: 'var(--dim)', lineHeight: 1.6, marginTop: '8px' }}>
          {entry.notes.slice(0, 200)}{entry.notes.length > 200 ? '…' : ''}
        </p>
      )}

      <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)',
        display: 'flex', gap: '16px' }}>
        <Link to="/auth" style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', letterSpacing: '0.08em' }}>
          SIGN IN TO REACT
        </Link>
        <Link to="/auth" style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', letterSpacing: '0.08em' }}>
          SIGN IN TO COMMENT
        </Link>
      </div>
    </div>
  )
}

function GuestPostCard({ post }) {
  const username = post.profiles?.username || 'trader'

  return (
    <div className="card" style={{ padding: '20px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)',
          background: post.profiles?.avatar_url ? `url(${post.profiles.avatar_url}) center/cover` : 'var(--dark)',
          color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontFamily: 'Space Mono', flexShrink: 0 }}>
          {!post.profiles?.avatar_url && username[0].toUpperCase()}
        </div>
        <div>
          <Link to="/auth" style={{ fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--text)' }}>
            @{username}
          </Link>
          <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', marginTop: '2px' }}>
            {timeAgo(post.created_at)}
          </div>
        </div>
      </div>
      <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.65 }}>
        {post.body?.slice(0, 300)}{post.body?.length > 300 ? '…' : ''}
      </p>
      <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
        <Link to="/auth" style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', letterSpacing: '0.08em' }}>
          SIGN IN TO REACT
        </Link>
      </div>
    </div>
  )
}

export default function GuestFeed() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [{ data: entries }, { data: posts }] = await Promise.all([
        supabase
          .from('entries')
          .select('*, profiles(username, avatar_url), strategies(name)')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('posts')
          .select('*, profiles(username, avatar_url)')
          .order('created_at', { ascending: false })
          .limit(20),
      ])

      const merged = [
        ...(entries || []).map(e => ({ ...e, _type: 'entry' })),
        ...(posts || []).map(p => ({ ...p, _type: 'post' })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      setItems(merged)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--black)' }}>

      {/* guest navbar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: '56px',
        padding: '0 24px', borderBottom: '1px solid var(--border)', background: 'rgba(26,26,26,0.95)',
        backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', letterSpacing: '0.15em', color: 'var(--red)' }}>
          THE PIT
        </Link>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/auth" className="btn" style={{ padding: '7px 16px', fontSize: '10px' }}>
            SIGN IN
          </Link>
          <Link to="/auth" className="btn btn-red" style={{ padding: '7px 16px', fontSize: '10px' }}>
            JOIN THE PIT
          </Link>
        </div>
      </div>

      {/* join banner */}
      <div style={{ paddingTop: '56px' }}>
        <div style={{ background: 'linear-gradient(90deg, rgba(230,57,70,0.08), rgba(46,196,182,0.05))',
          borderBottom: '1px solid var(--border)', padding: '14px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.1em' }}>
            YOU'RE VIEWING THE FLOOR AS A GUEST — READ ONLY
          </div>
          <Link to="/auth" style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--red)', letterSpacing: '0.1em' }}>
            JOIN TO LOG TRADES & INTERACT →
          </Link>
        </div>

        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '2.5rem', letterSpacing: '0.05em', lineHeight: 1, marginBottom: '4px' }}>THE FLOOR</h1>
            <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.1em', opacity: 0.6 }}>
              REAL TRADES. REAL LOSSES. REAL GROWTH.
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--dim)', letterSpacing: '0.1em' }}>
              LOADING THE FLOOR...
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: 'var(--border)', marginBottom: '12px' }}>EMPTY</div>
            </div>
          ) : (
            items.map(item =>
              item._type === 'post'
                ? <GuestPostCard key={`post-${item.id}`} post={item} />
                : <GuestEntryCard key={`entry-${item.id}`} entry={item} />
            )
          )}

          {!loading && items.length > 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0 48px',
              fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.1em' }}>
              — <Link to="/auth" style={{ color: 'var(--red)' }}>JOIN THE PIT</Link> TO SEE MORE & PARTICIPATE —
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
