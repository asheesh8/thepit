import { toDateKey } from './discipline'

export function getMonthMatrix(date = new Date()) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return {
      date: day,
      key: toDateKey(day),
      inMonth: day.getMonth() === month,
      dayNumber: day.getDate(),
    }
  })
}

export function summarizeTradesByDay(entries = []) {
  return entries.reduce((acc, entry) => {
    const key = toDateKey(entry.created_at)
    if (!key) return acc
    if (!acc[key]) {
      acc[key] = {
        count: 0,
        pnl: 0,
        contexts: {},
      }
    }
    acc[key].count += 1
    acc[key].pnl += Number(entry.pnl || 0)
    const context = entry.trade_context || 'personal_sim'
    acc[key].contexts[context] = (acc[key].contexts[context] || 0) + 1
    return acc
  }, {})
}

export function summarizeReflectionsByDay(entries = [], reflections = []) {
  const summary = {}

  for (const entry of entries) {
    if (!entry.reflection?.trim() && !entry.what_id_do_differently?.trim()) continue
    const key = toDateKey(entry.created_at)
    if (!key) continue
    summary[key] = summary[key] || { count: 0, followThrough: 0 }
    summary[key].count += 1
  }

  for (const reflection of reflections) {
    const key = toDateKey(reflection.created_at)
    if (!key) continue
    summary[key] = summary[key] || { count: 0, followThrough: 0 }
    summary[key].count += 1
    if (reflection.completed_follow_through) summary[key].followThrough += 1
  }

  return summary
}
