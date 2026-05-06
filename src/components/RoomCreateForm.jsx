import { useEffect, useState } from 'react'
import { ROOM_TYPES } from '../lib/liveRooms'
import { supabase } from '../lib/supabase'

const inputStyle = {
  width: '100%',
  background: 'var(--black)',
  border: '1px solid var(--border)',
  padding: '11px 12px',
  color: 'var(--text)',
  fontSize: '13px',
  outline: 'none',
}

const labelStyle = {
  fontFamily: 'Space Mono',
  fontSize: '9px',
  color: 'var(--dim)',
  letterSpacing: '0.1em',
  display: 'block',
  marginBottom: '6px',
}

export default function RoomCreateForm({ session, onCreate }) {
  const [form, setForm] = useState({
    title: '',
    room_type: 'trade_review',
    room_password: '',
    linked_entry_id: '',
    linked_strategy_id: '',
    agenda: '',
  })
  const [entries, setEntries] = useState([])
  const [strategies, setStrategies] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('entries').select('id, symbol, created_at').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(30),
      supabase.from('strategies').select('id, name').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(30),
    ]).then(([entryResult, strategyResult]) => {
      setEntries(entryResult.data || [])
      setStrategies(strategyResult.data || [])
    })
  }, [session.user.id])

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const result = await onCreate({
      ...form,
      linked_entry_id: form.linked_entry_id || null,
      linked_strategy_id: form.linked_strategy_id || null,
    })
    if (result?.error) setError(result.error)
    setSaving(false)
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: '20px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <label style={labelStyle}>ROOM TITLE</label>
        <input value={form.title} onChange={event => set('title', event.target.value)} required placeholder="NQ London review desk" style={inputStyle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '12px' }}>
        <div>
          <label style={labelStyle}>ROOM TYPE</label>
          <select value={form.room_type} onChange={event => set('room_type', event.target.value)} style={inputStyle}>
            {ROOM_TYPES.map(type => <option key={type.key} value={type.key}>{type.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>PASSWORD OPTIONAL</label>
          <input value={form.room_password} onChange={event => set('room_password', event.target.value)} placeholder="leave open or set code" style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={labelStyle}>LINK TRADE</label>
          <select value={form.linked_entry_id} onChange={event => set('linked_entry_id', event.target.value)} style={inputStyle}>
            <option value="">No linked trade</option>
            {entries.map(entry => <option key={entry.id} value={entry.id}>{entry.symbol} / {new Date(entry.created_at).toLocaleDateString()}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>LINK STRATEGY</label>
          <select value={form.linked_strategy_id} onChange={event => set('linked_strategy_id', event.target.value)} style={inputStyle}>
            <option value="">No linked strategy</option>
            {strategies.map(strategy => <option key={strategy.id} value={strategy.id}>{strategy.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label style={labelStyle}>AGENDA</label>
        <textarea value={form.agenda} onChange={event => set('agenda', event.target.value)} rows={3} placeholder="What are we reviewing and what decision should come out of this room?" style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
      </div>
      {error && <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--red)' }}>{error}</div>}
      <button type="submit" disabled={saving} className="btn btn-red" style={{ justifyContent: 'center', padding: '13px' }}>{saving ? 'CREATING...' : 'CREATE LIVE ROOM'}</button>
    </form>
  )
}
