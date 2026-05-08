export const TRADE_CONTEXTS = [
  { key: 'combine', label: 'Combine', shortLabel: 'COMBINE', color: 'var(--gold)' },
  { key: 'funded', label: 'Funded', shortLabel: 'FUNDED', color: 'var(--green)' },
  { key: 'backtest', label: 'Backtest', shortLabel: 'BACKTEST', color: 'var(--red)' },
  { key: 'personal_sim', label: 'Personal / Sim', shortLabel: 'SIM', color: 'var(--dim)' },
]

export const DEFAULT_TRADE_CONTEXT = 'personal_sim'

export const STRATEGY_FIELDS = [
  { key: 'name', label: 'Strategy Name', required: true, rows: 1, placeholder: 'London sweep into continuation' },
  { key: 'market', label: 'Market / Instrument', rows: 1, placeholder: 'NQ, ES, FX majors...' },
  { key: 'timeframes', label: 'Timeframes', rows: 1, placeholder: '15m bias, 5m setup, 1m execution' },
  { key: 'setup_conditions', label: 'Setup Conditions', rows: 4, placeholder: 'What has to be true before this trade exists?' },
  { key: 'entry_rules', label: 'Entry Rules', rows: 4, placeholder: 'Exact trigger. No vibes.' },
  { key: 'stop_rules', label: 'Stop Rules', rows: 3, placeholder: 'Where are you wrong?' },
  { key: 'take_profit_rules', label: 'Take-Profit Rules', rows: 3, placeholder: 'How do you take money out?' },
  { key: 'invalidation_rules', label: 'Invalidation Rules', rows: 3, placeholder: 'Do not trade this when...' },
  { key: 'risk_rules', label: 'Risk Rules', rows: 3, placeholder: 'Max risk, max attempts, daily limits.' },
  { key: 'mistakes_to_avoid', label: 'Mistakes To Avoid', rows: 3, placeholder: 'Late entries, chasing displacement, moving stops...' },
  { key: 'example_notes', label: 'Example Notes', rows: 3, placeholder: 'Screenshots, model examples, session notes.' },
  { key: 'mantra', label: 'Mantra', rows: 2, placeholder: 'One clean sentence you can obey under pressure.' },
]

export const EMPTY_STRATEGY = Object.fromEntries(STRATEGY_FIELDS.map(field => [field.key, '']))

export const BADGES = [
  { key: 'pit_streak_3', label: '3 Day Pit Streak', rule: '3 qualifying reflection days', tone: 'red' },
  { key: 'pit_streak_7', label: '7 Day Pit Streak', rule: '7 qualifying reflection days', tone: 'green' },
  { key: 'pit_streak_14', label: '14 Day Pit Streak', rule: '14 qualifying reflection days', tone: 'gold' },
  { key: 'backtest_grinder', label: 'Backtest Grinder', rule: '10 backtest entries or 3 backtest reflections', tone: 'red' },
  { key: 'rule_follower', label: 'Rule Follower', rule: '5 strategy-linked trades', tone: 'green' },
  { key: 'first_strategy', label: 'First Strategy Built', rule: 'Create 1 strategy', tone: 'gold' },
  { key: 'first_funded_reflection', label: 'First Funded Reflection', rule: 'Log a funded trade with reflection', tone: 'green' },
  { key: 'reflection_50', label: '50 Reflections', rule: 'Write 50 total reflections', tone: 'red' },
  { key: 'reflection_100', label: '100 Reflections', rule: 'Write 100 total reflections', tone: 'green' },
  { key: 'reflection_500', label: '500 Reflections', rule: 'Write 500 total reflections', tone: 'gold' },
  { key: 'reflection_1000', label: '1000 Reflections', rule: 'Write 1000 total reflections', tone: 'red' },
]

export const badgeByKey = Object.fromEntries(BADGES.map(badge => [badge.key, badge]))

export function getTradeContext(key) {
  return TRADE_CONTEXTS.find(context => context.key === key) || TRADE_CONTEXTS.find(context => context.key === DEFAULT_TRADE_CONTEXT)
}

export function toDateKey(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

export function calculateCurrentStreak(activityDates, now = new Date()) {
  const days = new Set(activityDates.filter(Boolean))
  let cursor = new Date(now)
  cursor.setHours(0, 0, 0, 0)
  let streak = 0

  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

export function deriveBadgeKeys({ entries = [], strategies = [], reflections = [], now = new Date() }) {
  const activityDates = [
    ...entries.map(entry => toDateKey(entry.created_at)),
    ...reflections.map(reflection => toDateKey(reflection.created_at)),
    ...reflections
      .filter(reflection => reflection.completed_follow_through)
      .map(reflection => toDateKey(reflection.updated_at || reflection.created_at)),
  ].filter(Boolean)

  const currentStreak = calculateCurrentStreak(activityDates, now)
  const backtestEntries = entries.filter(entry => entry.trade_context === 'backtest')
  const strategyLinkedTrades = entries.filter(entry => entry.strategy_id)
  const fundedReflection = entries.some(entry => entry.trade_context === 'funded' && entry.reflection?.trim())
  const tradeReflectionCount = entries.filter(entry =>
    entry.reflection?.trim() || entry.what_id_do_differently?.trim()
  ).length
  const totalReflectionCount = tradeReflectionCount + reflections.length

  const earned = new Set()
  if (currentStreak >= 3) earned.add('pit_streak_3')
  if (currentStreak >= 7) earned.add('pit_streak_7')
  if (currentStreak >= 14) earned.add('pit_streak_14')
  if (backtestEntries.length >= 10 || reflections.length >= 3) earned.add('backtest_grinder')
  if (strategyLinkedTrades.length >= 5) earned.add('rule_follower')
  if (strategies.length >= 1) earned.add('first_strategy')
  if (fundedReflection) earned.add('first_funded_reflection')
  if (totalReflectionCount >= 50) earned.add('reflection_50')
  if (totalReflectionCount >= 100) earned.add('reflection_100')
  if (totalReflectionCount >= 500) earned.add('reflection_500')
  if (totalReflectionCount >= 1000) earned.add('reflection_1000')

  return { badgeKeys: [...earned], currentStreak }
}

export async function persistEarnedBadges(supabase, userId, badgeKeys, existingRows = []) {
  const existing = new Set(existingRows.map(row => row.badge_key))
  const rows = badgeKeys
    .filter(key => !existing.has(key))
    .map(key => ({ user_id: userId, badge_key: key }))

  if (rows.length === 0) return { inserted: [] }
  const { data, error } = await supabase.from('user_badges').insert(rows).select('*')
  if (error) return { inserted: [], error }
  return { inserted: data || [] }
}

export function formatPosterText(value) {
  return (value || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}
