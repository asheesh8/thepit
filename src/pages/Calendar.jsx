/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import CalendarMonth from '../components/CalendarMonth'
import { summarizeReflectionsByDay, summarizeTradesByDay } from '../lib/calendar'
import { toDateKey } from '../lib/discipline'
import { getTradeContext } from '../lib/discipline'

function fmtDate(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function DayDetail({ dateKey, entries, reflections, onClose }) {
  const dayEntries = entries.filter(e => toDateKey(e.created_at) === dateKey)
  const dayReflections = reflections.filter(r => toDateKey(r.created_at) === dateKey)
  const totalPnl = dayEntries.reduce((s, e) => s + Number(e.pnl || 0), 0)
  const pnlColor = totalPnl > 0 ? 'var(--green)' : totalPnl < 0 ? 'var(--red)' : 'var(--dim)'

  return (
    <div style={{
      marginTop: '2px', border: '1px solid var(--border)', borderTop: '2px solid var(--red)',
      background: 'var(--card)', padding: '24px', animation: 'fadeIn 0.18s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', letterSpacing: '0.12em', marginBottom: '4px' }}>
            {fmtDate(dateKey)}
          </div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: pnlColor, letterSpacing: '0.05em' }}>
            {totalPnl >= 0 ? '+' : '-'}${Math.abs(totalPnl).toFixed(2)}
          </div>
          <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', marginTop: '2px' }}>
            {dayEntries.length} trade{dayEntries.length !== 1 ? 's' : ''} · {dayReflections.length} backtest reflection{dayReflections.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--dim)', fontSize: '18px', cursor: 'pointer', padding: '0 4px' }}>×</button>
      </div>

      {dayEntries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: dayReflections.length > 0 ? '20px' : 0 }}>
          {dayEntries.map(entry => {
            const pnl = Number(entry.pnl || 0)
            const color = pnl > 0 ? 'var(--green)' : pnl < 0 ? 'var(--red)' : 'var(--dim)'
            const context = getTradeContext(entry.trade_context)
            return (
              <div key={entry.id} style={{ padding: '16px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {entry.symbol && <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', letterSpacing: '0.05em' }}>{entry.symbol}</span>}
                    {entry.direction && (
                      <span style={{ fontFamily: 'Space Mono', fontSize: '8px', padding: '2px 6px',
                        border: `1px solid ${entry.direction === 'long' ? 'var(--green)' : 'var(--red)'}`,
                        color: entry.direction === 'long' ? 'var(--green)' : 'var(--red)' }}>
                        {entry.direction.toUpperCase()}
                      </span>
                    )}
                    <span style={{ fontFamily: 'Space Mono', fontSize: '8px', color: context.color, border: `1px solid ${context.color}`, padding: '2px 6px' }}>
                      {context.shortLabel}
                    </span>
                  </div>
                  <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color, letterSpacing: '0.05em' }}>
                    {pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toFixed(2)}
                  </span>
                </div>
                {entry.notes && (
                  <p style={{ fontSize: '13px', color: 'var(--dim)', lineHeight: 1.65, marginBottom: '8px' }}>{entry.notes}</p>
                )}
                {entry.reflection && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--dim)', letterSpacing: '0.1em', marginBottom: '6px' }}>REFLECTION</div>
                    <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.65, borderLeft: '2px solid var(--red)', paddingLeft: '12px' }}>{entry.reflection}</p>
                  </div>
                )}
                {entry.what_id_do_differently && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--dim)', letterSpacing: '0.1em', marginBottom: '6px' }}>WHAT I'D DO DIFFERENTLY</div>
                    <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.65, borderLeft: '2px solid var(--gold)', paddingLeft: '12px' }}>{entry.what_id_do_differently}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {dayReflections.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', letterSpacing: '0.12em' }}>BACKTEST REFLECTIONS</div>
          {dayReflections.map(r => (
            <div key={r.id} style={{ padding: '16px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              {r.overall_notes && <p style={{ fontSize: '13px', color: 'var(--dim)', lineHeight: 1.65, marginBottom: '8px' }}>{r.overall_notes}</p>}
              {r.what_worked && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--green)', letterSpacing: '0.1em', marginBottom: '4px' }}>WHAT WORKED</div>
                  <p style={{ fontSize: '13px', color: 'var(--dim)', lineHeight: 1.6 }}>{r.what_worked}</p>
                </div>
              )}
              {r.what_to_improve && (
                <div>
                  <div style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: '4px' }}>TO IMPROVE</div>
                  <p style={{ fontSize: '13px', color: 'var(--dim)', lineHeight: 1.6 }}>{r.what_to_improve}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Calendar({ session }) {
  const [entries, setEntries] = useState([])
  const [reflections, setReflections] = useState([])
  const [mode, setMode] = useState('trades')
  const [monthDate, setMonthDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDay, setSelectedDay] = useState(null)

  useEffect(() => { loadCalendar() }, [])

  const loadCalendar = async () => {
    setLoading(true)
    setError('')
    const [{ data: entryData, error: entryError }, { data: reflectionData, error: reflectionError }] = await Promise.all([
      supabase.from('entries').select('*').eq('user_id', session.user.id),
      supabase.from('backtest_reflections').select('*').eq('user_id', session.user.id),
    ])
    if (entryError || reflectionError) setError(entryError?.message || reflectionError?.message)
    setEntries(entryData || [])
    setReflections(reflectionData || [])
    setLoading(false)
  }

  const tradeSummary = useMemo(() => summarizeTradesByDay(entries), [entries])
  const reflectionSummary = useMemo(() => summarizeReflectionsByDay(entries, reflections), [entries, reflections])

  const changeMonth = (delta) => {
    setSelectedDay(null)
    setMonthDate(prev => {
      const next = new Date(prev)
      next.setMonth(prev.getMonth() + delta)
      return next
    })
  }

  const handleDayClick = (key) => {
    setSelectedDay(prev => prev === key ? null : key)
  }

  return (
    <div style={{ paddingTop: 'calc(56px + env(safe-area-inset-top, 0px))', minHeight: '100vh' }}>
      <div className="page-shell calendar-shell" style={{ maxWidth: '980px', margin: '0 auto', padding: '32px 24px' }}>
        <div className="page-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', marginBottom: '26px' }}>
          <div>
            <h1 style={{ fontSize: '3rem', lineHeight: 1, marginBottom: '4px' }}>CALENDAR</h1>
            <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.1em' }}>
              SEE THE DAYS YOU SHOWED UP.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => changeMonth(-1)} className="btn" style={{ padding: '8px 12px', fontSize: '10px' }}>PREV</button>
            <button onClick={() => changeMonth(1)} className="btn" style={{ padding: '8px 12px', fontSize: '10px' }}>NEXT</button>
          </div>
        </div>

        <div className="calendar-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
          <h2 style={{ fontSize: '2.1rem' }}>{monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
          <div className="mobile-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {[['trades', 'TRADE CALENDAR'], ['reflections', 'REFLECTION CALENDAR']].map(([key, label]) => (
              <button key={key} onClick={() => { setMode(key); setSelectedDay(null) }} style={{
                padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: mode === key ? '1px solid var(--red)' : '1px solid transparent',
                color: mode === key ? 'var(--text)' : 'var(--dim)',
                fontFamily: 'Space Mono', fontSize: '10px', letterSpacing: '0.08em',
              }}>{label}</button>
            ))}
          </div>
        </div>

        {error && <div className="card" style={{ padding: '14px', marginBottom: '18px', color: 'var(--gold)', fontFamily: 'Space Mono', fontSize: '10px' }}>{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--dim)' }}>LOADING CALENDAR...</div>
        ) : (
          <>
            <CalendarMonth
              monthDate={monthDate}
              mode={mode}
              tradeSummary={tradeSummary}
              reflectionSummary={reflectionSummary}
              selectedDay={selectedDay}
              onDayClick={handleDayClick}
            />
            {selectedDay && (
              <DayDetail
                key={selectedDay}
                dateKey={selectedDay}
                entries={entries}
                reflections={reflections}
                onClose={() => setSelectedDay(null)}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
