import StrategyCard from './StrategyCard'

export default function PublicStrategyPanel({ strategies = [] }) {
  if (strategies.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '44px', fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--dim)' }}>
        NO PUBLIC STRATEGIES SHARED YET.
      </div>
    )
  }

  return (
    <div>
      {strategies.map(strategy => (
        <StrategyCard key={strategy.id} strategy={strategy} />
      ))}
    </div>
  )
}
