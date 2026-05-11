import { useState, useEffect } from 'react'
import { FEATURES_VERSION, NEW_FEATURES } from '../config/features'

export default function NewFeaturesModal() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
  }, [])

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.72)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}
      onClick={e => { if (e.target === e.currentTarget) dismiss() }}
    >
      <div style={{
        width: '100%', maxWidth: '480px',
        background: 'var(--dark)',
        border: '1px solid var(--border)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        padding: '28px',
        position: 'relative',
      }}>
        <button onClick={dismiss} style={{
          position: 'absolute', top: '14px', right: '14px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--dim)', fontSize: '18px', lineHeight: 1, padding: '4px 8px',
        }}>×</button>

        <div style={{ marginBottom: '22px' }}>
          <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--red)', letterSpacing: '0.18em', marginBottom: '8px' }}>
            WHAT'S NEW
          </div>
          <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', letterSpacing: '0.05em', lineHeight: 1 }}>
            Fresh drops in The Pit
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
          {NEW_FEATURES.map(f => (
            <div key={f.title} style={{
              display: 'flex', gap: '14px', alignItems: 'flex-start',
              padding: '12px 14px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: '20px', flexShrink: 0, lineHeight: 1, marginTop: '2px' }}>{f.icon}</span>
              <div>
                <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--text)', letterSpacing: '0.08em', marginBottom: '4px' }}>
                  {f.title}
                </div>
                <div style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--dim)', lineHeight: 1.55 }}>
                  {f.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={dismiss} className="btn btn-red" style={{ width: '100%', padding: '12px', fontSize: '11px', letterSpacing: '0.12em' }}>
          LET'S GO
        </button>
      </div>
    </div>
  )
}
