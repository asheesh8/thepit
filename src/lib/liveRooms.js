export const ROOM_TYPES = [
  { key: 'trade_review', label: 'Trade Review', shortLabel: 'TRADE', color: 'var(--red)' },
  { key: 'strategy_breakdown', label: 'Strategy Breakdown', shortLabel: 'STRATEGY', color: 'var(--gold)' },
  { key: 'backtest_review', label: 'Backtest Review', shortLabel: 'BACKTEST', color: 'var(--green)' },
  { key: 'open_floor', label: 'Open Floor', shortLabel: 'FLOOR', color: 'var(--dim)' },
  { key: 'funded_prep', label: 'Funded / Combine Prep', shortLabel: 'PREP', color: 'var(--green)' },
]

export const ROOM_STATUS = {
  LIVE: 'live',
  COMPLETE: 'complete',
}

export const roomTypeByKey = Object.fromEntries(ROOM_TYPES.map(type => [type.key, type]))

export function getRoomType(key) {
  return roomTypeByKey[key] || roomTypeByKey.open_floor
}

export function createRoomChannelName(roomId) {
  return `room:${roomId}`
}

export function formatRoomTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function makePeerSignal({ kind, from, to, data }) {
  return {
    kind,
    from,
    to,
    data,
    sent_at: new Date().toISOString(),
  }
}
