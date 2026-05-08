import { useState, useEffect } from 'react'

const IMPACT_COLOR = { high: '#e63946', medium: '#f4a261', low: '#2ec4b6' }

function isSameLocalDay(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate()
}

function fmtTime(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

async function fetchNews() {
  try {
    const res = await fetch('/api/ff-calendar')
    if (!res.ok) return []
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('json')) return []
    const data = await res.json()
    return (Array.isArray(data) ? data : [])
      .filter(e => {
        if (!e.date) return false
        const impact = (e.impact || '').toLowerCase()
        if (impact !== 'high' && impact !== 'medium') return false
        return isSameLocalDay(e.date)
      })
      .map(e => ({
        event: e.title,
        currency: e.country,
        impact: (e.impact || '').toLowerCase() === 'high' ? 'high' : 'medium',
        time: fmtTime(e.date),
        actual: e.actual || '',
        forecast: e.forecast || '',
        previous: e.previous || '',
      }))
      .sort((a, b) => {
        if (a.impact !== b.impact) return a.impact === 'high' ? -1 : 1
        return new Date(a.time) - new Date(b.time)
      })
  } catch {
    return []
  }
}

export default function ForexNewsPanel() {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    fetchNews()
      .then(data => {
        setNews(data)
        setConnected(data.length > 0)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ border: '1px solid var(--border)', background: 'var(--dark)' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: connected ? '#e63946' : 'var(--border)',
            boxShadow: connected ? '0 0 6px #e63946' : 'none',
          }} />
          <span style={{ fontFamily: 'Space Mono', fontSize: '9px', letterSpacing: '0.15em', color: 'var(--dim)' }}>
            ECONOMIC CALENDAR
          </span>
        </div>
        <span style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--muted)', letterSpacing: '0.1em' }}>
          {connected ? `${news.length} EVENTS` : loading ? '' : 'QUIET TODAY'}
        </span>
      </div>

      {loading ? (
        <div style={{ padding: '20px', fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', textAlign: 'center' }}>
          LOADING...
        </div>
      ) : !connected ? (
        <div style={{ padding: '16px 14px' }}>
          <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--muted)', lineHeight: 1.9, letterSpacing: '0.06em' }}>
            NO HIGH IMPACT EVENTS TODAY<br />
            <span style={{ color: 'var(--dim)' }}>CHECK BACK TOMORROW</span>
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{
              display: 'flex', gap: '8px', alignItems: 'center',
              padding: '8px 0', borderTop: '1px solid var(--border)', marginTop: '8px',
              opacity: 0.2,
            }}>
              <div style={{ width: '3px', height: '28px', background: 'var(--border)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: '8px', background: 'var(--border)', marginBottom: '5px', width: '65%' }} />
                <div style={{ height: '7px', background: 'var(--border)', width: '35%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {news.map((item, i) => (
            <div key={i} style={{
              display: 'flex', gap: '10px', alignItems: 'center',
              padding: '9px 14px', borderBottom: '1px solid var(--border)',
              background: item.impact === 'high' ? 'rgba(230,57,70,0.04)' : 'transparent',
            }}>
              <div style={{ width: '3px', alignSelf: 'stretch', background: IMPACT_COLOR[item.impact], flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--text)', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.event}
                </div>
                <div style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--muted)', marginTop: '2px' }}>
                  {item.currency} · {item.time}
                </div>
                {(item.forecast || item.previous) && (
                  <div style={{ fontFamily: 'Space Mono', fontSize: '7px', color: 'var(--dim)', marginTop: '2px' }}>
                    {item.forecast && <span>F: {item.forecast}</span>}
                    {item.forecast && item.previous && <span style={{ margin: '0 4px' }}>·</span>}
                    {item.previous && <span>P: {item.previous}</span>}
                  </div>
                )}
              </div>
              {item.actual ? (
                <span style={{ fontFamily: 'Space Mono', fontSize: '9px', color: IMPACT_COLOR[item.impact], letterSpacing: '0.06em', flexShrink: 0 }}>
                  {item.actual}
                </span>
              ) : (
                <span style={{ fontFamily: 'Space Mono', fontSize: '7px', color: 'var(--dim)', flexShrink: 0 }}>
                  PENDING
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
