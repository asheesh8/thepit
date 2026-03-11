import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

export default function EntryCard({ entry, session, showActions = true }) {
  const [comments, setComments] = useState([])
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [reactions, setReactions] = useState({ props: entry.props_count || 0, callout: entry.callout_count || 0 })
  const [userReaction, setUserReaction] = useState(entry.user_reaction || null)
  const [pitBossLoading, setPitBossLoading] = useState(false)
  const [pitBossResponse, setPitBossResponse] = useState(null)

  const pnl = entry.pnl || 0
  const pnlClass = pnl > 0 ? 'pnl-positive' : pnl < 0 ? 'pnl-negative' : 'pnl-neutral'
  const pnlLabel = pnl > 0 ? `+$${pnl.toFixed(2)}` : pnl < 0 ? `-$${Math.abs(pnl).toFixed(2)}` : '$0.00'

  const loadComments = async () => {
    if (showComments) { setShowComments(false); return }
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(username)')
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
      .select('*, profiles(username)')
      .single()
    if (data) setComments(prev => [...prev, data])
    setCommentText('')
  }

  const handleReaction = async (type) => {
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

  const getPitBossRoast = async () => {
    if (!entry.reflection) return
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
    } catch (err) {
      setPitBossResponse('Pit Boss is offline right now.')
    }
    setPitBossLoading(false)
  }

  return (
    <div className="card fade-in" style={{ padding: '24px', marginBottom: '16px' }}>
      {/* header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link to={`/profile/${entry.profiles?.username}`} style={{ fontFamily: 'Space Mono', fontSize: '12px', color: '#888880', letterSpacing: '0.05em' }}>
            @{entry.profiles?.username || 'unknown'}
          </Link>
          <span style={{ color: '#2a2a2a' }}>·</span>
          <span style={{ fontFamily: 'Space Mono', fontSize: '10px', color: '#444440' }}>
            {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {entry.direction && (
            <span className="tag" style={{ color: entry.direction === 'long' ? '#2ec4b6' : '#e63946', fontSize: '9px' }}>
              {entry.direction.toUpperCase()}
            </span>
          )}
          <span className="tag" style={{ color: '#888880', fontSize: '9px' }}>{entry.symbol}</span>
        </div>
      </div>

      {/* p&l row */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', alignItems: 'baseline' }}>
        <div>
          <div className={`pnl-${pnl > 0 ? 'positive' : pnl < 0 ? 'negative' : 'neutral'}`}
            style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', letterSpacing: '0.05em', lineHeight: 1 }}>
            {pnlLabel}
          </div>
          <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: '#444440', letterSpacing: '0.1em' }}>P&L</div>
        </div>
        {entry.entry_price && (
          <div>
            <div style={{ fontFamily: 'Space Mono', fontSize: '12px', color: '#888880' }}>{entry.entry_price}</div>
            <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: '#444440' }}>ENTRY</div>
          </div>
        )}
        {entry.exit_price && (
          <div>
            <div style={{ fontFamily: 'Space Mono', fontSize: '12px', color: '#888880' }}>{entry.exit_price}</div>
            <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: '#444440' }}>EXIT</div>
          </div>
        )}
        {entry.mindset_rating && (
          <div>
            <div style={{ fontFamily: 'Space Mono', fontSize: '12px', color: '#888880' }}>{entry.mindset_rating}/10</div>
            <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: '#444440' }}>MINDSET</div>
          </div>
        )}
      </div>

      {/* chart image */}
      {entry.chart_url && (
        <img src={entry.chart_url} alt="chart" style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', marginBottom: '16px', border: '1px solid #242424' }} />
      )}

      {/* reflection */}
      {entry.reflection && (
        <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#c0c0b8', marginBottom: '12px' }}>
          {entry.reflection}
        </p>
      )}

      {/* what i'd do differently */}
      {entry.what_id_do_differently && (
        <div style={{ borderLeft: '2px solid #e63946', paddingLeft: '12px', marginBottom: '16px' }}>
          <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: '#e63946', letterSpacing: '0.1em', marginBottom: '4px' }}>WHAT I'D DO DIFFERENTLY</div>
          <p style={{ fontSize: '13px', color: '#888880', lineHeight: 1.6 }}>{entry.what_id_do_differently}</p>
        </div>
      )}

      {/* pit boss response */}
      {pitBossResponse && (
        <div style={{ background: '#0f0f0f', border: '1px solid #e63946', padding: '16px', marginBottom: '16px' }}>
          <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: '#e63946', letterSpacing: '0.15em', marginBottom: '10px' }}>⚡ PIT BOSS</div>
          <p style={{ fontSize: '13px', lineHeight: 1.7, color: '#c0c0b8' }}>{pitBossResponse}</p>
        </div>
      )}

      {/* action bar */}
      {showActions && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #1a1a1a', flexWrap: 'wrap' }}>
          <button onClick={() => handleReaction('props')} className="btn" style={{
            padding: '6px 12px', fontSize: '10px',
            color: userReaction === 'props' ? '#2ec4b6' : '#444440',
            borderColor: userReaction === 'props' ? '#2ec4b6' : '#242424',
          }}>
            🤝 PROPS {reactions.props > 0 && reactions.props}
          </button>
          <button onClick={() => handleReaction('callout')} className="btn" style={{
            padding: '6px 12px', fontSize: '10px',
            color: userReaction === 'callout' ? '#f4a261' : '#444440',
            borderColor: userReaction === 'callout' ? '#f4a261' : '#242424',
          }}>
            👁 CALLOUT {reactions.callout > 0 && reactions.callout}
          </button>
          <button onClick={loadComments} className="btn" style={{ padding: '6px 12px', fontSize: '10px', color: '#444440', borderColor: '#242424' }}>
            💬 {showComments ? 'HIDE' : 'COMMENTS'}
          </button>
          {entry.reflection && (
            <button onClick={getPitBossRoast} disabled={pitBossLoading} className="btn btn-red" style={{ padding: '6px 12px', fontSize: '10px' }}>
              {pitBossLoading ? '...' : '⚡ PIT BOSS'}
            </button>
          )}
        </div>
      )}

      {/* comments section */}
      {showComments && (
        <div style={{ marginTop: '16px' }}>
          {comments.map(c => (
            <div key={c.id} style={{ padding: '10px 0', borderTop: '1px solid #1a1a1a' }}>
              <span style={{ fontFamily: 'Space Mono', fontSize: '10px', color: '#e63946', marginRight: '10px' }}>@{c.profiles?.username}</span>
              <span style={{ fontSize: '13px', color: '#888880' }}>{c.body}</span>
            </div>
          ))}
          <form onSubmit={submitComment} style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="be real..."
              style={{
                flex: 1, background: '#111', border: '1px solid #242424',
                padding: '8px 12px', color: '#e8e8e0', fontSize: '13px', outline: 'none',
              }}
            />
            <button type="submit" className="btn" style={{ padding: '8px 16px', fontSize: '10px' }}>POST</button>
          </form>
        </div>
      )}
    </div>
  )
}
