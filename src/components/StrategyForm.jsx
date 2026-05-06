import { EMPTY_STRATEGY, STRATEGY_FIELDS } from '../lib/discipline'

const inputStyle = {
  width: '100%',
  background: 'var(--black)',
  border: '1px solid var(--border)',
  padding: '12px 14px',
  color: 'var(--text)',
  fontSize: '14px',
  outline: 'none',
}

const labelStyle = {
  fontFamily: 'Space Mono',
  fontSize: '10px',
  letterSpacing: '0.1em',
  color: 'var(--dim)',
  display: 'block',
  marginBottom: '8px',
  textTransform: 'uppercase',
}

export default function StrategyForm({ value = EMPTY_STRATEGY, onChange, onSubmit, loading, submitLabel = 'SAVE STRATEGY' }) {
  const set = (key, nextValue) => onChange({ ...value, [key]: nextValue })

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {STRATEGY_FIELDS.map(field => (
        <div key={field.key}>
          <label style={labelStyle}>{field.label}{field.required ? ' *' : ''}</label>
          {field.rows === 1 ? (
            <input
              value={value[field.key] || ''}
              onChange={event => set(field.key, event.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              style={inputStyle}
            />
          ) : (
            <textarea
              value={value[field.key] || ''}
              onChange={event => set(field.key, event.target.value)}
              placeholder={field.placeholder}
              rows={field.rows}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
          )}
        </div>
      ))}
      <button type="submit" disabled={loading} className="btn btn-red" style={{ width: '100%', justifyContent: 'center', padding: '15px' }}>
        {loading ? 'SAVING...' : submitLabel}
      </button>
    </form>
  )
}
