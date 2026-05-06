/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import CalendarMonth from '../components/CalendarMonth'
import { summarizeReflectionsByDay, summarizeTradesByDay } from '../lib/calendar'

export default function Calendar({ session }) {
  const [entries, setEntries] = useState([])
  const [reflections, setReflections] = useState([])
  const [mode, setMode] = useState('trades')
  const [monthDate, setMonthDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadCalendar()
  }, [])

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
    setMonthDate(prev => {
      const next = new Date(prev)
      next.setMonth(prev.getMonth() + delta)
      return next
    })
  }

  return (
    <div style={{ paddingTop: '56px', minHeight: '100vh' }}>
      <div style={{ maxWidth: '980px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', marginBottom: '26px' }}>
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
          <h2 style={{ fontSize: '2.1rem' }}>{monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {[
              ['trades', 'TRADE CALENDAR'],
              ['reflections', 'REFLECTION CALENDAR'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                style={{
                  padding: '10px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: mode === key ? '1px solid var(--red)' : '1px solid transparent',
                  color: mode === key ? 'var(--text)' : 'var(--dim)',
                  fontFamily: 'Space Mono',
                  fontSize: '10px',
                  letterSpacing: '0.08em',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="card" style={{ padding: '14px', marginBottom: '18px', color: 'var(--gold)', fontFamily: 'Space Mono', fontSize: '10px' }}>{error}</div>}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--dim)' }}>LOADING CALENDAR...</div>
        ) : (
          <CalendarMonth monthDate={monthDate} mode={mode} tradeSummary={tradeSummary} reflectionSummary={reflectionSummary} />
        )}
      </div>
    </div>
  )
}
