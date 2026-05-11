/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const GOAL_OPTIONS = [
  { key: 'pass_combine',       label: 'PASS THE COMBINE',    icon: '🎯' },
  { key: 'gain_allocation',    label: 'GAIN ALLOCATION',     icon: '📈' },
  { key: 'build_buffer',       label: 'BUILD BUFFER',        icon: '🛡️' },
  { key: 'take_payout',        label: 'TAKE PAYOUT',         icon: '💰' },
  { key: 'stay_disciplined',   label: 'STAY DISCIPLINED',    icon: '🧠' },
  { key: 'just_learning',      label: 'JUST LEARNING',       icon: '📚' },
]

function getSundayKey() {
  // Returns the ISO date string for the most recent (or current) Sunday
  const d = new Date()
  // getDay() 0=Sun — today IS Sunday, use today
  const offset = d.getDay() // 0 if Sunday
  d.setDate(d.getDate() - offset)
  return d.toISOString().slice(0, 10)
}

export default function WeeklyReviewGate({ session, children }) {
  const [loading,   setLoading]   = useState(true)
  const [complete,  setComplete]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [goal,      setGoal]      = useState('')
  const [intention, setIntention] = useState('')

  const today     = new Date()
  const isSunday  = today.getDay() === 0
  const weekStart = getSundayKey()

  useEffect(() => {
    if (!isSunday) { setComplete(true); setLoading(false); return }
    checkReview()
  }, [session.user.id])

  const checkReview = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('weekly_reviews')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('week_start', weekStart)
      .maybeSingle()
    setComplete(!!data)
    setLoading(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!goal) return
    setSaving(true)
    setError('')
    const { error: insertError } = await supabase
      .from('weekly_reviews')
      .upsert({ user_id: session.user.id, week_start: weekStart, goal_type: goal, intention: intention.trim() || null })
    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }
    setComplete(true)
    setSaving(false)
  }

  if (loading || complete) return children

  return (
    <>
      {children}
      <div className="weekly-review-overlay">
        <div className="weekly-review-modal">
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--green)', letterSpacing: '0.18em', marginBottom: '8px' }}>
              SUNDAY · WEEK AHEAD
            </div>
            <h1 style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(2.2rem, 6vw, 3rem)', letterSpacing: '0.08em', lineHeight: 1, margin: 0 }}>
              WHAT'S THE GOAL THIS WEEK?
            </h1>
            <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', marginTop: '10px', lineHeight: 1.7 }}>
              One focus. One direction. Lock it in.
            </p>
          </div>

          <form onSubmit={submit}>
            <div className="weekly-goal-grid">
              {GOAL_OPTIONS.map(opt => (
                <button
                  type="button"
                  key={opt.key}
                  onClick={() => setGoal(opt.key)}
                  className={`weekly-goal-btn${goal === opt.key ? ' selected' : ''}`}
                >
                  <span className="weekly-goal-icon">{opt.icon}</span>
                  <span className="weekly-goal-label">{opt.label}</span>
                </button>
              ))}
            </div>

            <div style={{ marginTop: '20px' }}>
              <label style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>
                ONE THING YOU'RE FOCUSING ON — <span style={{ color: 'var(--muted)' }}>OPTIONAL</span>
              </label>
              <textarea
                value={intention}
                onChange={e => setIntention(e.target.value)}
                placeholder="e.g. No revenge trading, stick to the 2% rule, only take A+ setups..."
                rows={3}
                style={{
                  width: '100%', background: 'var(--black)', border: '1px solid var(--border)',
                  color: 'var(--text)', padding: '12px 14px', resize: 'none', outline: 'none',
                  fontFamily: 'DM Sans', fontSize: '14px', lineHeight: 1.5, boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--red)', marginTop: '10px' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!goal || saving}
              className="btn btn-red"
              style={{ width: '100%', justifyContent: 'center', padding: '14px', marginTop: '20px', fontSize: '12px', letterSpacing: '0.12em' }}
            >
              {saving ? 'LOCKING IN...' : 'LOCK IN THE WEEK'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
