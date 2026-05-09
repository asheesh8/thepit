/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getMonthMatrix } from '../lib/calendar'
import { toDateKey } from '../lib/discipline'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function fmtMonth(date) {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()
}

export default function ActivityCalendarWidget({ session }) {
  const navigate = useNavigate()
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d
  })
  const [tradeDays, setTradeDays] = useState({})   // dateKey → [entry]
  const [backtestDays, setBacktestDays] = useState({}) // dateKey → [reflection]
  const [selectedDay, setSelectedDay] = useState(null)
  const [dayEntries, setDayEntries] = useState([])
  const [dayReflections, setDayReflections] = useState([])

  useEffect(() => { loadMonth() }, [monthDate])

  const loadMonth = async () => {
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const start = new Date(year, month, 1).toISOString()
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

    const [{ data: entries }, { data: reflections }] = await Promise.all([
      supabase.from('entries').select('id, symbol, pnl, created_at, is_public')
        .eq('user_id', session.user.id)
        .gte('created_at', start).lte('created_at', end),
      supabase.from('backtest_reflections').select('id, symbol, created_at, completed_follow_through')
        .eq('user_id', session.user.id)
        .gte('created_at', start).lte('created_at', end),
    ])

    const td = {}
    for (const e of entries || []) {
      const k = toDateKey(e.created_at)
      if (!td[k]) td[k] = []
      td[k].push(e)
    }

    const bd = {}
    for (const r of reflections || []) {
      const k = toDateKey(r.created_at)
      if (!bd[k]) bd[k] = []
      bd[k].push(r)
    }

    setTradeDays(td)
    setBacktestDays(bd)
    setSelectedDay(null)
    setDayEntries([])
    setDayReflections([])
  }

  const handleDayClick = (key, inMonth) => {
    if (!inMonth) return
    const trades = tradeDays[key] || []
    const reflections = backtestDays[key] || []
    if (!trades.length && !reflections.length) return
    if (selectedDay === key) { setSelectedDay(null); return }
    setSelectedDay(key)
    setDayEntries(trades)
    setDayReflections(reflections)
  }

  const prevMonth = () => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const nextMonth = () => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))

  const days = getMonthMatrix(monthDate)
  const today = toDateKey(new Date())

  return (
    <div style={{ border: '1px solid var(--border)', background: 'rgba(34,34,34,0.82)', backdropFilter: 'blur(12px)', padding: '14px' }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--red)', letterSpacing: '0.14em' }}>ACTIVITY</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={prevMonth} style={navBtn}>‹</button>
          <span style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--dim)', letterSpacing: '0.06em' }}>{fmtMonth(monthDate)}</span>
          <button onClick={nextMonth} style={navBtn}>›</button>
        </div>
      </div>

      {/* weekday labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '3px' }}>
        {WEEKDAYS.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontFamily: 'Space Mono', fontSize: '7px', color: 'var(--muted)', padding: '2px 0' }}>{d}</div>
        ))}
      </div>

      {/* day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {days.map(day => {
          const hasTrade = !!(tradeDays[day.key]?.length)
          const hasBacktest = !!(backtestDays[day.key]?.length)
          const isToday = day.key === today
          const isSelected = day.key === selectedDay
          const isActive = (hasTrade || hasBacktest) && day.inMonth

          return (
            <div
              key={day.key}
              onClick={() => handleDayClick(day.key, day.inMonth)}
              style={{
                aspectRatio: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                borderRadius: '2px',
                cursor: isActive ? 'pointer' : 'default',
                opacity: day.inMonth ? 1 : 0.22,
                background: isSelected ? 'rgba(230,57,70,0.15)' : isToday ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: isToday ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (isActive) e.currentTarget.style.background = isSelected ? 'rgba(230,57,70,0.2)' : 'rgba(255,255,255,0.06)' }}
              onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(230,57,70,0.15)' : isToday ? 'rgba(255,255,255,0.05)' : 'transparent' }}
            >
              <span style={{ fontFamily: 'Space Mono', fontSize: '8px', color: isSelected ? 'var(--red)' : isToday ? 'var(--text)' : 'var(--dim)', lineHeight: 1 }}>
                {day.dayNumber}
              </span>
              {day.inMonth && (hasTrade || hasBacktest) && (
                <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                  {hasTrade && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />}
                  {hasBacktest && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* legend */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />
          <span style={{ fontFamily: 'Space Mono', fontSize: '7px', color: 'var(--muted)' }}>TRADE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--gold)', display: 'inline-block' }} />
          <span style={{ fontFamily: 'Space Mono', fontSize: '7px', color: 'var(--muted)' }}>BACKTEST</span>
        </div>
      </div>

      {/* day detail panel */}
      {selectedDay && (dayEntries.length > 0 || dayReflections.length > 0) && (
        <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
          <div style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--dim)', letterSpacing: '0.1em', marginBottom: '8px' }}>
            {selectedDay}
          </div>

          {dayEntries.map(e => {
            const pnl = Number(e.pnl || 0)
            const color = pnl > 0 ? 'var(--green)' : pnl < 0 ? 'var(--red)' : 'var(--dim)'
            return (
              <div
                key={e.id}
                onClick={() => navigate(`/journal?entry=${e.id}`)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                onMouseEnter={e2 => e2.currentTarget.style.opacity = '0.7'}
                onMouseLeave={e2 => e2.currentTarget.style.opacity = '1'}
              >
                <div>
                  <div style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--text)' }}>{e.symbol || '—'}</div>
                  <div style={{ fontFamily: 'Space Mono', fontSize: '7px', color: 'var(--muted)' }}>TRADE {e.is_public ? '· PUBLIC' : ''}</div>
                </div>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: '0.9rem', color }}>{pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(0)}</div>
              </div>
            )
          })}

          {dayReflections.map(r => (
            <div
              key={r.id}
              onClick={() => navigate('/backtesting')}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <div>
                <div style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--text)' }}>{r.symbol || 'BACKTEST'}</div>
                <div style={{ fontFamily: 'Space Mono', fontSize: '7px', color: 'var(--muted)' }}>REFLECTION</div>
              </div>
              <div style={{ fontFamily: 'Space Mono', fontSize: '7px', color: r.completed_follow_through ? 'var(--green)' : 'var(--gold)' }}>
                {r.completed_follow_through ? '✓' : '·'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const navBtn = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--dim)',
  fontSize: '14px',
  lineHeight: 1,
  padding: '0 2px',
  fontFamily: 'monospace',
}
