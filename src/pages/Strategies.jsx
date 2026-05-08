/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import StrategyForm from '../components/StrategyForm'
import StrategyCard from '../components/StrategyCard'
import { EMPTY_STRATEGY } from '../lib/discipline'

export default function Strategies({ session }) {
  const [strategies, setStrategies] = useState([])
  const [entries, setEntries] = useState([])
  const [reflections, setReflections] = useState([])
  const [form, setForm] = useState(EMPTY_STRATEGY)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadStrategies()
  }, [])

  const loadStrategies = async () => {
    setLoading(true)
    setError('')
    const [{ data: strategyData, error: strategyError }, { data: entryData }, { data: reflectionData }] = await Promise.all([
      supabase.from('strategies').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('entries').select('id, strategy_id').eq('user_id', session.user.id),
      supabase.from('backtest_reflections').select('id, strategy_id').eq('user_id', session.user.id),
    ])

    if (strategyError) setError(strategyError.message)
    setStrategies(strategyData || [])
    setEntries(entryData || [])
    setReflections(reflectionData || [])
    setLoading(false)
  }

  const createStrategy = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const payload = { ...form, user_id: session.user.id, name: form.name.trim() }
    const { data, error: insertError } = await supabase.from('strategies').insert(payload).select('*').single()
    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }
    setStrategies(prev => [data, ...prev])
    setForm(EMPTY_STRATEGY)
    setShowForm(false)
    setSaving(false)
  }

  const countFor = (rows, strategyId) => rows.filter(row => row.strategy_id === strategyId).length

  return (
    <div style={{ paddingTop: '56px', minHeight: '100vh' }}>
      <div className="page-shell strategies-shell" style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 24px' }}>
        <div className="page-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '3rem', lineHeight: 1, marginBottom: '4px' }}>STRATEGIES</h1>
            <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.1em' }}>
              WRITE THE RULES BEFORE THE MARKET TESTS YOU.
            </p>
          </div>
          <button onClick={() => setShowForm(prev => !prev)} className="btn btn-red" style={{ padding: '10px 18px', fontSize: '11px' }}>
            {showForm ? 'CLOSE' : '+ STRATEGY'}
          </button>
        </div>

        {error && (
          <div className="card" style={{ padding: '14px', marginBottom: '18px', color: 'var(--gold)', fontFamily: 'Space Mono', fontSize: '10px' }}>
            {error}
          </div>
        )}

        {showForm && (
          <div className="card" style={{ padding: '22px', marginBottom: '24px' }}>
            <StrategyForm value={form} onChange={setForm} onSubmit={createStrategy} loading={saving} submitLabel="CREATE STRATEGY" />
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--dim)' }}>LOADING STRATEGIES...</div>
        ) : strategies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '2.6rem', color: 'var(--border)', marginBottom: '10px' }}>NO PLAYBOOK YET</div>
            <p style={{ fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--dim)', marginBottom: '20px' }}>
              BUILD THE STRATEGY YOU WANT TO OBEY.
            </p>
            <button onClick={() => setShowForm(true)} className="btn btn-red">WRITE FIRST STRATEGY</button>
          </div>
        ) : (
          strategies.map(strategy => (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
              entryCount={countFor(entries, strategy.id)}
              reflectionCount={countFor(reflections, strategy.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
