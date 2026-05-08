import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { TRADE_CONTEXTS } from '../lib/discipline'

const MARKETS = ['equities', 'futures', 'forex', 'crypto', 'options']
const LEVELS = ['beginner', 'intermediate', 'advanced', 'professional']
const defaultLabels = Object.fromEntries(TRADE_CONTEXTS.map(c => [c.key, c.label]))

export default function AccountSettings({ session }) {
  const fileInputRef = useRef(null)

  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarPreview, setAvatarPreview] = useState('')
  const [bio, setBio] = useState('')
  const [markets, setMarkets] = useState([])
  const [level, setLevel] = useState('')
  const [goalText, setGoalText] = useState('')
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
      .select('username, avatar_url, bio, trading_categories, experience_level, goal_text')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (!data) return
        setUsername(data.username || '')
        setAvatarUrl(data.avatar_url || '')
        setAvatarPreview(data.avatar_url || '')
        setBio(data.bio || '')
        setMarkets(data.trading_categories || [])
        setLevel(data.experience_level || '')
        setGoalText(data.goal_text || '')
      })
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

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('profiles').update({
      avatar_url: avatarUrl || null,
      bio: bio.trim(),
      trading_categories: markets,
      experience_level: level,
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

          {/* ── EXPERIENCE PANEL ── */}
          <section className="settings-panel">
            <div className="settings-panel-title">EXPERIENCE LEVEL</div>
            <div className="settings-chip-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', paddingTop: '4px' }}>
              {LEVELS.map(l => {
                const active = level === l
                return (
                  <button
                    key={l} type="button" onClick={() => setLevel(l)}
                    style={{
                      padding: '14px 8px', textAlign: 'center', position: 'relative',
                      background: active ? 'var(--dark)' : 'transparent',
                      border: `1px solid ${active ? 'var(--text)' : 'var(--border)'}`,
                      color: active ? 'var(--text)' : 'var(--dim)',
                      fontFamily: 'Space Mono', fontSize: '9px', letterSpacing: '0.08em',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {active && (
                      <span style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                        background: 'var(--red)',
                      }} />
                    )}
                    {l.toUpperCase()}
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
