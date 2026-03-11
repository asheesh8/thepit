import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import EntryCard from '../components/EntryCard'
import { Link } from 'react-router-dom'

export default function Journal({ session }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    loadEntries()
  }, [])

  const loadEntries = async () => {
    const { data } = await supabase
      .from('entries')
      .select('*, profiles(username)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    const all = data || []
    setEntries(all)

    // compute stats
    const trades = all.filter(e => e.pnl !== null)
    const wins = trades.filter(e => e.pnl > 0)
    const losses = trades.filter(e => e.pnl < 0)
    const totalPnl = trades.reduce((sum, e) => sum + e.pnl, 0)
    const avgMindset = all.length > 0 ? all.reduce((sum, e) => sum + (e.mindset_rating || 0), 0) / all.length : 0

    setStats({
      total: all.length,
      wins: wins.length,
      losses: losses.length,
      winRate: trades.length > 0 ? ((wins.length / trades.length) * 100).toFixed(0) : 0,
      totalPnl,
      avgMindset: avgMindset.toFixed(1),
    })

    setLoading(false)
  }

  return (
    <div style={{ paddingTop: '56px', minHeight: '100vh' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '3rem', letterSpacing: '0.05em', lineHeight: 1, marginBottom: '4px' }}>MY JOURNAL</h1>
            <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: '#444440', letterSpacing: '0.1em' }}>
              PRIVATE. HONEST. YOURS.
            </p>
          </div>
          <Link to="/new" className="btn btn-red" style={{ padding: '10px 20px', fontSize: '11px' }}>+ LOG TRADE</Link>
        </div>

        {/* stats strip */}
        {stats && stats.total > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1px', background: '#242424', marginBottom: '32px' }}>
            {[
              { val: stats.total, label: 'TRADES' },
              { val: `${stats.winRate}%`, label: 'WIN RATE' },
              { val: stats.wins, label: 'WINS', color: '#2ec4b6' },
              { val: stats.losses, label: 'LOSSES', color: '#e63946' },
              { val: stats.totalPnl >= 0 ? `+$${stats.totalPnl.toFixed(0)}` : `-$${Math.abs(stats.totalPnl).toFixed(0)}`, label: 'TOTAL P&L', color: stats.totalPnl >= 0 ? '#2ec4b6' : '#e63946' },
            ].map(({ val, label, color }) => (
              <div key={label} style={{ background: '#111', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', letterSpacing: '0.05em', color: color || '#e8e8e0' }}>{val}</div>
                <div style={{ fontFamily: 'Space Mono', fontSize: '8px', color: '#444440', letterSpacing: '0.1em', marginTop: '2px' }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', fontFamily: 'Space Mono', fontSize: '11px', color: '#444440' }}>LOADING...</div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '3rem', color: '#2a2a2a', marginBottom: '12px' }}>START THE WORK</div>
            <p style={{ fontFamily: 'Space Mono', fontSize: '11px', color: '#444440', marginBottom: '24px' }}>YOUR FIRST TRADE ENTRY CHANGES EVERYTHING</p>
            <Link to="/new" className="btn btn-red">LOG YOUR FIRST TRADE</Link>
          </div>
        ) : (
          entries.map(entry => (
            <EntryCard key={entry.id} entry={entry} session={session} showActions={true} />
          ))
        )}
      </div>
    </div>
  )
}
