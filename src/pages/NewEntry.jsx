import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

const MINDSET_LABELS = {
  1: 'Revenge trading', 2: 'Emotional wreck', 3: 'Distracted',
  4: 'Below average', 5: 'Neutral', 6: 'Focused',
  7: 'In the zone', 8: 'Sharp', 9: 'Locked in', 10: 'Peak state'
}

export default function NewEntry({ session }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    symbol: '', direction: 'long', entry_price: '', exit_price: '',
    pnl: '', mindset_rating: 5, reflection: '', what_id_do_differently: '', is_public: false
  })
  const [chartFile, setChartFile] = useState(null)
  const [chartPreview, setChartPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleChartChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setChartFile(file)
    setChartPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    let chart_url = null

    // upload chart screenshot if provided
    if (chartFile) {
      const ext = chartFile.name.split('.').pop()
      const path = `${session.user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('charts')
        .upload(path, chartFile)
      if (uploadError) {
        setError('Chart upload failed: ' + uploadError.message)
        setLoading(false)
        return
      }
      const { data: urlData } = supabase.storage.from('charts').getPublicUrl(path)
      chart_url = urlData.publicUrl
    }

    const { error: insertError } = await supabase.from('entries').insert({
      user_id: session.user.id,
      symbol: form.symbol.toUpperCase(),
      direction: form.direction,
      entry_price: form.entry_price ? parseFloat(form.entry_price) : null,
      exit_price: form.exit_price ? parseFloat(form.exit_price) : null,
      pnl: form.pnl ? parseFloat(form.pnl) : null,
      mindset_rating: form.mindset_rating,
      reflection: form.reflection,
      what_id_do_differently: form.what_id_do_differently,
      is_public: form.is_public,
      chart_url,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    navigate(form.is_public ? '/feed' : '/journal')
  }

  const inputStyle = {
    width: '100%', background: '#111', border: '1px solid #242424',
    padding: '12px 14px', color: '#e8e8e0', fontSize: '14px', outline: 'none',
  }

  const labelStyle = {
    fontFamily: 'Space Mono', fontSize: '10px', letterSpacing: '0.1em',
    color: '#888880', display: 'block', marginBottom: '8px'
  }

  return (
    <div style={{ paddingTop: '56px', minHeight: '100vh' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 24px' }}>

        <h1 style={{ fontSize: '3rem', letterSpacing: '0.05em', marginBottom: '4px' }}>LOG A TRADE</h1>
        <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: '#444440', letterSpacing: '0.1em', marginBottom: '32px' }}>
          BE HONEST. NOBODY'S WATCHING. YOU ARE.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* symbol + direction */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>SYMBOL</label>
              <input value={form.symbol} onChange={e => set('symbol', e.target.value)}
                placeholder="MNQ, ES, NQ..." required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>DIRECTION</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['long', 'short'].map(d => (
                  <button type="button" key={d} onClick={() => set('direction', d)} style={{
                    flex: 1, padding: '12px', border: '1px solid',
                    borderColor: form.direction === d ? (d === 'long' ? '#2ec4b6' : '#e63946') : '#242424',
                    background: form.direction === d ? (d === 'long' ? 'rgba(46,196,182,0.1)' : 'rgba(230,57,70,0.1)') : 'transparent',
                    color: form.direction === d ? (d === 'long' ? '#2ec4b6' : '#e63946') : '#444440',
                    fontFamily: 'Space Mono', fontSize: '11px', letterSpacing: '0.1em', cursor: 'pointer',
                    textTransform: 'uppercase',
                  }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* prices */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            {[['entry_price', 'ENTRY PRICE'], ['exit_price', 'EXIT PRICE'], ['pnl', 'P&L ($)']].map(([key, label]) => (
              <div key={key}>
                <label style={labelStyle}>{label}</label>
                <input type="number" step="0.01" value={form[key]}
                  onChange={e => set(key, e.target.value)}
                  style={inputStyle} placeholder="0.00" />
              </div>
            ))}
          </div>

          {/* mindset rating */}
          <div>
            <label style={labelStyle}>MINDSET RATING — <span style={{ color: '#e8e8e0' }}>{form.mindset_rating}/10 · {MINDSET_LABELS[form.mindset_rating]}</span></label>
            <input type="range" min={1} max={10} value={form.mindset_rating}
              onChange={e => set('mindset_rating', parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#e63946', cursor: 'pointer' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Space Mono', fontSize: '9px', color: '#444440', marginTop: '4px' }}>
              <span>REVENGE</span><span>PEAK</span>
            </div>
          </div>

          {/* chart upload */}
          <div>
            <label style={labelStyle}>CHART SCREENSHOT</label>
            <label style={{ ...inputStyle, display: 'block', cursor: 'pointer', color: '#444440', textAlign: 'center', padding: '20px' }}>
              {chartPreview ? (
                <img src={chartPreview} alt="chart" style={{ maxHeight: '200px', maxWidth: '100%' }} />
              ) : (
                <span style={{ fontFamily: 'Space Mono', fontSize: '11px', letterSpacing: '0.1em' }}>CLICK TO UPLOAD CHART</span>
              )}
              <input type="file" accept="image/*" onChange={handleChartChange} style={{ display: 'none' }} />
            </label>
          </div>

          {/* reflection */}
          <div>
            <label style={labelStyle}>REFLECTION</label>
            <textarea value={form.reflection} onChange={e => set('reflection', e.target.value)}
              placeholder="What happened? What were you thinking? Be real with yourself..."
              rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          {/* what i'd do differently */}
          <div>
            <label style={labelStyle}>WHAT I'D DO DIFFERENTLY</label>
            <textarea value={form.what_id_do_differently} onChange={e => set('what_id_do_differently', e.target.value)}
              placeholder="No excuses, just facts..."
              rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          {/* public toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', border: '1px solid #242424' }}>
            <button type="button" onClick={() => set('is_public', !form.is_public)} style={{
              width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer',
              background: form.is_public ? '#e63946' : '#2a2a2a', position: 'relative', transition: 'background 0.2s',
            }}>
              <div style={{
                width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
                position: 'absolute', top: '3px', transition: 'left 0.2s',
                left: form.is_public ? '21px' : '3px',
              }} />
            </button>
            <div>
              <div style={{ fontFamily: 'Space Mono', fontSize: '11px', color: '#e8e8e0', letterSpacing: '0.05em' }}>
                {form.is_public ? 'POST TO THE FLOOR' : 'KEEP PRIVATE'}
              </div>
              <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: '#444440', marginTop: '2px' }}>
                {form.is_public ? 'THE COMMUNITY WILL SEE THIS' : 'ONLY YOU CAN SEE THIS'}
              </div>
            </div>
          </div>

          {error && (
            <div style={{ fontFamily: 'Space Mono', fontSize: '11px', color: '#e63946', padding: '12px', border: '1px solid #e63946' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-red" style={{ padding: '16px', width: '100%', justifyContent: 'center', fontSize: '12px' }}>
            {loading ? 'SAVING...' : 'LOG THIS TRADE'}
          </button>
        </form>
      </div>
    </div>
  )
}
