import { getTradeContext } from '../lib/discipline'

export default function ProfileStatsStrip({ stats }) {
  const cells = [
    { label: 'PUBLIC TRADES', value: stats.publicTradeCount },
    { label: 'WIN RATE', value: `${stats.winRate}%` },
    {
      label: 'PUBLIC P&L',
      value: `${stats.totalPnl >= 0 ? '+' : '-'}$${Math.abs(stats.totalPnl).toFixed(0)}`,
      color: stats.totalPnl >= 0 ? 'var(--green)' : 'var(--red)',
    },
    { label: 'AVG MINDSET', value: stats.avgMindset },
    { label: 'TOP STRATEGY', value: stats.topStrategyName },
    { label: 'BACKTEST WORK', value: stats.backtestCount },
  ]

  return (
    <div style={{ marginTop: '22px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1px', background: 'var(--border)', marginBottom: '10px' }}>
        {cells.map(cell => (
          <div key={cell.label} style={{ background: 'var(--dark)', padding: '13px', minHeight: '74px' }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: cell.value.length > 12 ? '1.25rem' : '1.6rem', lineHeight: 1, color: cell.color || 'var(--text)' }}>
              {cell.value}
            </div>
            <div style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--dim)', letterSpacing: '0.1em', marginTop: '6px' }}>{cell.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {Object.entries(stats.contextSplit).map(([key, count]) => {
          const context = getTradeContext(key)
          return <span key={key} className="tag" style={{ color: context.color, fontSize: '8px' }}>{context.shortLabel}: {count}</span>
        })}
      </div>
    </div>
  )
}
