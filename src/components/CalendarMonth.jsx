import { getMonthMatrix } from '../lib/calendar'

export default function CalendarMonth({ monthDate, tradeSummary = {}, reflectionSummary = {}, selectedDay, onDayClick }) {
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
          const active = trade || reflection
          const isSelected = selectedDay === day.key
          const pnl = trade?.pnl || 0
          const color = trade
            ? pnl > 0 ? 'var(--green)' : pnl < 0 ? 'var(--red)' : 'var(--dim)'
            : reflection?.followThrough ? 'var(--green)' : 'var(--gold)'

          return (
            <div
              key={day.key}
              className="calendar-day-cell"
              onClick={() => active && onDayClick?.(day.key)}
              style={{
                minHeight: '92px',
                background: isSelected ? 'rgba(230,57,70,0.07)' : 'var(--card)',
                padding: '10px',
                opacity: day.inMonth ? 1 : 0.35,
                borderTop: isSelected ? `2px solid var(--red)` : active ? `2px solid ${color}` : '2px solid transparent',
                cursor: active ? 'pointer' : 'default',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (active) e.currentTarget.style.background = isSelected ? 'rgba(230,57,70,0.1)' : 'rgba(255,255,255,0.03)' }}
              onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(230,57,70,0.07)' : 'var(--card)' }}
            >
              <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: active ? color : 'var(--dim)' }}>{day.dayNumber}</div>
              {trade && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color }}>
                    {pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toFixed(0)}
                  </div>
                  <div style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--dim)', letterSpacing: '0.08em' }}>
                    {trade.count} TRADE{trade.count === 1 ? '' : 'S'}
                  </div>
                </div>
              )}
              {reflection && (
                <div style={{ marginTop: trade ? '8px' : '16px' }}>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: trade ? '1rem' : '1.4rem', color: reflection.followThrough ? 'var(--green)' : 'var(--gold)' }}>{reflection.count}</div>
                  <div style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--dim)', letterSpacing: '0.08em' }}>
                    NOTE{reflection.count === 1 ? '' : 'S'}
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
