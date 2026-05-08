import { getMonthMatrix } from '../lib/calendar'

export default function CalendarMonth({ monthDate, mode, tradeSummary = {}, reflectionSummary = {} }) {
  const days = getMonthMatrix(monthDate)
  const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

  return (
    <div>
      <div className="calendar-month-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)' }}>
        {weekdays.map(day => (
          <div key={day} style={{ background: 'var(--dark)', padding: '9px', fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', letterSpacing: '0.1em', textAlign: 'center' }}>
            {day}
          </div>
        ))}
        {days.map(day => {
          const trade = tradeSummary[day.key]
          const reflection = reflectionSummary[day.key]
          const active = mode === 'trades' ? trade : reflection
          const pnl = trade?.pnl || 0
          const color = mode === 'trades'
            ? pnl > 0 ? 'var(--green)' : pnl < 0 ? 'var(--red)' : 'var(--dim)'
            : reflection?.followThrough ? 'var(--green)' : 'var(--gold)'

          return (
            <div
              className="calendar-day-cell"
              key={day.key}
              style={{
                minHeight: '92px',
                background: 'var(--card)',
                padding: '10px',
                opacity: day.inMonth ? 1 : 0.35,
                borderTop: active ? `2px solid ${color}` : '2px solid transparent',
              }}
            >
              <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: active ? color : 'var(--dim)' }}>{day.dayNumber}</div>
              {mode === 'trades' && trade && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color }}>
                    {pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toFixed(0)}
                  </div>
                  <div style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--dim)', letterSpacing: '0.08em' }}>
                    {trade.count} TRADE{trade.count === 1 ? '' : 'S'}
                  </div>
                </div>
              )}
              {mode === 'reflections' && reflection && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color }}>
                    {reflection.count}
                  </div>
                  <div style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--dim)', letterSpacing: '0.08em' }}>
                    REFLECTION{reflection.count === 1 ? '' : 'S'}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
