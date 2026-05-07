import { useState } from 'react'

const emptyForm = {
  title: '',
  body: '',
  sample_size: '',
  lesson: '',
  next_follow_through: '',
  is_public: false,
}

const inputStyle = {
  width: '100%',
  background: 'var(--black)',
  border: '1px solid var(--border)',
  padding: '10px 12px',
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

export default function BacktestReflectionComposer({ strategyId, onCreate }) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const result = await onCreate({
      ...form,
      strategy_id: strategyId,
      sample_size: form.sample_size ? Number(form.sample_size) : null,
    })
    if (result?.error) setError(result.error)
    else setForm(emptyForm)
    setSaving(false)
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
      <div>
        <label style={labelStyle}>REFLECTION TITLE</label>
        <input value={form.title} onChange={event => set('title', event.target.value)} required placeholder="Batch 1: London continuation test" style={inputStyle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px' }}>
        <div>
          <label style={labelStyle}>SAMPLE SIZE</label>
          <input type="number" min="0" value={form.sample_size} onChange={event => set('sample_size', event.target.value)} placeholder="20" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>LESSON</label>
          <input value={form.lesson} onChange={event => set('lesson', event.target.value)} placeholder="What did the sample prove?" style={inputStyle} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>BLOG-STYLE BREAKDOWN</label>
        <textarea value={form.body} onChange={event => set('body', event.target.value)} required rows={4} placeholder="What were you testing? What showed up? What are you tempted to change too early?" style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
      </div>
      <div>
        <label style={labelStyle}>NEXT FOLLOW-THROUGH</label>
        <textarea value={form.next_follow_through} onChange={event => set('next_follow_through', event.target.value)} rows={2} placeholder="One rule or observation to carry into the next batch." style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
      </div>
      <button
        type="button"
        onClick={() => set('is_public', !form.is_public)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px',
          alignItems: 'center',
          padding: '12px',
          border: '1px solid var(--border)',
          background: form.is_public ? 'rgba(230,57,70,0.1)' : 'transparent',
          color: form.is_public ? 'var(--red)' : 'var(--dim)',
          fontFamily: 'Space Mono',
          fontSize: '10px',
          letterSpacing: '0.08em',
        }}
      >
        <span>{form.is_public ? 'POST REFLECTION TO FLOOR' : 'KEEP REFLECTION PRIVATE'}</span>
        <span>{form.is_public ? 'PUBLIC' : 'PRIVATE'}</span>
      </button>
      {error && <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--red)' }}>{error}</div>}
      <button type="submit" disabled={saving} className="btn btn-red" style={{ justifyContent: 'center', fontSize: '11px' }}>
        {saving ? 'SAVING...' : 'ADD REFLECTION'}
      </button>
    </form>
  )
}
