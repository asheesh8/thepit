import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RoomChat({ roomId, session, messages, onRefresh, embedded = false, title = 'MESSAGES', fullHeight = false }) {
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)

  const send = async (event) => {
    event.preventDefault()
    if (!body.trim()) return
    setSaving(true)
    await supabase.from('live_room_messages').insert({ room_id: roomId, user_id: session.user.id, body: body.trim() })
    await supabase.from('live_rooms').update({ updated_at: new Date().toISOString() }).eq('id', roomId)
    setBody('')
    setSaving(false)
    onRefresh?.({ kind: 'chat' })
  }

  return (
    <section className={`room-chat ${fullHeight ? 'room-chat-full' : ''} ${embedded ? '' : 'card'}`} style={{ padding: embedded ? 0 : '14px' }}>
      {title && <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>{title}</h3>}
      <div className={`dm-message-list ${fullHeight ? 'full' : ''}`}>
        {messages.length === 0 ? (
          <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)' }}>NO MESSAGES YET.</div>
        ) : messages.map(message => (
          <div key={message.id} className={`dm-message-row ${message.user_id === session.user.id ? 'own' : ''}`}>
            <div className="dm-message-avatar" style={{ background: message.profiles?.avatar_url ? `url(${message.profiles.avatar_url}) center/cover` : 'var(--black)' }}>
              {!message.profiles?.avatar_url && message.profiles?.username?.slice(0, 1).toUpperCase()}
            </div>
            <div className="dm-message-bubble">
              <div className="dm-message-meta">
                @{message.profiles?.username || 'user'} · {new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </div>
              <div>{message.body}</div>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="dm-message-form">
        <input value={body} onChange={event => setBody(event.target.value)} placeholder="message..." />
        <button type="submit" disabled={saving} className="btn btn-green" style={{ padding: '9px 12px', fontSize: '9px' }}>{saving ? '...' : 'SEND'}</button>
      </form>
    </section>
  )
}
