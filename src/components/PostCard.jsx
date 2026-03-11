import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

export default function PostCard({ post, session }) {
  const [comments, setComments] = useState([])
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [reactions, setReactions] = useState({ props: post.props_count || 0, callout: post.callout_count || 0 })
  const [userReaction, setUserReaction] = useState(post.user_reaction || null)
  const [lightbox, setLightbox] = useState(false)

  const isVideo = post.media_url?.match(/\.(mp4|webm|mov)$/i)

  const loadComments = async () => {
    if (showComments) { setShowComments(false); return }
    const { data } = await supabase
      .from('post_comments')
      .select('*, profiles(username)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
    setComments(data || [])
    setShowComments(true)
  }

  const submitComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    const { data } = await supabase
      .from('post_comments')
      .insert({ post_id: post.id, user_id: session.user.id, body: commentText.trim() })
      .select('*, profiles(username)')
      .single()
    if (data) setComments(prev => [...prev, data])
    setCommentText('')
  }

  const handleReaction = async (type) => {
    if (userReaction === type) {
      await supabase.from('post_reactions').delete().match({ post_id: post.id, user_id: session.user.id })
      setReactions(prev => ({ ...prev, [type]: prev[type] - 1 }))
      setUserReaction(null)
    } else {
      if (userReaction) {
        await supabase.from('post_reactions').delete().match({ post_id: post.id, user_id: session.user.id })
        setReactions(prev => ({ ...prev, [userReaction]: prev[userReaction] - 1 }))
      }
      await supabase.from('post_reactions').upsert({ post_id: post.id, user_id: session.user.id, type })
      setReactions(prev => ({ ...prev, [type]: prev[type] + 1 }))
      setUserReaction(type)
    }
  }

  return (
    <>
      {/* lightbox overlay */}
      {lightbox && post.media_url && (
        <div onClick={() => setLightbox(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'zoom-out', padding: '24px',
        }}>
          <button onClick={() => setLightbox(false)} style={{
            position: 'absolute', top: '20px', right: '24px',
            background: 'none', border: '1px solid #444', color: '#fff',
            fontFamily: 'Space Mono', fontSize: '11px', padding: '6px 12px', cursor: 'pointer',
            letterSpacing: '0.1em',
          }}>ESC / CLOSE</button>
          {isVideo ? (
            <video src={post.media_url} controls autoPlay onClick={e => e.stopPropagation()}
              style={{ maxWidth: '90vw', maxHeight: '85vh', outline: 'none' }} />
          ) : (
            <img src={post.media_url} alt="media" onClick={e => e.stopPropagation()}
              style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain' }} />
          )}
        </div>
      )}

      <div className="card fade-in" style={{ padding: '24px', marginBottom: '16px' }}>
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link to={`/profile/${post.profiles?.username}`} style={{ fontFamily: 'Space Mono', fontSize: '12px', color: 'var(--dim)', letterSpacing: '0.05em' }}>
              @{post.profiles?.username || 'unknown'}
            </Link>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', opacity: 0.6 }}>
              {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <span className="tag" style={{ color: 'var(--dim)', fontSize: '9px', opacity: 0.5 }}>POST</span>
        </div>

        {/* body */}
        {post.body && (
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'var(--text)', marginBottom: post.media_url ? '16px' : '0' }}>
            {post.body}
          </p>
        )}

        {/* media — click to enlarge */}
        {post.media_url && (
          <div style={{ marginTop: '12px', position: 'relative', cursor: 'zoom-in' }} onClick={() => setLightbox(true)}>
            {isVideo ? (
              <video src={post.media_url} style={{ width: '100%', maxHeight: '320px', objectFit: 'cover', border: '1px solid var(--border)', display: 'block' }} />
            ) : (
              <img src={post.media_url} alt="post media" style={{ width: '100%', maxHeight: '320px', objectFit: 'cover', border: '1px solid var(--border)', display: 'block' }} />
            )}
            {/* zoom hint */}
            <div style={{
              position: 'absolute', bottom: '8px', right: '8px',
              background: 'rgba(0,0,0,0.6)', padding: '4px 8px',
              fontFamily: 'Space Mono', fontSize: '9px', color: '#fff', letterSpacing: '0.08em',
            }}>
              {isVideo ? '▶ PLAY' : '⤢ EXPAND'}
            </div>
          </div>
        )}

        {/* action bar */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          <button onClick={() => handleReaction('props')} className="btn" style={{
            padding: '6px 12px', fontSize: '10px',
            color: userReaction === 'props' ? 'var(--green)' : 'var(--dim)',
            borderColor: userReaction === 'props' ? 'var(--green)' : 'var(--border)',
          }}>
            🤝 PROPS {reactions.props > 0 && reactions.props}
          </button>
          <button onClick={() => handleReaction('callout')} className="btn" style={{
            padding: '6px 12px', fontSize: '10px',
            color: userReaction === 'callout' ? 'var(--gold)' : 'var(--dim)',
            borderColor: userReaction === 'callout' ? 'var(--gold)' : 'var(--border)',
          }}>
            👁 CALLOUT {reactions.callout > 0 && reactions.callout}
          </button>
          <button onClick={loadComments} className="btn" style={{ padding: '6px 12px', fontSize: '10px', color: 'var(--dim)', borderColor: 'var(--border)' }}>
            💬 {showComments ? 'HIDE' : 'COMMENTS'}
          </button>
        </div>

        {/* comments */}
        {showComments && (
          <div style={{ marginTop: '16px' }}>
            {comments.map(c => (
              <div key={c.id} style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--red)', marginRight: '10px' }}>@{c.profiles?.username}</span>
                <span style={{ fontSize: '13px', color: 'var(--dim)' }}>{c.body}</span>
              </div>
            ))}
            <form onSubmit={submitComment} style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
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
    </>
  )
}
