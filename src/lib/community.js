export const CALLOUT_REASONS = [
  { key: 'late_entry', label: 'Late Entry', color: 'var(--gold)' },
  { key: 'no_invalidation', label: 'No Invalidation', color: 'var(--red)' },
  { key: 'oversized', label: 'Oversized', color: 'var(--red)' },
  { key: 'emotional_trade', label: 'Emotional Trade', color: 'var(--gold)' },
  { key: 'moved_stop', label: 'Moved Stop', color: 'var(--red)' },
  { key: 'good_loss', label: 'Good Loss', color: 'var(--green)' },
  { key: 'clean_execution', label: 'Clean Execution', color: 'var(--green)' },
  { key: 'strategy_mismatch', label: 'Strategy Mismatch', color: 'var(--gold)' },
  { key: 'other', label: 'Other', color: 'var(--dim)' },
]

export const calloutReasonByKey = Object.fromEntries(CALLOUT_REASONS.map(reason => [reason.key, reason]))

export function getCalloutReason(key) {
  return calloutReasonByKey[key] || calloutReasonByKey.other
}

export function calculateProfileStats({ entries = [], strategies = [], reflections = [] }) {
  const publicEntries = entries.filter(entry => entry.is_public)
  const tradesWithPnl = publicEntries.filter(entry => entry.pnl !== null && entry.pnl !== undefined)
  const wins = tradesWithPnl.filter(entry => Number(entry.pnl) > 0)
  const totalPnl = tradesWithPnl.reduce((sum, entry) => sum + Number(entry.pnl || 0), 0)
  const mindsetEntries = publicEntries.filter(entry => entry.mindset_rating)
  const avgMindset = mindsetEntries.length
    ? mindsetEntries.reduce((sum, entry) => sum + Number(entry.mindset_rating || 0), 0) / mindsetEntries.length
    : 0

  const strategyCounts = publicEntries.reduce((acc, entry) => {
    if (!entry.strategy_id) return acc
    acc[entry.strategy_id] = (acc[entry.strategy_id] || 0) + 1
    return acc
  }, {})
  const topStrategyId = Object.entries(strategyCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  const topStrategy = strategies.find(strategy => strategy.id === topStrategyId)

  const contextSplit = publicEntries.reduce((acc, entry) => {
    const key = entry.trade_context || 'personal_sim'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  return {
    publicTradeCount: publicEntries.length,
    winRate: tradesWithPnl.length ? Math.round((wins.length / tradesWithPnl.length) * 100) : 0,
    totalPnl,
    avgMindset: avgMindset ? avgMindset.toFixed(1) : '0.0',
    topStrategyName: topStrategy?.name || 'None yet',
    backtestCount: entries.filter(entry => entry.trade_context === 'backtest').length + reflections.length,
    contextSplit,
  }
}

export function isPublicStrategyViewable(strategy, userId) {
  return !!strategy && (strategy.user_id === userId || strategy.is_public)
}
