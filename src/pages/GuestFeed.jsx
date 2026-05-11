import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getTradeContext } from '../lib/discipline'

function DemoEntry() {
  const [symbol, setSymbol] = useState('')
  const [direction, setDirection] = useState('long')
  const [pnl, setPnl] = useState('')
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const pnlNum = parseFloat(pnl) || 0
  const pnlLabel = pnlNum > 0 ? `+$${pnlNum.toFixed(2)}` : pnlNum < 0 ? `-$${Math.abs(pnlNum).toFixed(2)}` : '$0.00'
  const pnlColor = pnlNum > 0 ? 'var(--green)' : pnlNum < 0 ? 'var(--red)' : 'var(--dim)'
  const hasPreview = symbol || pnl || notes

  if (submitted) return (
    <div style={{ border: '1px solid rgba(46,196,182,0.3)', background: 'rgba(46,196,182,0.05)', padding: '24px', marginBottom: '24px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: 'var(--green)', marginBottom: '8px' }}>THAT'S WHAT IT FEELS LIKE.</div>
      <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.08em', marginBottom: '16px' }}>
        YOUR REAL ENTRIES STAY PRIVATE. BUILD YOUR HISTORY.
      </p>
      <Link to="/auth" className="btn btn-red" style={{ fontSize: '11px', padding: '10px 24px' }}>JOIN THE PIT →</Link>
    </div>
  )

  return (
    <div style={{ border: '1px solid var(--border)', background: 'rgba(34,34,34,0.5)', marginBottom: '28px' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--gold)', letterSpacing: '0.15em' }}>
          DEMO — TRY LOGGING A TRADE
        </div>
        <div style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--dim)', letterSpacing: '0.08em' }}>
          NOT SAVED
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', borderBottom: '1px solid var(--border)' }}>
        {/* form */}
        <div style={{ padding: '20px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontFamily: 'Space Mono', fontSize: '8px', letterSpacing: '0.12em', color: 'var(--dim)', display: 'block', marginBottom: '6px' }}>SYMBOL</label>
            <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="NQ, ES, AAPL..."
              maxLength={6} style={{ width: '100%', background: 'var(--dark)', border: '1px solid var(--border)', padding: '10px 12px', color: 'var(--text)', fontSize: '14px', fontFamily: 'Space Mono', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['long', 'short'].map(d => (
              <button key={d} onClick={() => setDirection(d)} style={{
                flex: 1, padding: '9px', border: `1px solid ${direction === d ? (d === 'long' ? 'var(--green)' : 'var(--red)') : 'var(--border)'}`,
                background: direction === d ? (d === 'long' ? 'rgba(46,196,182,0.1)' : 'rgba(230,57,70,0.1)') : 'transparent',
                color: direction === d ? (d === 'long' ? 'var(--green)' : 'var(--red)') : 'var(--dim)',
                fontFamily: 'Space Mono', fontSize: '9px', letterSpacing: '0.1em', cursor: 'pointer',
              }}>{d.toUpperCase()}</button>
            ))}
          </div>
          <div>
            <label style={{ fontFamily: 'Space Mono', fontSize: '8px', letterSpacing: '0.12em', color: 'var(--dim)', display: 'block', marginBottom: '6px' }}>P&amp;L ($)</label>
            <input type="number" value={pnl} onChange={e => setPnl(e.target.value)} placeholder="-420.00"
              style={{ width: '100%', background: 'var(--dark)', border: '1px solid var(--border)', padding: '10px 12px', color: 'var(--text)', fontSize: '14px', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontFamily: 'Space Mono', fontSize: '8px', letterSpacing: '0.12em', color: 'var(--dim)', display: 'block', marginBottom: '6px' }}>NOTES / REFLECTION</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="What happened? What would you do differently?"
              rows={3} style={{ width: '100%', background: 'var(--dark)', border: '1px solid var(--border)', padding: '10px 12px', color: 'var(--text)', fontSize: '13px', resize: 'none', outline: 'none', lineHeight: 1.6 }} />
          </div>
        </div>

        {/* live preview */}
        <div style={{ padding: '20px' }}>
          <div style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--dim)', letterSpacing: '0.1em', marginBottom: '14px' }}>PREVIEW</div>
          {!hasPreview ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '140px', fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.08em', opacity: 0.5 }}>
              FILL IN YOUR TRADE →
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', letterSpacing: '0.05em' }}>{symbol || '—'}</div>
                  <span style={{ fontFamily: 'Space Mono', fontSize: '8px', color: direction === 'long' ? 'var(--green)' : 'var(--red)', border: `1px solid ${direction === 'long' ? 'var(--green)' : 'var(--red)'}`, padding: '2px 6px' }}>
                    {direction.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: pnlColor, letterSpacing: '0.05em' }}>{pnlLabel}</div>
              </div>
              {notes && (
                <p style={{ fontSize: '13px', color: 'var(--dim)', lineHeight: 1.6, borderLeft: '2px solid var(--border)', paddingLeft: '12px' }}>
                  {notes.slice(0, 160)}{notes.length > 160 ? '…' : ''}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', letterSpacing: '0.06em' }}>
          Real entries track your streak, badges & strategy history.
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setSubmitted(true)} style={{
            padding: '9px 18px', background: 'var(--red)', border: 'none', color: '#fff',
            fontFamily: 'Space Mono', fontSize: '9px', letterSpacing: '0.1em', cursor: 'pointer',
          }}>LOG IT →</button>
        </div>
      </div>
    </div>
  )
}

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
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 'calc(56px + env(safe-area-inset-top, 0px))',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: '24px', paddingRight: '24px',
        borderBottom: '1px solid var(--border)', background: 'rgba(26,26,26,0.95)',
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
      <div style={{ paddingTop: 'calc(56px + env(safe-area-inset-top, 0px))' }}>
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

          <DemoEntry />

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
