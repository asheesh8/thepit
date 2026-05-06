/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RoomNotes({ room, canEdit, onSaved }) {
  const [notes, setNotes] = useState(room.notes || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setNotes(room.notes || '')
  }, [room.notes])

  const save = async () => {
    setSaving(true)
    const { data } = await supabase.from('live_rooms').update({ notes, updated_at: new Date().toISOString() }).eq('id', room.id).select('*').single()
    setSaving(false)
    if (data) onSaved?.({ kind: 'notes', room: data })
  }

  return (
    <section className="card" style={{ padding: '14px' }}>
      <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>ROOM NOTES</h3>
      <textarea value={notes} onChange={event => setNotes(event.target.value)} rows={5} placeholder="Save the actual takeaways..." disabled={!canEdit} style={{ width: '100%', background: 'var(--black)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px', resize: 'vertical', outline: 'none', lineHeight: 1.5 }} />
      <button onClick={save} disabled={saving || !canEdit} className="btn btn-green" style={{ marginTop: '8px', padding: '8px 12px', fontSize: '9px' }}>{saving ? 'SAVING...' : 'SAVE NOTES'}</button>
    </section>
  )
}
