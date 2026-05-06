import { useState } from 'react'
import { getCalloutReason } from '../lib/community'

export default function CalloutThreadCard({ thread, session, entryUserId, onReply, onToggleResolved }) {
  const [reply, setReply] = useState('')
  const [saving, setSaving] = useState(false)
  const reason = getCalloutReason(thread.reason)
  const canResolve = thread.user_id === session.user.id || entryUserId === session.user.id

  const submitReply = async (event) => {
    event.preventDefault()
    if (!reply.trim()) return
    setSaving(true)
    await onReply(thread.id, reply.trim())
    setReply('')
    setSaving(false)
  }

  return (
    <div style={{ border: '1px solid var(--border)', padding: '14px', marginTop: '10px', opacity: thread.is_resolved ? 0.7 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <span className="tag" style={{ color: reason.color, fontSize: '8px' }}>{reason.label}</span>
          <span style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', marginLeft: '8px' }}>
            @{thread.profiles?.username || 'unknown'}
          </span>
        </div>
        {canResolve && (
          <button onClick={() => onToggleResolved(thread)} className={`btn ${thread.is_resolved ? 'btn-green' : ''}`} style={{ padding: '5px 8px', fontSize: '8px' }}>
            {thread.is_resolved ? 'RESOLVED' : 'RESOLVE'}
          </button>
        )}
      </div>
      <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text)', marginBottom: '10px' }}>{thread.body}</p>
      {(thread.callout_replies || []).map(replyRow => (
        <div key={replyRow.id} style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '8px' }}>
          <span style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--red)', marginRight: '8px' }}>@{replyRow.profiles?.username}</span>
          <span style={{ fontSize: '12px', color: 'var(--dim)' }}>{replyRow.body}</span>
        </div>
      ))}
      <form onSubmit={submitReply} style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
        <input
          value={reply}
          onChange={event => setReply(event.target.value)}
          placeholder="reply..."
          style={{ flex: 1, background: 'var(--black)', border: '1px solid var(--border)', color: 'var(--text)', padding: '7px 9px', fontSize: '12px', outline: 'none' }}
        />
        <button type="submit" disabled={saving} className="btn" style={{ padding: '7px 10px', fontSize: '9px' }}>{saving ? '...' : 'REPLY'}</button>
      </form>
    </div>
  )
}
