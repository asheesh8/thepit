import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { TRADE_CONTEXTS } from '../lib/discipline'
import { PINNED_RULE_CONTEXTS, contextLabel } from '../lib/pinnedRules'

const MARKETS = ['equities', 'futures', 'forex', 'crypto', 'options']
const defaultLabels = Object.fromEntries(TRADE_CONTEXTS.map(c => [c.key, c.label]))

export default function AccountSettings({ session }) {
  const fileInputRef = useRef(null)

  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarPreview, setAvatarPreview] = useState('')
  const [bio, setBio] = useState('')
  const [markets, setMarkets] = useState([])
  const [goalText, setGoalText] = useState('')
  const [rules, setRules] = useState([])
  const [ruleDraft, setRuleDraft] = useState({ body: '', context: 'global' })
  const [categoryLabels, setCategoryLabels] = useState(() => {
    const stored = localStorage.getItem(`pit-category-labels:${session.user.id}`)
    return stored ? { ...defaultLabels, ...JSON.parse(stored) } : defaultLabels
  })

  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('profiles')
      .select('username, avatar_url, bio, trading_categories, goal_text')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (!data) return
        setUsername(data.username || '')
        setAvatarUrl(data.avatar_url || '')
        setAvatarPreview(data.avatar_url || '')
        setBio(data.bio || '')
        setMarkets(data.trading_categories || [])
        setGoalText(data.goal_text || '')
      })
    supabase
      .from('pinned_rules')
      .select('*')
      .eq('user_id', session.user.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data }) => setRules(data || []))
  }, [session.user.id])

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarPreview(URL.createObjectURL(file))
    setUploading(true)
    setError('')
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${session.user.id}/avatar-${Date.now()}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { contentType: file.type })
    if (uploadErr) {
      setError(uploadErr.message)
      setAvatarPreview(avatarUrl)
      setUploading(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const busted = `${publicUrl}?t=${Date.now()}`
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ avatar_url: busted })
      .eq('id', session.user.id)
    if (profileErr) {
      setError(`Photo uploaded, but profile did not save: ${profileErr.message}`)
      setAvatarPreview(avatarUrl)
      setUploading(false)
      return
    }
    setAvatarUrl(busted)
    setAvatarPreview(busted)
    setUploading(false)
  }

  const toggleMarket = (m) =>
    setMarkets(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])

  const addRule = async () => {
    const body = ruleDraft.body.trim()
    if (!body) return
    setError('')
    const { data, error: insertError } = await supabase
      .from('pinned_rules')
      .insert({
        user_id: session.user.id,
        body,
        context: ruleDraft.context,
        is_pinned: true,
        sort_order: rules.length,
      })
      .select('*')
      .single()
    if (insertError) {
      setError(insertError.message)
      return
    }
    if (data) setRules(prev => [...prev, data])
    setRuleDraft({ body: '', context: 'global' })
  }

  const toggleRulePinned = async (rule) => {
    const { data, error: updateError } = await supabase
      .from('pinned_rules')
      .update({ is_pinned: !rule.is_pinned })
      .eq('id', rule.id)
      .eq('user_id', session.user.id)
      .select('*')
      .single()
    if (updateError) {
      setError(updateError.message)
      return
    }
    if (data) setRules(prev => prev.map(row => row.id === data.id ? data : row))
  }

  const deleteRule = async (rule) => {
    const { error: deleteError } = await supabase
      .from('pinned_rules')
      .delete()
      .eq('id', rule.id)
      .eq('user_id', session.user.id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setRules(prev => prev.filter(row => row.id !== rule.id))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('profiles').update({
      avatar_url: avatarUrl || null,
      bio: bio.trim(),
      trading_categories: markets,
      goal_text: goalText.trim(),
    }).eq('id', session.user.id)
    localStorage.setItem(`pit-category-labels:${session.user.id}`, JSON.stringify(categoryLabels))
    setSaving(false)
    if (err) { setError(err.message) } else { setSaved(true); setTimeout(() => setSaved(false), 2500) }
  }

  const initial = username?.[0]?.toUpperCase() || '?'

  return (
    <div style={{ paddingTop: '56px', minHeight: '100vh' }}>
      <div className="settings-shell">

        {/* header */}
        <header className="settings-header">
          <div>
            <div style={{ fontFamily: 'Space Mono', fontSize: '10px', letterSpacing: '0.2em', color: 'var(--red)', marginBottom: '6px' }}>
              ACCOUNT
            </div>
            <h1>PROFILE SETTINGS</h1>
          </div>
          {saved && <span className="tag" style={{ color: 'var(--green)', borderColor: 'var(--green)' }}>SAVED ✓</span>}
        </header>

        <form onSubmit={handleSave} style={{ display: 'grid', gap: '16px' }}>

          {/* ── IDENTITY PANEL ── */}
          <section className="settings-panel">
            <div className="settings-panel-title">IDENTITY</div>

            <div className="settings-identity-grid" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '28px', alignItems: 'start', paddingTop: '4px' }}>

              {/* avatar upload */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '96px', height: '96px', borderRadius: '50%',
                    border: '1px solid var(--border)',
                    background: avatarPreview ? `url(${avatarPreview}) center/cover no-repeat` : 'var(--black)',
                    display: 'grid', placeItems: 'center',
                    fontFamily: 'Bebas Neue', fontSize: '2.5rem', color: 'var(--red)',
                    overflow: 'hidden',
                  }}>
                    {!avatarPreview && initial}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                      position: 'absolute', inset: 0, borderRadius: '50%', border: 'none',
                      background: uploading ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0)',
                      cursor: 'pointer', display: 'grid', placeItems: 'center',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!uploading) e.currentTarget.style.background = 'rgba(0,0,0,0.55)' }}
                    onMouseLeave={e => { if (!uploading) e.currentTarget.style.background = 'rgba(0,0,0,0)' }}
                  >
                    {uploading
                      ? <span style={{ fontFamily: 'Space Mono', fontSize: '9px', color: '#fff' }}>...</span>
                      : <CameraIcon />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="btn"
                  style={{ padding: '7px 14px', fontSize: '9px', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}
                >
                  {uploading ? 'UPLOADING...' : 'UPLOAD PHOTO'}
                </button>
                <span style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--muted)', letterSpacing: '0.04em', textAlign: 'center', lineHeight: 1.7 }}>
                  JPG · PNG · WEBP
                </span>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange} style={{ display: 'none' }} />
              </div>

              {/* username + bio */}
              <div style={{ display: 'grid', gap: '10px' }}>
                <div>
                  <label>USERNAME</label>
                  <input value={username} disabled style={{ opacity: 0.45, cursor: 'not-allowed' }} />
                </div>
                <div>
                  <label>BIO</label>
                  <div style={{ position: 'relative' }}>
                    <textarea
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      maxLength={200}
                      placeholder="What's your edge? What do you trade?"
                      rows={3}
                      style={{ paddingBottom: '24px' }}
                    />
                    <span style={{
                      position: 'absolute', bottom: '8px', right: '10px',
                      fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--muted)',
                    }}>
                      {bio.length}/200
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── YOUR WHY PANEL ── */}
          <section className="settings-panel">
            <div className="settings-panel-title">YOUR WHY</div>
            <p className="settings-muted" style={{ marginTop: 0 }}>
              What are you building toward? Shown on your profile as your goal.
            </p>
            <div style={{ position: 'relative' }}>
              <textarea
                value={goalText}
                onChange={e => setGoalText(e.target.value)}
                maxLength={120}
                placeholder="e.g. Buy my first house. Fund the garage. Be free."
                rows={3}
                style={{ paddingBottom: '22px' }}
              />
              <span style={{
                position: 'absolute', bottom: '8px', right: '10px',
                fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--muted)',
              }}>
                {goalText.length}/120
              </span>
            </div>
          </section>

          <section className="settings-panel">
            <div className="settings-panel-title">PINNED RULES</div>
            <p className="settings-muted" style={{ marginTop: 0 }}>
              These stay visible where you need pressure, not motivation.
            </p>
            <div className="settings-rule-builder">
              <input
                value={ruleDraft.body}
                onChange={e => setRuleDraft(prev => ({ ...prev, body: e.target.value }))}
                placeholder="don't force trash setups"
              />
              <select
                value={ruleDraft.context}
                onChange={e => setRuleDraft(prev => ({ ...prev, context: e.target.value }))}
              >
                {PINNED_RULE_CONTEXTS.map(context => (
                  <option key={context.key} value={context.key}>{context.label}</option>
                ))}
              </select>
              <button type="button" onClick={addRule} className="btn btn-green">ADD RULE</button>
            </div>
            <div className="settings-rule-list">
              {rules.length === 0 ? (
                <div className="settings-muted">NO RULES PINNED YET.</div>
              ) : rules.map(rule => (
                <div key={rule.id} className={`settings-rule-row ${rule.is_pinned ? 'active' : ''}`}>
                  <div>
                    <span>{contextLabel(rule.context)}</span>
                    <p>{rule.body}</p>
                  </div>
                  <div className="settings-rule-actions">
                    <button type="button" onClick={() => toggleRulePinned(rule)} className="btn">
                      {rule.is_pinned ? 'PINNED' : 'HIDDEN'}
                    </button>
                    <button type="button" onClick={() => deleteRule(rule)} className="btn btn-red">
                      DELETE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── MARKETS PANEL ── */}
          <section className="settings-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div className="settings-panel-title">MARKETS YOU TRADE</div>
              <span style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.08em' }}>
                SELECT ALL THAT APPLY
              </span>
            </div>
            <div className="settings-chip-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', paddingTop: '4px' }}>
              {MARKETS.map(m => {
                const active = markets.includes(m)
                return (
                  <button
                    key={m} type="button" onClick={() => toggleMarket(m)}
                    style={{
                      padding: '12px 8px', textAlign: 'center',
                      background: active ? 'var(--red)' : 'var(--black)',
                      border: `1px solid ${active ? 'var(--red)' : 'var(--border)'}`,
                      color: active ? '#fff' : 'var(--dim)',
                      fontFamily: 'Space Mono', fontSize: '9px', letterSpacing: '0.1em',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {m.toUpperCase()}
                  </button>
                )
              })}
            </div>
          </section>

          {/* ── TRADE LABELS PANEL ── */}
          <section className="settings-panel">
            <div className="settings-panel-title">TRADE LABELS</div>
            <p className="settings-muted" style={{ marginTop: 0 }}>
              Rename your trade contexts to match how you actually think about them.
            </p>
            <div style={{ display: 'grid', gap: '8px', paddingTop: '4px' }}>
              {TRADE_CONTEXTS.filter(c => c.key !== 'backtest').map(c => (
                <div key={c.key} className="settings-category-row">
                  <span className="tag" style={{ color: c.color, borderColor: c.color }}>{c.shortLabel}</span>
                  <input
                    value={categoryLabels[c.key]}
                    onChange={e => setCategoryLabels(prev => ({ ...prev, [c.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </section>

          {error && (
            <div style={{
              fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--red)',
              padding: '12px 14px', border: '1px solid var(--red)', background: 'rgba(230,57,70,0.06)',
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={saving || uploading} className="btn btn-red settings-save">
            {saving ? 'SAVING...' : 'SAVE SETTINGS'}
          </button>

        </form>
      </div>
    </div>
  )
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.9 }}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}
