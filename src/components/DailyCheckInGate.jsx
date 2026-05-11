/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getLocalDateKey } from '../lib/dateKeys'

const SLEEP_OPTIONS = ['bad', 'okay', 'good', 'locked in']

function PitLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '4px' }}>
      <svg width="28" height="28" viewBox="0 0 64 64" fill="none" style={{ flexShrink: 0 }}>
        <rect x="0" y="0" width="64" height="64" fill="#e63946"/>
        <polygon points="7,5 57,6 59,58 5,59" fill="#b82030"/>
        <polygon points="13,12 51,13 52,51 12,52" fill="#8c1828"/>
        <polygon points="19,18 45,19 46,45 18,46" fill="#620f1c"/>
        <polygon points="24,24 40,25 41,40 23,41" fill="#3e0813"/>
        <polygon points="28,28 36,29 36,36 27,37" fill="#010208"/>
      </svg>
      <span style={{
        fontFamily: 'Bebas Neue, sans-serif',
        fontSize: '1.6rem',
        letterSpacing: '0.2em',
        color: '#e63946',
      }}>THE PIT</span>
    </div>
  )
}

export default function DailyCheckInGate({ session, children }) {
  const today = getLocalDateKey()
  const [loading, setLoading] = useState(true)
  const [complete, setComplete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    sleep_quality: 'okay',
    mood: '',
    made_bed: false,
    drank_water: false,
    impaired_focus: false,
    honesty_note: '',
  })

  useEffect(() => { loadToday() }, [session.user.id, today])

  const loadToday = async () => {
    setLoading(true)
    setError('')
    const { data, error: loadError } = await supabase
      .from('daily_checkins')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('checkin_date', today)
      .maybeSingle()

    if (loadError) {
      setError(loadError.message)
      setComplete(true)
    } else {
      setComplete(!!data)
    }
    setLoading(false)
  }

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const { error: insertError } = await supabase
      .from('daily_checkins')
      .upsert({
        user_id: session.user.id,
        checkin_date: today,
        sleep_quality: form.sleep_quality,
        mood: form.mood.trim() || null,
        made_bed: form.made_bed,
        drank_water: form.drank_water,
        impaired_focus: form.impaired_focus,
        honesty_note: form.honesty_note.trim() || null,
      }, { onConflict: 'user_id,checkin_date' })

    setSaving(false)
    if (insertError) { setError(insertError.message); return }
    setComplete(true)
  }

  if (loading) return (
    <div className="checkin-screen">
      <div className="checkin-card" style={{ textAlign: 'center' }}>
        <PitLogo />
        <p className="checkin-muted" style={{ marginTop: '16px' }}>LOADING...</p>
      </div>
    </div>
  )

  if (complete) return children

  return (
    <div className="checkin-screen">

      {/* decorative blobs — same vibe as landing/auth */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(230,57,70,0.12) 0%, transparent 65%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-15%', left: '-8%', width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(46,196,182,0.07) 0%, transparent 65%)', borderRadius: '50%' }} />
      </div>

      <form onSubmit={submit} className="checkin-card" style={{ position: 'relative', zIndex: 1 }}>

        {/* header */}
        <div className="checkin-header">
          <PitLogo />
          <h1 className="checkin-title">CHECK IN FIRST.</h1>
          <p className="checkin-muted">
            No app until you tell the truth about the state you are bringing into the market.
          </p>
        </div>

        <div className="checkin-divider" />

        {/* sleep */}
        <div className="checkin-field">
          <label className="checkin-label">SLEEP LAST NIGHT</label>
          <div className="checkin-options">
            {SLEEP_OPTIONS.map(option => (
              <button
                key={option}
                type="button"
                onClick={() => set('sleep_quality', option)}
                className={`checkin-option-btn ${form.sleep_quality === option ? 'active' : ''}`}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* mood */}
        <div className="checkin-field">
          <label className="checkin-label">HOW ARE YOU FEELING?</label>
          <input
            className="checkin-input"
            value={form.mood}
            onChange={e => set('mood', e.target.value)}
            placeholder="calm, tired, tilted, sharp..."
          />
        </div>

        {/* booleans */}
        <div className="checkin-field">
          <label className="checkin-label">QUICK CHECKS</label>
          <div className="checkin-bools">
            {[
              ['made_bed', 'MADE BED'],
              ['drank_water', 'WATER IN'],
              ['impaired_focus', 'DRANK / SMOKED / OFF FOCUS'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => set(key, !form[key])}
                className={`checkin-bool-btn ${form[key] ? 'active' : ''}`}
              >
                <span>{label}</span>
                <strong className={`checkin-bool-val ${form[key] ? 'active' : ''}`}>
                  {form[key] ? 'YES' : 'NO'}
                </strong>
              </button>
            ))}
          </div>
        </div>

        {/* honesty note */}
        <div className="checkin-field">
          <label className="checkin-label">ANYTHING TO BE HONEST ABOUT?</label>
          <textarea
            className="checkin-input"
            value={form.honesty_note}
            onChange={e => set('honesty_note', e.target.value)}
            rows={3}
            placeholder="No speeches. Just the truth."
          />
        </div>

        {error && <div className="checkin-error">{error}</div>}

        <button type="submit" disabled={saving} className="btn btn-red checkin-submit">
          {saving ? 'SAVING...' : 'ENTER THE PIT →'}
        </button>
      </form>
    </div>
  )
}
