import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import { getTradeContext } from '../lib/discipline'
import CalloutThreadList from './CalloutThreadList'
import Avatar from './Avatar'

const haptic = (pattern = 10) => navigator.vibrate?.(pattern)

export default function EntryCard({ entry, session, showActions = true, onDeleteReflection = null, onDeleteEntry = null }) {
  const [comments, setComments] = useState([])
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [showCallouts, setShowCallouts] = useState(false)
  const [reactions, setReactions] = useState({ props: entry.props_count || 0, callout: entry.callout_count || 0 })
  const [userReaction, setUserReaction] = useState(entry.user_reaction || null)
  const [pitBossLoading, setPitBossLoading] = useState(false)
  const [pitBossResponse, setPitBossResponse] = useState(null)
  const [isPublic, setIsPublic] = useState(!!entry.is_public)
  const [swipeFlash, setSwipeFlash] = useState(null)  // 'props' | 'callout' | null
  const swipeStart = useRef(null)

  const pnl = entry.pnl || 0
  const context = getTradeContext(entry.trade_context)
  const pnlLabel = pnl > 0 ? `+$${pnl.toFixed(2)}` : pnl < 0 ? `-$${Math.abs(pnl).toFixed(2)}` : '$0.00'
  const hasJournalNotes = !!entry.reflection || !!entry.what_id_do_differently
  const canDeleteJournalNotes = !!onDeleteReflection && entry.user_id === session.user.id && hasJournalNotes

  const loadComments = async () => {
    if (showComments) { setShowComments(false); return }
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(username, avatar_url)')
      .eq('entry_id', entry.id)
      .order('created_at', { ascending: true })
    setComments(data || [])
    setShowComments(true)
  }

  const submitComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    const { data } = await supabase
      .from('comments')
      .insert({ entry_id: entry.id, user_id: session.user.id, body: commentText.trim() })
      .select('*, profiles(username, avatar_url)')
      .single()
    if (data) setComments(prev => [...prev, data])
    setCommentText('')
  }

  const handleReaction = async (type) => {
    haptic(10)
    if (userReaction === type) {
      await supabase.from('reactions').delete().match({ entry_id: entry.id, user_id: session.user.id })
      setReactions(prev => ({ ...prev, [type]: prev[type] - 1 }))
      setUserReaction(null)
    } else {
      if (userReaction) {
        await supabase.from('reactions').delete().match({ entry_id: entry.id, user_id: session.user.id })
        setReactions(prev => ({ ...prev, [userReaction]: prev[userReaction] - 1 }))
      }
      await supabase.from('reactions').upsert({ entry_id: entry.id, user_id: session.user.id, type })
      setReactions(prev => ({ ...prev, [type]: prev[type] + 1 }))
      setUserReaction(type)
    }
  }

  const swipeHandlers = {
    onTouchStart: (e) => { swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } },
    onTouchEnd: (e) => {
      if (!swipeStart.current) return
      const dx = e.changedTouches[0].clientX - swipeStart.current.x
      const dy = Math.abs(e.changedTouches[0].clientY - swipeStart.current.y)
      swipeStart.current = null
      if (dy > 30 || Math.abs(dx) < 60) return
      const type = dx > 0 ? 'props' : 'callout'
      setSwipeFlash(type)
      setTimeout(() => setSwipeFlash(null), 600)
      handleReaction(type)
    },
  }

  const getPitBossRoast = async () => {
    if (!entry.reflection) return
    haptic([10, 60, 20])
    setPitBossLoading(true)
    setPitBossResponse(null)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          messages: [{
            role: 'user',
            content: `You are The Pit Boss — a brutally honest trading coach. No sugarcoating, no corporate speak. Read this trader's reflection and give them real, direct feedback. Call out cope, emotional trading, bad habits. Give credit where it's genuinely due. Keep it under 150 words. Be direct, not mean.

Trade: ${entry.symbol} ${entry.direction?.toUpperCase()}
P&L: ${pnlLabel}
Mindset rating they gave themselves: ${entry.mindset_rating}/10
Reflection: ${entry.reflection}
What they'd do differently: ${entry.what_id_do_differently || 'nothing stated'}

Give your honest assessment:`
          }]
        })
      })
      const data = await res.json()
      setPitBossResponse(data.content?.[0]?.text || 'No response.')
    } catch {
      setPitBossResponse('Pit Boss is offline right now.')
    }
    setPitBossLoading(false)
  }

  const togglePublic = async () => {
    const next = !isPublic
    const { data } = await supabase
      .from('entries')
      .update({ is_public: next })
      .eq('id', entry.id)
      .eq('user_id', session.user.id)
      .select('is_public')
      .single()
    if (data) setIsPublic(data.is_public)
  }

  return (
    <div
      className={`card fade-in entry-card${swipeFlash ? ` card-swipe-flash card-swipe-flash--${swipeFlash}` : ''}`}
      style={{ padding: '24px', marginBottom: '16px', position: 'relative' }}
      {...swipeHandlers}
    >
      {swipeFlash && (
        <div className="card-swipe-indicator">
          {swipeFlash === 'props' ? '🤜 PROPS' : '⚡ CALLOUT'}
        </div>
      )}
      {/* header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link to={`/profile/${entry.profiles?.username}`}>
            <Avatar url={entry.profiles?.avatar_url} username={entry.profiles?.username} size={30} />
          </Link>
          <div>
            <Link to={`/profile/${entry.profiles?.username}`} style={{ fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--text)', letterSpacing: '0.05em' }}>
              @{entry.profiles?.username || 'unknown'}
            </Link>
            <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', letterSpacing: '0.06em', marginTop: '1px' }}>
              {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {entry.direction && (
            <span className="tag" style={{ color: entry.direction === 'long' ? 'var(--green)' : 'var(--red)', fontSize: '9px' }}>
              {entry.direction.toUpperCase()}
            </span>
          )}
          <span className="tag" style={{ color: context.color, fontSize: '9px' }}>{context.shortLabel}</span>
          {entry.strategies?.name && (
            <Link to={`/strategies/${entry.strategy_id}`} className="tag" style={{ color: 'var(--gold)', fontSize: '9px' }}>
              {entry.strategies.name}
            </Link>
          )}
          <span className="tag" style={{ color: 'var(--dim)', fontSize: '9px' }}>{entry.symbol}</span>
          {onDeleteEntry && entry.user_id === session.user.id && (
            <button
              type="button"
              onClick={() => onDeleteEntry(entry)}
              className="entry-trash-btn"
              aria-label="Delete journal entry"
              title="Delete journal entry"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M6 6l1 15h10l1-15" />
                <path d="M10 10v7" />
                <path d="M14 10v7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* p&l row */}
      <div className="entry-metrics-row" style={{ display: 'flex', gap: '24px', marginBottom: '16px', alignItems: 'baseline' }}>
        <div>
          <div className={`pnl-${pnl > 0 ? 'positive' : pnl < 0 ? 'negative' : 'neutral'}`}
            style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', letterSpacing: '0.05em', lineHeight: 1 }}>
            {pnlLabel}
          </div>
          <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', letterSpacing: '0.1em' }}>P&L</div>
        </div>
        {entry.entry_price && (
          <div>
            <div style={{ fontFamily: 'Space Mono', fontSize: '12px', color: 'var(--dim)' }}>{entry.entry_price}</div>
            <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.08em' }}>ENTRY</div>
          </div>
        )}
        {entry.exit_price && (
          <div>
            <div style={{ fontFamily: 'Space Mono', fontSize: '12px', color: 'var(--dim)' }}>{entry.exit_price}</div>
            <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.08em' }}>EXIT</div>
          </div>
        )}
        {entry.mindset_rating && (
          <div>
            <div style={{ fontFamily: 'Space Mono', fontSize: '12px', color: 'var(--dim)' }}>{entry.mindset_rating}/10</div>
            <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.08em' }}>MINDSET</div>
          </div>
        )}
      </div>

      {/* chart image */}
      {entry.chart_url && (
        <img src={entry.chart_url} alt="chart" style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', marginBottom: '16px', border: '1px solid var(--border)' }} />
      )}

      {hasJournalNotes && (
        <div className={`journal-reflection-block ${!entry.reflection ? 'only-difference' : ''}`}>
          {entry.reflection && (
            <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--dim)', marginBottom: '12px' }}>
              {entry.reflection}
            </p>
          )}
          {canDeleteJournalNotes && (
            <button
              type="button"
              onClick={() => onDeleteReflection(entry)}
              className="reflection-trash-btn"
              aria-label="Delete reflection"
              title="Delete reflection"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M6 6l1 15h10l1-15" />
                <path d="M10 10v7" />
                <path d="M14 10v7" />
              </svg>
            </button>
          )}
        </div>
      )}

      {entry.what_id_do_differently && (
        <div style={{ borderLeft: '2px solid var(--red)', paddingLeft: '12px', marginBottom: '16px', paddingRight: canDeleteJournalNotes && !entry.reflection ? '34px' : 0 }}>
          <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--red)', letterSpacing: '0.1em', marginBottom: '4px' }}>WHAT I'D DO DIFFERENTLY</div>
          <p style={{ fontSize: '13px', color: 'var(--dim)', lineHeight: 1.6 }}>{entry.what_id_do_differently}</p>
        </div>
      )}

      {pitBossResponse && (
        <div style={{ background: 'var(--dark)', border: '1px solid var(--red)', padding: '16px', marginBottom: '16px' }}>
          <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--red)', letterSpacing: '0.15em', marginBottom: '10px' }}>⚡ PIT BOSS</div>
          <p style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--dim)' }}>{pitBossResponse}</p>
        </div>
      )}

      {showActions && (
        <div className="entry-action-bar" style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <button onClick={() => handleReaction('props')} className="btn" style={{
            padding: '6px 12px', fontSize: '10px',
            color: userReaction === 'props' ? 'var(--green)' : 'var(--dim)',
            borderColor: userReaction === 'props' ? 'var(--green)' : 'var(--border)',
          }}>
            PROPS {reactions.props > 0 && reactions.props}
          </button>
          <button onClick={() => handleReaction('callout')} className="btn" style={{
            padding: '6px 12px', fontSize: '10px',
            color: userReaction === 'callout' ? 'var(--gold)' : 'var(--dim)',
            borderColor: userReaction === 'callout' ? 'var(--gold)' : 'var(--border)',
          }}>
            CALLOUT {reactions.callout > 0 && reactions.callout}
          </button>
          <button onClick={() => setShowCallouts(prev => !prev)} className="btn btn-gold" style={{ padding: '6px 12px', fontSize: '10px' }}>
            REVIEW THREADS
          </button>
          <button onClick={loadComments} className="btn" style={{ padding: '6px 12px', fontSize: '10px', color: 'var(--dim)', borderColor: 'var(--border)' }}>
            {showComments ? 'HIDE COMMENTS' : 'COMMENTS'}
          </button>
          {entry.reflection && (
            <button onClick={getPitBossRoast} disabled={pitBossLoading} className="btn btn-red" style={{ padding: '6px 12px', fontSize: '10px' }}>
              {pitBossLoading ? '...' : '⚡ PIT BOSS'}
            </button>
          )}
          {entry.user_id === session.user.id && (
            <button onClick={togglePublic} className={`btn ${isPublic ? 'btn-green' : ''}`} style={{ padding: '6px 12px', fontSize: '10px' }}>
              {isPublic ? 'ON FLOOR' : 'POST TO FLOOR'}
            </button>
          )}
        </div>
      )}

      {showCallouts && <CalloutThreadList entry={entry} session={session} />}

      {showComments && (
        <div style={{ marginTop: '16px' }}>
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 0', borderTop: '1px solid var(--border)' }}>
              <Avatar url={c.profiles?.avatar_url} username={c.profiles?.username} size={24} />
              <div>
                <span style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--red)', marginRight: '10px' }}>@{c.profiles?.username}</span>
                <span style={{ fontSize: '13px', color: 'var(--dim)' }}>{c.body}</span>
              </div>
            </div>
          ))}
          <form onSubmit={submitComment} className="comment-form" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="be real..."
              style={{
                flex: 1, background: 'var(--dark)', border: '1px solid var(--border)',
                padding: '8px 12px', color: 'var(--text)', fontSize: '13px', outline: 'none',
              }}
            />
            <button type="submit" className="btn" style={{ padding: '8px 16px', fontSize: '10px' }}>POST</button>
          </form>
        </div>
      )}
    </div>
  )
}


