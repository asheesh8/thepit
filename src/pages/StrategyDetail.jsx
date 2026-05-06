/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import EntryCard from '../components/EntryCard'
import StrategyForm from '../components/StrategyForm'
import { EMPTY_STRATEGY, formatPosterText, STRATEGY_FIELDS } from '../lib/discipline'
import { isPublicStrategyViewable } from '../lib/community'

function posterSection(title, lines) {
  if (lines.length === 0) return ''
  return `
    <section>
      <h2>${title}</h2>
      <ul>${lines.map(line => `<li>${line}</li>`).join('')}</ul>
    </section>
  `
}

function escapeHtml(value = '') {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export default function StrategyDetail({ session }) {
  const { id } = useParams()
  const [strategy, setStrategy] = useState(null)
  const [form, setForm] = useState(EMPTY_STRATEGY)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isOwner = strategy?.user_id === session.user.id

  useEffect(() => {
    loadStrategy()
  }, [id])

  const loadStrategy = async () => {
    setLoading(true)
    setError('')
    const [{ data: strategyData, error: strategyError }, { data: entryData }] = await Promise.all([
      supabase.from('strategies').select('*, profiles(username)').eq('id', id).single(),
      supabase.from('entries').select('*, profiles(username), strategies(name)').eq('strategy_id', id).eq('is_public', true).order('created_at', { ascending: false }),
    ])
    if (strategyError) setError(strategyError.message)
    if (strategyData && !isPublicStrategyViewable(strategyData, session.user.id)) {
      setStrategy(null)
      setError('Strategy is private.')
    } else {
      setStrategy(strategyData)
      setForm({ ...EMPTY_STRATEGY, ...(strategyData || {}) })
    }
    setEntries(entryData || [])
    setLoading(false)
  }

  const saveStrategy = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const updates = Object.fromEntries(STRATEGY_FIELDS.map(field => [field.key, form[field.key] || '']))
    const { data, error: updateError } = await supabase
      .from('strategies')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select('*')
      .single()
    if (updateError) setError(updateError.message)
    if (data) {
      setStrategy(data)
      setForm({ ...EMPTY_STRATEGY, ...data })
    }
    setSaving(false)
  }

  const togglePublic = async () => {
    const { data, error: updateError } = await supabase
      .from('strategies')
      .update({ is_public: !strategy.is_public, updated_at: new Date().toISOString() })
      .eq('id', strategy.id)
      .eq('user_id', session.user.id)
      .select('*, profiles(username)')
      .single()
    if (updateError) setError(updateError.message)
    if (data) setStrategy(data)
  }

  const cloneStrategy = async () => {
    const copy = Object.fromEntries(STRATEGY_FIELDS.map(field => [field.key, strategy[field.key] || '']))
    const { data, error: cloneError } = await supabase
      .from('strategies')
      .insert({
        ...copy,
        name: `Copy of ${strategy.name}`,
        user_id: session.user.id,
        is_public: false,
        source_strategy_id: strategy.id,
      })
      .select('id')
      .single()
    if (cloneError) {
      setError(cloneError.message)
      return
    }
    if (data) window.location.href = `/strategies/${data.id}`
  }

  const posterHtml = useMemo(() => {
    if (!strategy) return ''
    const safe = Object.fromEntries(Object.entries(strategy).map(([key, value]) => [key, escapeHtml(String(value || ''))]))
    return `
      <!doctype html>
      <html>
        <head>
          <title>${safe.name} Strategy Poster</title>
          <style>
            @page { size: letter; margin: 0.45in; }
            body { font-family: Arial, sans-serif; color: #151515; margin: 0; }
            .poster { border: 4px solid #151515; min-height: 9.8in; padding: 28px; }
            h1 { font-size: 54px; margin: 0 0 6px; letter-spacing: 1px; text-transform: uppercase; }
            .meta { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #666; border-bottom: 2px solid #151515; padding-bottom: 14px; margin-bottom: 18px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 20px; }
            section { break-inside: avoid; border-top: 1px solid #999; padding-top: 10px; }
            h2 { font-size: 14px; letter-spacing: 2px; margin: 0 0 8px; text-transform: uppercase; }
            ul { margin: 0; padding-left: 18px; }
            li { font-size: 12px; line-height: 1.45; margin-bottom: 5px; }
            .mantra { margin-top: 18px; padding: 14px; background: #151515; color: #fff; font-size: 18px; font-weight: 700; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <main class="poster">
            <h1>${safe.name}</h1>
            <div class="meta">${safe.market || 'MARKET'} / ${safe.timeframes || 'TIMEFRAMES'}</div>
            <div class="grid">
              ${posterSection('Setup Checklist', formatPosterText(safe.setup_conditions))}
              ${posterSection('Entry Rules', formatPosterText(safe.entry_rules))}
              ${posterSection('Stops', formatPosterText(safe.stop_rules))}
              ${posterSection('Take Profit', formatPosterText(safe.take_profit_rules))}
              ${posterSection('Risk Rules', formatPosterText(safe.risk_rules))}
              ${posterSection('Do Not Trade If', [...formatPosterText(safe.invalidation_rules), ...formatPosterText(safe.mistakes_to_avoid)])}
            </div>
            ${safe.mantra ? `<div class="mantra">${safe.mantra}</div>` : ''}
          </main>
          <script>window.onload = () => { window.print() }</script>
        </body>
      </html>
    `
  }, [strategy])

  const downloadPoster = () => {
    const win = window.open('', '_blank')
    if (!win) {
      setError('Popup blocked. Allow popups to print the poster as a PDF.')
      return
    }
    win.document.write(posterHtml)
    win.document.close()
  }

  if (loading) return <div style={{ paddingTop: '100px', textAlign: 'center', fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--dim)' }}>LOADING STRATEGY...</div>
  if (!strategy) return <div style={{ paddingTop: '100px', textAlign: 'center', fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--red)' }}>STRATEGY NOT FOUND</div>

  return (
    <div style={{ paddingTop: '56px', minHeight: '100vh' }}>
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '32px 24px' }}>
        <Link to="/strategies" style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.1em' }}>BACK TO STRATEGIES</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'flex-end', margin: '16px 0 26px' }}>
          <div>
            <h1 style={{ fontSize: '3.2rem', lineHeight: 1 }}>{strategy.name}</h1>
            <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.1em' }}>
              {(strategy.market || 'MARKET TBD').toUpperCase()} {strategy.timeframes ? ` / ${strategy.timeframes.toUpperCase()}` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {isOwner ? (
              <button onClick={togglePublic} className={`btn ${strategy.is_public ? 'btn-green' : ''}`} style={{ fontSize: '11px', padding: '10px 18px' }}>
                {strategy.is_public ? 'PUBLIC' : 'MAKE PUBLIC'}
              </button>
            ) : (
              <button onClick={cloneStrategy} className="btn btn-red" style={{ fontSize: '11px', padding: '10px 18px' }}>CLONE STRATEGY</button>
            )}
            <button onClick={downloadPoster} className="btn btn-green" style={{ fontSize: '11px', padding: '10px 18px' }}>DOWNLOAD POSTER</button>
          </div>
        </div>

        {error && <div className="card" style={{ padding: '14px', marginBottom: '18px', color: 'var(--gold)', fontFamily: 'Space Mono', fontSize: '10px' }}>{error}</div>}

        {isOwner ? (
          <div className="card" style={{ padding: '22px', marginBottom: '28px' }}>
            <StrategyForm value={form} onChange={setForm} onSubmit={saveStrategy} loading={saving} />
          </div>
        ) : (
          <div className="card" style={{ padding: '22px', marginBottom: '28px' }}>
            {STRATEGY_FIELDS.filter(field => field.key !== 'name').map(field => (
              strategy[field.key] ? (
                <section key={field.key} style={{ marginBottom: '18px' }}>
                  <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--red)', letterSpacing: '0.1em', marginBottom: '6px' }}>{field.label.toUpperCase()}</div>
                  <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{strategy[field.key]}</p>
                </section>
              ) : null
            ))}
          </div>
        )}

        <h2 style={{ fontSize: '2rem', marginBottom: '12px' }}>LINKED TRADES</h2>
        {entries.length === 0 ? (
          <div className="card" style={{ padding: '26px', color: 'var(--dim)', fontFamily: 'Space Mono', fontSize: '11px', textAlign: 'center' }}>
            NO TRADES LINKED TO THIS STRATEGY YET.
          </div>
        ) : (
          entries.map(entry => <EntryCard key={entry.id} entry={entry} session={session} />)
        )}
      </div>
    </div>
  )
}
