/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import EntryCard from '../components/EntryCard'
import StrategyCard from '../components/StrategyCard'
import PinnedRulesPanel from '../components/PinnedRulesPanel'

export default function Review({ session }) {
  const [tab, setTab] = useState('needs')
  const [entries, setEntries] = useState([])
  const [strategies, setStrategies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadReview()
  }, [])

  const loadReview = async () => {
    setLoading(true)
    setError('')
    const [{ data: entryData, error: entryError }, { data: strategyData, error: strategyError }] = await Promise.all([
      supabase
        .from('entries')
        .select('*, profiles(username), strategies(name), reactions(type, user_id), callout_threads(id, created_at)')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('strategies')
        .select('*, profiles(username)')
        .eq('is_public', true)
        .neq('user_id', session.user.id)
        .order('updated_at', { ascending: false })
        .limit(30),
    ])
    if (entryError || strategyError) setError(entryError?.message || strategyError?.message)

    const processed = (entryData || []).map(entry => ({
      ...entry,
      props_count: entry.reactions?.filter(r => r.type === 'props').length || 0,
      callout_count: entry.reactions?.filter(r => r.type === 'callout').length || 0,
      user_reaction: entry.reactions?.find(r => r.user_id === session.user.id)?.type || null,
      callout_thread_count: entry.callout_threads?.length || 0,
    }))

    setEntries(processed)
    setStrategies(strategyData || [])
    setLoading(false)
  }

  const needsCallout = useMemo(() => entries.filter(entry => entry.callout_thread_count === 0), [entries])
  const recentlyReviewed = useMemo(() => entries
    .filter(entry => entry.callout_thread_count > 0)
    .sort((a, b) => {
      const aTime = new Date(a.callout_threads?.[0]?.created_at || a.created_at).getTime()
      const bTime = new Date(b.callout_threads?.[0]?.created_at || b.created_at).getTime()
      return bTime - aTime
    }), [entries])

  const tabs = [
    ['needs', `NEEDS CALLOUT (${needsCallout.length})`],
    ['reviewed', `RECENTLY REVIEWED (${recentlyReviewed.length})`],
    ['strategies', `PUBLIC STRATEGIES (${strategies.length})`],
  ]

  return (
    <div style={{ paddingTop: 'calc(56px + env(safe-area-inset-top, 0px))', minHeight: '100vh' }}>
      <div className="page-shell review-shell" style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '3rem', lineHeight: 1, marginBottom: '4px' }}>REVIEW</h1>
          <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.1em' }}>
            FIND TRADES TO SHARPEN. FIND STRATEGIES TO STUDY.
          </p>
        </div>

        <PinnedRulesPanel session={session} context="review" variant="strip" />

        <div className="mobile-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '24px', flexWrap: 'wrap' }}>
          {tabs.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              borderBottom: tab === key ? '1px solid var(--red)' : '1px solid transparent',
              color: tab === key ? 'var(--text)' : 'var(--dim)',
              fontFamily: 'Space Mono',
              fontSize: '10px',
              letterSpacing: '0.08em',
              marginBottom: '-1px',
            }}>
              {label}
            </button>
          ))}
        </div>

        {error && <div className="card" style={{ padding: '14px', marginBottom: '18px', color: 'var(--gold)', fontFamily: 'Space Mono', fontSize: '10px' }}>{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--dim)' }}>LOADING REVIEW FLOOR...</div>
        ) : tab === 'needs' ? (
          needsCallout.length === 0 ? <Empty label="EVERYTHING HAS BEEN TOUCHED." /> : needsCallout.map(entry => <EntryCard key={entry.id} entry={entry} session={session} />)
        ) : tab === 'reviewed' ? (
          recentlyReviewed.length === 0 ? <Empty label="NO STRUCTURED REVIEWS YET." /> : recentlyReviewed.map(entry => <EntryCard key={entry.id} entry={entry} session={session} />)
        ) : (
          strategies.length === 0 ? <Empty label="NO PUBLIC STRATEGIES YET." /> : strategies.map(strategy => <StrategyCard key={strategy.id} strategy={strategy} />)
        )}
      </div>
    </div>
  )
}

function Empty({ label }) {
  return (
    <div style={{ textAlign: 'center', padding: '58px 20px' }}>
      <div style={{ fontFamily: 'Bebas Neue', fontSize: '2.5rem', color: 'var(--border)', marginBottom: '8px' }}>{label}</div>
    </div>
  )
}
