import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import Avatar from './Avatar'
import { ensureProfile } from '../lib/ensureProfile'

const haptic = (pattern = 10) => navigator.vibrate?.(pattern)

export default function PostCard({ post, session }) {
  const [comments, setComments] = useState([])
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [reactions, setReactions] = useState({ props: post.props_count || 0, callout: post.callout_count || 0 })
  const [userReaction, setUserReaction] = useState(post.user_reaction || null)
  const [error, setError] = useState('')
  const [lightbox, setLightbox] = useState(false)
  const [swipeFlash, setSwipeFlash] = useState(null)
  const swipeStart = useRef(null)

  const isVideo = post.media_url?.match(/\.(mp4|webm|mov)$/i)

  const loadComments = async () => {
    if (showComments) { setShowComments(false); return }
    setError('')
    const { data, error: loadError } = await supabase
      .from('post_comments')
      .select('*, profiles(username, avatar_url)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
    if (loadError) {
      setError(loadError.message)
      return
    }
    setComments(data || [])
    setShowComments(true)
  }

  const submitComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setError('')
    await ensureProfile(session)
    const { data, error: insertError } = await supabase
      .from('post_comments')
      .insert({ post_id: post.id, user_id: session.user.id, body: commentText.trim() })
      .select('*, profiles(username, avatar_url)')
      .single()
    if (insertError) {
      setError(insertError.message)
      return
    }
    if (data) setComments(prev => [...prev, data])
    setCommentText('')
  }

  const handleReaction = async (type) => {
    haptic(10)
    setError('')
    await ensureProfile(session)
    if (userReaction === type) {
      const { error: deleteError } = await supabase
        .from('post_reactions')
        .delete()
        .match({ post_id: post.id, user_id: session.user.id })
      if (deleteError) {
        setError(deleteError.message)
        return
      }
      setReactions(prev => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }))
      setUserReaction(null)
    } else {
      const previousReaction = userReaction
      if (userReaction) {
        const { error: deleteError } = await supabase
          .from('post_reactions')
          .delete()
          .match({ post_id: post.id, user_id: session.user.id })
        if (deleteError) {
          setError(deleteError.message)
          return
        }
      }
      const { error: upsertError } = await supabase
        .from('post_reactions')
        .upsert({ post_id: post.id, user_id: session.user.id, type }, { onConflict: 'post_id,user_id' })
      if (upsertError) {
        setError(upsertError.message)
        return
      }
      setReactions(prev => ({
        ...prev,
        ...(previousReaction ? { [previousReaction]: Math.max(0, prev[previousReaction] - 1) } : {}),
        [type]: prev[type] + 1,
      }))
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
      if (Math.abs(dx) < 90 || dy > Math.abs(dx) / 3) return
      const type = dx > 0 ? 'props' : 'callout'
      setSwipeFlash(type)
      setTimeout(() => setSwipeFlash(null), 600)
      handleReaction(type)
    },
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

      <div
        className={`card fade-in post-card${swipeFlash ? ` card-swipe-flash card-swipe-flash--${swipeFlash}` : ''}`}
        style={{ padding: '24px', marginBottom: '16px', position: 'relative' }}
        {...swipeHandlers}
      >
        {swipeFlash && (
          <div className="card-swipe-indicator">
            {swipeFlash === 'props' ? '🤜 PROPS' : '⚡ CALLOUT'}
          </div>
        )}
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Link to={`/profile/${post.profiles?.username}`}>
              <Avatar url={post.profiles?.avatar_url} username={post.profiles?.username} size={30} />
            </Link>
            <div>
              <Link to={`/profile/${post.profiles?.username}`} style={{ fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--text)', letterSpacing: '0.05em', display: 'block' }}>
                @{post.profiles?.username || 'unknown'}
              </Link>
              <span style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', letterSpacing: '0.06em' }}>
                {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
          <span className="tag" style={{ color: 'var(--dim)', fontSize: '9px', opacity: 0.5 }}>POST</span>
        </div>

        {/* body */}
        {post.body && (
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'var(--text)', marginBottom: post.media_url ? '16px' : '0' }}>
            {post.body}
          </p>
        )}

        {/* media - click to enlarge */}
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
              {isVideo ? 'PLAY' : 'EXPAND'}
            </div>
          </div>
        )}

        {/* action bar */}
        <div className="post-action-bar" style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
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
          <button onClick={loadComments} className="btn" style={{ padding: '6px 12px', fontSize: '10px', color: 'var(--dim)', borderColor: 'var(--border)' }}>
            {showComments ? 'HIDE COMMENTS' : 'COMMENTS'}
          </button>
        </div>

        {error && (
          <p role="alert" style={{ margin: '10px 0 0', fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--red)', letterSpacing: '0.08em' }}>
            {error.toUpperCase()}
          </p>
        )}

        {/* comments */}
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
    </>
  )
}
