import { useState } from 'react'
import { CALLOUT_REASONS } from '../lib/community'

export default function CalloutComposer({ onSubmit }) {
  const [reason, setReason] = useState('late_entry')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    if (!body.trim()) return
    setSaving(true)
    setError('')
    const result = await onSubmit({ reason, body: body.trim() })
    if (result?.error) setError(result.error)
    else setBody('')
    setSaving(false)
  }

  return (
    <form onSubmit={submit} className="callout-composer" style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', marginTop: '14px' }}>
      <div className="callout-composer-grid" style={{ display: 'grid', gridTemplateColumns: '170px 1fr auto', gap: '8px', alignItems: 'start' }}>
        <select value={reason} onChange={event => setReason(event.target.value)} style={{
          background: 'var(--black)', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px', fontSize: '12px',
        }}>
          {CALLOUT_REASONS.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
        </select>
        <input
          value={body}
          onChange={event => setBody(event.target.value)}
          placeholder="Make the callout useful..."
          style={{ background: 'var(--black)', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 11px', fontSize: '13px', outline: 'none' }}
        />
        <button type="submit" disabled={saving} className="btn btn-gold" style={{ padding: '9px 12px', fontSize: '10px' }}>
          {saving ? '...' : 'CALLOUT'}
        </button>
      </div>
      {error && <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--red)', marginTop: '8px' }}>{error}</div>}
    </form>
  )
}
