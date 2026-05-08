export const PINNED_RULE_CONTEXTS = [
  { key: 'global', label: 'Global' },
  { key: 'feed', label: 'Feed' },
  { key: 'journal', label: 'Journal' },
  { key: 'log_trade', label: 'Log Trade' },
  { key: 'backtesting', label: 'Backtesting' },
  { key: 'review', label: 'Review' },
]

export function contextLabel(key) {
  return PINNED_RULE_CONTEXTS.find(context => context.key === key)?.label || 'Global'
}
