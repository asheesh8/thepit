import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { TRADE_CONTEXTS } from '../lib/discipline'

const defaultLabels = Object.fromEntries(TRADE_CONTEXTS.map(context => [context.key, context.label]))

export default function AccountSettings({ session }) {
  const [profile, setProfile] = useState({ username: '', avatar_url: '', bio: '' })
  const [categoryLabels, setCategoryLabels] = useState(() => {
    const stored = localStorage.getItem(`pit-category-labels:${session.user.id}`)
    return stored ? { ...defaultLabels, ...JSON.parse(stored) } : defaultLabels
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('username, avatar_url, bio')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile({ username: data.username || '', avatar_url: data.avatar_url || '', bio: data.bio || '' })
      })
  }, [session.user.id])

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    setSaved(false)
    await supabase
      .from('profiles')
      .update({ avatar_url: profile.avatar_url.trim(), bio: profile.bio.trim() })
      .eq('id', session.user.id)
    localStorage.setItem(`pit-category-labels:${session.user.id}`, JSON.stringify(categoryLabels))
    setSaving(false)
    setSaved(true)
  }

  return (
    <div style={{ paddingTop: '56px', minHeight: '100vh' }}>
      <div className="settings-shell">
        <header className="settings-header">
          <div>
            <h1>ACCOUNT SETTINGS</h1>
            <p>PROFILE, PFP, AND HOW YOUR TRADING DESK IS LABELED.</p>
          </div>
          {saved && <span className="tag" style={{ color: 'var(--green)' }}>SAVED</span>}
        </header>

        <form onSubmit={save} className="settings-grid">
          <section className="settings-panel">
            <div className="settings-panel-title">PROFILE</div>
            <label>USERNAME</label>
            <input value={profile.username} disabled />
            <label>PROFILE PICTURE URL</label>
            <input value={profile.avatar_url} onChange={event => setProfile(prev => ({ ...prev, avatar_url: event.target.value }))} placeholder="https://..." />
            <label>BIO</label>
            <textarea value={profile.bio} onChange={event => setProfile(prev => ({ ...prev, bio: event.target.value }))} rows={4} placeholder="what kind of trader are you?" />
          </section>

          <section className="settings-panel">
            <div className="settings-panel-title">ACCOUNT CATEGORIES</div>
            <p className="settings-muted">
              These labels keep the app clean without making extra pages. Backtesting stays in the Backtesting desk.
            </p>
            {TRADE_CONTEXTS.filter(context => context.key !== 'backtest').map(context => (
              <div key={context.key} className="settings-category-row">
                <span className="tag" style={{ color: context.color }}>{context.shortLabel}</span>
                <input value={categoryLabels[context.key]} onChange={event => setCategoryLabels(prev => ({ ...prev, [context.key]: event.target.value }))} />
              </div>
            ))}
          </section>

          <button className="btn btn-red settings-save" disabled={saving}>
            {saving ? 'SAVING...' : 'SAVE SETTINGS'}
          </button>
        </form>
      </div>
    </div>
  )
}
