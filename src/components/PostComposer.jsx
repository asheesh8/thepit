import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function PostComposer({ session, onPost }) {
  const [body, setBody] = useState('')
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const handleMedia = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setMediaFile(file)
    setMediaPreview(URL.createObjectURL(file))
  }

  const clearMedia = () => {
    setMediaFile(null)
    setMediaPreview(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!body.trim() && !mediaFile) return
    setLoading(true)

    let media_url = null

    if (mediaFile) {
      const ext = mediaFile.name.split('.').pop()
      const path = `posts/${session.user.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('charts').upload(path, mediaFile)
      if (!error) {
        const { data } = supabase.storage.from('charts').getPublicUrl(path)
        media_url = data.publicUrl
      }
    }

    const { data } = await supabase
      .from('posts')
      .insert({ user_id: session.user.id, body: body.trim() || null, media_url })
      .select('*, profiles(username)')
      .single()

    if (data && onPost) onPost(data)

    setBody('')
    setMediaFile(null)
    setMediaPreview(null)
    setExpanded(false)
    setLoading(false)
  }

  return (
    <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
      <form onSubmit={handleSubmit}>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onFocus={() => setExpanded(true)}
          placeholder="what's on your mind? rant, reflect, share a chart..."
          rows={expanded ? 4 : 2}
          style={{
            width: '100%', background: 'transparent', border: 'none',
            color: 'var(--text)', fontSize: '15px', outline: 'none',
            resize: 'none', lineHeight: 1.6, fontFamily: 'DM Sans',
          }}
        />

        {/* media preview */}
        {mediaPreview && (
          <div style={{ position: 'relative', marginTop: '12px', display: 'inline-block' }}>
            {mediaFile?.type?.startsWith('video') ? (
              <video src={mediaPreview} style={{ maxHeight: '200px', maxWidth: '100%', border: '1px solid var(--border)' }} />
            ) : (
              <img src={mediaPreview} alt="preview" style={{ maxHeight: '200px', maxWidth: '100%', border: '1px solid var(--border)' }} />
            )}
            <button type="button" onClick={clearMedia} style={{
              position: 'absolute', top: '6px', right: '6px',
              background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff',
              width: '22px', height: '22px', cursor: 'pointer', fontSize: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          </div>
        )}

        {expanded && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            <label style={{ cursor: 'pointer' }}>
              <span style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.1em', padding: '6px 10px', border: '1px solid var(--border)' }}>
                📎 MEDIA
              </span>
              <input type="file" accept="image/*,video/*" onChange={handleMedia} style={{ display: 'none' }} />
            </label>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => { setExpanded(false); setBody(''); clearMedia() }}
                className="btn" style={{ padding: '6px 14px', fontSize: '10px', color: 'var(--dim)' }}>
                CANCEL
              </button>
              <button type="submit" disabled={loading || (!body.trim() && !mediaFile)}
                className="btn btn-red" style={{ padding: '6px 14px', fontSize: '10px' }}>
                {loading ? '...' : 'POST'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
