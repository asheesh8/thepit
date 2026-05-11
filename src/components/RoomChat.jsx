import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function RoomChat({ roomId, session, messages, onRefresh, embedded = false, title = 'MESSAGES', fullHeight = false, isDm = false }) {
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const bottomRef = useRef(null)

  // Auto-scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: messages.length <= 1 ? 'instant' : 'smooth' })
  }, [messages])

  const send = async (e) => {
    e?.preventDefault()
    if (!body.trim() || saving) return
    setSaving(true)
    await supabase.from('live_room_messages').insert({ room_id: roomId, user_id: session.user.id, body: body.trim() })
    await supabase.from('live_rooms').update({ updated_at: new Date().toISOString() }).eq('id', roomId)
    setBody('')
    setSaving(false)
    onRefresh?.({ kind: 'chat' })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  // Group consecutive messages from same sender; split on >10 min gap
  const grouped = messages.map((msg, i) => {
    const prev = messages[i - 1]
    const next = messages[i + 1]
    const gap = prev ? (new Date(msg.created_at) - new Date(prev.created_at)) > 10 * 60 * 1000 : true
    const isFirst = !prev || prev.user_id !== msg.user_id || gap
    const isLast = !next || next.user_id !== msg.user_id ||
      (next ? (new Date(next.created_at) - new Date(msg.created_at)) > 10 * 60 * 1000 : true)
    return { ...msg, isFirst, isLast }
  })

  const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  return (
    <section
      className={`room-chat ${fullHeight ? 'room-chat-full' : ''} ${embedded ? '' : 'card'}`}
      style={{ padding: embedded ? 0 : '14px' }}
    >
      {title && <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>{title}</h3>}

      <div className={`dm-message-list ${fullHeight ? 'full' : ''}`}>
        {messages.length === 0 ? (
          <div className="dm-empty-hint">SAY SOMETHING</div>
        ) : grouped.map((msg) => {
          const isOwn = msg.user_id === session.user.id
          return (
            <div
              key={msg.id}
              className={`dm-msg-row${isOwn ? ' dm-msg-own' : ''}${msg.isFirst ? ' dm-msg-first' : ' dm-msg-cont'}`}
            >
              {/* Avatar — only for other people, visible on first of group */}
              {!isOwn && (
                <div
                  className="dm-msg-avatar"
                  style={{
                    background: msg.profiles?.avatar_url ? `url(${msg.profiles.avatar_url}) center/cover` : 'var(--black)',
                    visibility: msg.isFirst ? 'visible' : 'hidden',
                  }}
                >
                  {!msg.profiles?.avatar_url && msg.profiles?.username?.slice(0, 1).toUpperCase()}
                </div>
              )}

              <div className="dm-msg-content">
                {/* Sender name — only in group chats, first bubble of run */}
                {!isOwn && msg.isFirst && !isDm && (
                  <div className="dm-msg-sender">@{msg.profiles?.username}</div>
                )}

                <div className={`dm-msg-bubble${isOwn ? ' dm-msg-bubble-own' : ' dm-msg-bubble-other'}`}>
                  {msg.body}
                </div>

                {/* Timestamp — only on last bubble of each run */}
                {msg.isLast && (
                  <div className={`dm-msg-time${isOwn ? ' dm-msg-time-own' : ''}`}>
                    {fmtTime(msg.created_at)}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      <form onSubmit={send} className="dm-message-form">
        <input
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          autoComplete="off"
        />
        <button type="submit" disabled={saving || !body.trim()} className="btn btn-green dm-send-btn">
          {saving ? '···' : '↑'}
        </button>
      </form>
    </section>
  )
}
