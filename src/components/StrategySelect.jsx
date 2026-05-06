export default function StrategySelect({ value, onChange, strategies = [], loading, error, strongPrompt = false }) {
  return (
    <div>
      <select
        value={value || ''}
        onChange={event => onChange(event.target.value || null)}
        disabled={loading || strategies.length === 0}
        style={{
          width: '100%',
          background: 'var(--black)',
          border: strongPrompt ? '1px solid var(--red)' : '1px solid var(--border)',
          padding: '12px 14px',
          color: 'var(--text)',
          fontSize: '14px',
          outline: 'none',
        }}
      >
        <option value="">{loading ? 'Loading strategies...' : 'No strategy linked'}</option>
        {strategies.map(strategy => (
          <option key={strategy.id} value={strategy.id}>{strategy.name}</option>
        ))}
      </select>
      {strongPrompt && !value && (
        <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--red)', marginTop: '6px', letterSpacing: '0.08em' }}>
          BACKTESTS HIT HARDER WHEN THEY ARE TIED TO A STRATEGY.
        </div>
      )}
      {error && (
        <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--gold)', marginTop: '6px', letterSpacing: '0.08em' }}>
          STRATEGIES UNAVAILABLE. YOU CAN STILL LOG THE TRADE.
        </div>
      )}
    </div>
  )
}
