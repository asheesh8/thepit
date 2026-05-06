import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RoomActionItems({ roomId, session, items, onRefresh }) {
  const [body, setBody] = useState('')

  const add = async (event) => {
    event.preventDefault()
    if (!body.trim()) return
    await supabase.from('live_room_action_items').insert({ room_id: roomId, user_id: session.user.id, body: body.trim() })
    setBody('')
    onRefresh?.({ kind: 'actions' })
  }

  const toggle = async (item) => {
    await supabase.from('live_room_action_items').update({ is_done: !item.is_done, updated_at: new Date().toISOString() }).eq('id', item.id)
    onRefresh?.({ kind: 'actions' })
  }

  return (
    <section className="card" style={{ padding: '14px' }}>
      <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>FOLLOW-THROUGH</h3>
      {items.length === 0 ? (
        <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', marginBottom: '10px' }}>NO ACTION ITEMS YET.</div>
      ) : items.map(item => (
        <button key={item.id} onClick={() => toggle(item)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', borderTop: '1px solid var(--border)', padding: '8px 0', color: item.is_done ? 'var(--green)' : 'var(--text)', fontSize: '12px' }}>
          {item.is_done ? '[DONE] ' : '[ ] '} {item.body}
        </button>
      ))}
      <form onSubmit={add} style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
        <input value={body} onChange={event => setBody(event.target.value)} placeholder="next action..." style={{ flex: 1, background: 'var(--black)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 10px', outline: 'none' }} />
        <button className="btn" style={{ padding: '8px 12px', fontSize: '9px' }}>ADD</button>
      </form>
    </section>
  )
}
