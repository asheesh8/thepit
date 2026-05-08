/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getLocalDateKey } from '../lib/dateKeys'

const SLEEP_OPTIONS = ['bad', 'okay', 'good', 'locked in']

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

  useEffect(() => {
    loadToday()
  }, [session.user.id, today])

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
    if (insertError) {
      setError(insertError.message)
      return
    }
    setComplete(true)
  }

  if (loading) {
    return (
      <div className="daily-checkin-screen">
        <div className="daily-checkin-card">
          <div className="daily-checkin-brand">THE PIT</div>
          <div className="daily-checkin-muted">LOADING DISCIPLINE CHECK...</div>
        </div>
      </div>
    )
  }

  if (complete) return children

  return (
    <div className="daily-checkin-screen">
      <form onSubmit={submit} className="daily-checkin-card">
        <div className="daily-checkin-brand">THE PIT</div>
        <h1>CHECK IN FIRST.</h1>
        <p className="daily-checkin-muted">No app until you tell the truth about the state you are bringing into the market.</p>

        <div>
          <label className="daily-checkin-label">SLEEP LAST NIGHT</label>
          <div className="daily-checkin-options">
            {SLEEP_OPTIONS.map(option => (
              <button
                key={option}
                type="button"
                onClick={() => set('sleep_quality', option)}
                className={form.sleep_quality === option ? 'active' : ''}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="daily-checkin-label">HOW ARE YOU FEELING?</label>
          <input value={form.mood} onChange={event => set('mood', event.target.value)} placeholder="calm, tired, tilted, sharp..." />
        </div>

        <div className="daily-checkin-bools">
          {[
            ['made_bed', 'MADE BED'],
            ['drank_water', 'WATER IN'],
            ['impaired_focus', 'DRANK / SMOKED / OFF FOCUS'],
          ].map(([key, label]) => (
            <button key={key} type="button" onClick={() => set(key, !form[key])} className={form[key] ? 'active' : ''}>
              <span>{label}</span>
              <strong>{form[key] ? 'YES' : 'NO'}</strong>
            </button>
          ))}
        </div>

        <div>
          <label className="daily-checkin-label">ANYTHING TO BE HONEST ABOUT?</label>
          <textarea value={form.honesty_note} onChange={event => set('honesty_note', event.target.value)} rows={3} placeholder="No speeches. Just the truth." />
        </div>

        {error && <div className="daily-checkin-error">{error}</div>}

        <button type="submit" disabled={saving} className="btn btn-red daily-checkin-submit">
          {saving ? 'SAVING...' : 'ENTER THE PIT'}
        </button>
      </form>
    </div>
  )
}
