import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RoomChat({ roomId, session, messages, onRefresh }) {
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)

  const send = async (event) => {
    event.preventDefault()
    if (!body.trim()) return
    setSaving(true)
    await supabase.from('live_room_messages').insert({ room_id: roomId, user_id: session.user.id, body: body.trim() })
    setBody('')
    setSaving(false)
    onRefresh?.({ kind: 'chat' })
  }

  return (
    <section className="card" style={{ padding: '14px' }}>
      <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>CHAT</h3>
      <div style={{ maxHeight: '220px', overflow: 'auto', marginBottom: '10px' }}>
        {messages.length === 0 ? (
          <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)' }}>NO ROOM CHAT YET.</div>
        ) : messages.map(message => (
          <div key={message.id} style={{ borderTop: '1px solid var(--border)', padding: '8px 0' }}>
            <span style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--red)', marginRight: '8px' }}>@{message.profiles?.username || 'user'}</span>
            <span style={{ fontSize: '12px', color: 'var(--text)' }}>{message.body}</span>
          </div>
        ))}
      </div>
      <form onSubmit={send} style={{ display: 'flex', gap: '8px' }}>
        <input value={body} onChange={event => setBody(event.target.value)} placeholder="drop a note..." style={{ flex: 1, background: 'var(--black)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 10px', outline: 'none' }} />
        <button type="submit" disabled={saving} className="btn" style={{ padding: '8px 12px', fontSize: '9px' }}>{saving ? '...' : 'SEND'}</button>
      </form>
    </section>
  )
}
