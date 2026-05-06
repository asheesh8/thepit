import { Link } from 'react-router-dom'

export default function StrategyCard({ strategy, entryCount = 0, reflectionCount = 0 }) {
  return (
    <Link to={`/strategies/${strategy.id}`} className="card fade-in" style={{ display: 'block', padding: '20px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <h2 style={{ fontSize: '2rem', lineHeight: 1, color: 'var(--text)' }}>{strategy.name}</h2>
          <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.08em', marginTop: '4px' }}>
            {(strategy.market || 'MARKET TBD').toUpperCase()} {strategy.timeframes ? ` / ${strategy.timeframes.toUpperCase()}` : ''}
          </div>
        </div>
        <span className="tag" style={{ color: 'var(--red)', whiteSpace: 'nowrap' }}>PLAYBOOK</span>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--dim)', lineHeight: 1.6, marginBottom: '14px' }}>
        {strategy.setup_conditions || strategy.entry_rules || 'No rules written yet. Open this strategy and make it obeyable.'}
      </p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <span className="tag" style={{ color: 'var(--green)' }}>{entryCount} TRADES</span>
        <span className="tag" style={{ color: 'var(--gold)' }}>{reflectionCount} REFLECTIONS</span>
      </div>
    </Link>
  )
}
