import { TRADE_CONTEXTS } from '../lib/discipline'

export default function TradeContextPicker({ value, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
      {TRADE_CONTEXTS.map(context => (
        <button
          type="button"
          key={context.key}
          onClick={() => onChange(context.key)}
          style={{
            padding: '12px 8px',
            border: '1px solid',
            borderColor: value === context.key ? context.color : 'var(--border)',
            background: value === context.key ? 'rgba(230,57,70,0.08)' : 'transparent',
            color: value === context.key ? context.color : 'var(--dim)',
            fontFamily: 'Space Mono',
            fontSize: '10px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {context.shortLabel}
        </button>
      ))}
    </div>
  )
}
