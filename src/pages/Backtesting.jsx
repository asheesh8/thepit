/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BacktestReflectionCard from '../components/BacktestReflectionCard'
import BacktestReflectionComposer from '../components/BacktestReflectionComposer'

const emptyBacktestEntry = {
  strategy_id: '',
  symbol: '',
  direction: 'long',
  pnl: '',
  mindset_rating: 5,
  reflection: '',
  is_public: false,
}

export default function Backtesting({ session }) {
  const [strategies, setStrategies] = useState([])
  const [entries, setEntries] = useState([])
  const [reflections, setReflections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [entryForm, setEntryForm] = useState(emptyBacktestEntry)
  const [entrySaving, setEntrySaving] = useState(false)

  useEffect(() => {
    loadBacktesting()
  }, [])

  const loadBacktesting = async () => {
    setLoading(true)
    setError('')
    const [{ data: strategyData, error: strategyError }, { data: entryData }, { data: reflectionData, error: reflectionError }] = await Promise.all([
      supabase.from('strategies').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('entries').select('*, strategies(name)').eq('user_id', session.user.id).eq('trade_context', 'backtest').order('created_at', { ascending: false }),
      supabase.from('backtest_reflections').select('*, strategies(name)').eq('user_id', session.user.id).order('created_at', { ascending: false }),
    ])
    if (strategyError || reflectionError) setError(strategyError?.message || reflectionError?.message)
    setStrategies(strategyData || [])
    setEntries(entryData || [])
    setReflections(reflectionData || [])
    setLoading(false)
  }

  const groups = useMemo(() => strategies.map(strategy => ({
    strategy,
    entries: entries.filter(entry => entry.strategy_id === strategy.id),
    reflections: reflections.filter(reflection => reflection.strategy_id === strategy.id),
  })), [strategies, entries, reflections])

  const unlinkedEntries = entries.filter(entry => !entry.strategy_id)

  const createReflection = async (payload) => {
    const { data, error: insertError } = await supabase
      .from('backtest_reflections')
      .insert({ ...payload, user_id: session.user.id, completed_follow_through: false })
      .select('*, strategies(name)')
      .single()
    if (insertError) return { error: insertError.message }
    if (data) setReflections(prev => [data, ...prev])
    return { data }
  }

  const createBacktestEntry = async (event) => {
    event.preventDefault()
    if (!entryForm.strategy_id) {
      setError('Pick the strategy you are testing first.')
      return
    }
    setEntrySaving(true)
    setError('')
    const { data, error: insertError } = await supabase
      .from('entries')
      .insert({
        user_id: session.user.id,
        symbol: entryForm.symbol.toUpperCase(),
        direction: entryForm.direction,
        pnl: entryForm.pnl ? Number(entryForm.pnl) : null,
        mindset_rating: Number(entryForm.mindset_rating),
        reflection: entryForm.reflection,
        is_public: entryForm.is_public,
        trade_context: 'backtest',
        strategy_id: entryForm.strategy_id,
      })
      .select('*, strategies(name)')
      .single()
    setEntrySaving(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    if (data) setEntries(prev => [data, ...prev])
    setEntryForm(emptyBacktestEntry)
  }

  const toggleFollowThrough = async (reflection) => {
    const next = !reflection.completed_follow_through
    const { data } = await supabase
      .from('backtest_reflections')
      .update({ completed_follow_through: next, updated_at: new Date().toISOString() })
      .eq('id', reflection.id)
      .eq('user_id', session.user.id)
      .select('*, strategies(name)')
      .single()
    if (data) setReflections(prev => prev.map(row => row.id === data.id ? data : row))
  }

  const togglePublic = async (reflection) => {
    const next = !reflection.is_public
    const { data } = await supabase
      .from('backtest_reflections')
      .update({ is_public: next, updated_at: new Date().toISOString() })
      .eq('id', reflection.id)
      .eq('user_id', session.user.id)
      .select('*, strategies(name)')
      .single()
    if (data) setReflections(prev => prev.map(row => row.id === data.id ? data : row))
  }

  return (
    <div style={{ paddingTop: '56px', minHeight: '100vh' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'flex-end', marginBottom: '30px' }}>
          <div>
            <h1 style={{ fontSize: '3rem', lineHeight: 1, marginBottom: '4px' }}>BACKTESTING</h1>
            <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.1em' }}>
              TEST THE MODEL. THEN TEST YOUR HONESTY.
            </p>
          </div>
          <a href="#backtest-entry" className="btn btn-red" style={{ padding: '10px 18px', fontSize: '11px' }}>+ BACKTEST ENTRY</a>
        </div>

        {error && <div className="card" style={{ padding: '14px', marginBottom: '18px', color: 'var(--gold)', fontFamily: 'Space Mono', fontSize: '10px' }}>{error}</div>}

        <form id="backtest-entry" onSubmit={createBacktestEntry} className="card backtest-entry-desk">
          <div>
            <h2 style={{ fontSize: '2rem', lineHeight: 1 }}>LOG BACKTEST TRADE</h2>
            <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.08em', marginTop: '5px' }}>
              THESE STAY TIED TO THE STRATEGY RESEARCH DESK.
            </p>
          </div>
          <div className="backtest-entry-grid">
            <select value={entryForm.strategy_id} onChange={event => setEntryForm(prev => ({ ...prev, strategy_id: event.target.value }))} required>
              <option value="">strategy being tested</option>
              {strategies.map(strategy => <option key={strategy.id} value={strategy.id}>{strategy.name}</option>)}
            </select>
            <input value={entryForm.symbol} onChange={event => setEntryForm(prev => ({ ...prev, symbol: event.target.value }))} placeholder="symbol" required />
            <select value={entryForm.direction} onChange={event => setEntryForm(prev => ({ ...prev, direction: event.target.value }))}>
              <option value="long">long</option>
              <option value="short">short</option>
            </select>
            <input type="number" step="0.01" value={entryForm.pnl} onChange={event => setEntryForm(prev => ({ ...prev, pnl: event.target.value }))} placeholder="p&l" />
            <input type="number" min="1" max="10" value={entryForm.mindset_rating} onChange={event => setEntryForm(prev => ({ ...prev, mindset_rating: event.target.value }))} placeholder="mindset" />
          </div>
          <textarea value={entryForm.reflection} onChange={event => setEntryForm(prev => ({ ...prev, reflection: event.target.value }))} rows={3} placeholder="What did this sample teach you?" />
          <button type="button" onClick={() => setEntryForm(prev => ({ ...prev, is_public: !prev.is_public }))} className={`btn ${entryForm.is_public ? 'btn-green' : ''}`} style={{ justifyContent: 'center', fontSize: '10px' }}>
            {entryForm.is_public ? 'POST THIS BACKTEST TO FLOOR' : 'KEEP BACKTEST PRIVATE'}
          </button>
          <button type="submit" disabled={entrySaving} className="btn btn-red" style={{ justifyContent: 'center', fontSize: '11px' }}>
            {entrySaving ? 'SAVING...' : 'SAVE BACKTEST TRADE'}
          </button>
        </form>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--dim)' }}>LOADING BACKTESTS...</div>
        ) : strategies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '2.6rem', color: 'var(--border)', marginBottom: '10px' }}>NO STRATEGIES TO TEST</div>
            <Link to="/strategies" className="btn btn-red">BUILD STRATEGY</Link>
          </div>
        ) : (
          <>
            {groups.map(group => (
              <section key={group.strategy.id} className="card" style={{ padding: '22px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
                  <div>
                    <Link to={`/strategies/${group.strategy.id}`}>
                      <h2 style={{ fontSize: '2rem', lineHeight: 1 }}>{group.strategy.name}</h2>
                    </Link>
                    <p style={{ fontSize: '13px', color: 'var(--dim)', lineHeight: 1.6, marginTop: '8px' }}>
                      {group.strategy.setup_conditions || 'No thesis written in the strategy yet.'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <span className="tag" style={{ color: 'var(--red)' }}>{group.entries.length} TESTS</span>
                    <span className="tag" style={{ color: 'var(--gold)' }}>{group.reflections.length} REFLECTIONS</span>
                  </div>
                </div>

                {group.entries.length > 0 && (
                  <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                    {group.entries.slice(0, 6).map(entry => (
                      <div key={entry.id} style={{ border: '1px solid var(--border)', padding: '10px' }}>
                        <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: Number(entry.pnl || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {Number(entry.pnl || 0) >= 0 ? '+' : '-'}${Math.abs(Number(entry.pnl || 0)).toFixed(0)}
                        </div>
                        <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)' }}>{entry.symbol} / {new Date(entry.created_at).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                )}

                <BacktestReflectionComposer strategyId={group.strategy.id} onCreate={createReflection} />
                {group.reflections.map(reflection => (
                  <BacktestReflectionCard
                    key={reflection.id}
                    reflection={reflection}
                    session={session}
                    onToggleFollowThrough={toggleFollowThrough}
                    onTogglePublic={togglePublic}
                  />
                ))}
              </section>
            ))}

            {unlinkedEntries.length > 0 && (
              <section className="card" style={{ padding: '22px', marginBottom: '18px' }}>
                <h2 style={{ fontSize: '2rem', lineHeight: 1 }}>UNLINKED BACKTESTS</h2>
                <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', marginTop: '8px' }}>
                  THESE NEED A STRATEGY LINK TO BECOME USEFUL RESEARCH.
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
