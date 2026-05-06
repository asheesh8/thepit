import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const emptyTrack = { title: '', url: '', coverUrl: '' }

function inferTrackType(url = '') {
  if (url.match(/\.(mp4|webm|mov|m4v)(\?.*)?$/i)) return 'video'
  if (url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) return 'image'
  return 'audio'
}

function normalizeQueue(room) {
  const queue = Array.isArray(room.music_queue) ? room.music_queue : []
  if (queue.length > 0) return queue
  if (!room.music_url) return []
  return [{
    title: room.music_title || 'Untitled track',
    url: room.music_url,
    coverUrl: room.music_cover_url || '',
    type: inferTrackType(room.music_url),
  }]
}

export default function MusicDeck({ room, onSaved, embedded = false }) {
  const audioRef = useRef(null)
  const videoRef = useRef(null)
  const [draft, setDraft] = useState(emptyTrack)

  const queue = normalizeQueue(room)
  const currentIndex = Math.min(Math.max(room.music_current_index || 0, 0), Math.max(queue.length - 1, 0))
  const current = queue[currentIndex]
  const currentType = current ? inferTrackType(current.url) : 'audio'

  useEffect(() => {
    if (audioRef.current && room.music_is_playing) audioRef.current.play().catch(() => {})
    if (audioRef.current && !room.music_is_playing) audioRef.current.pause()
    if (videoRef.current && room.music_is_playing) videoRef.current.play().catch(() => {})
    if (videoRef.current && !room.music_is_playing) videoRef.current.pause()
  }, [room.music_url, room.music_is_playing])

  const persistDeck = async (nextQueue, nextIndex = currentIndex, isPlaying = room.music_is_playing) => {
    const nextCurrent = nextQueue[nextIndex] || null
    const { data } = await supabase
      .from('live_rooms')
      .update({
        music_queue: nextQueue,
        music_current_index: nextIndex,
        music_url: nextCurrent?.url || '',
        music_title: nextCurrent?.title || '',
        music_cover_url: nextCurrent?.coverUrl || '',
        music_is_playing: !!nextCurrent && isPlaying,
        updated_at: new Date().toISOString(),
      })
      .eq('id', room.id)
      .select('*')
      .single()
    if (data) onSaved?.({ kind: 'music', room: data })
  }

  const addTrack = async (event) => {
    event.preventDefault()
    if (!draft.url.trim()) return
    const track = {
      title: draft.title.trim() || `Track ${queue.length + 1}`,
      url: draft.url.trim(),
      coverUrl: draft.coverUrl.trim(),
      type: inferTrackType(draft.url),
    }
    await persistDeck([...queue, track], queue.length === 0 ? 0 : currentIndex, room.music_is_playing)
    setDraft(emptyTrack)
  }

  const playIndex = (index, isPlaying = true) => persistDeck(queue, index, isPlaying)
  const removeTrack = (index) => {
    const nextQueue = queue.filter((_, itemIndex) => itemIndex !== index)
    const nextIndex = Math.min(currentIndex, Math.max(nextQueue.length - 1, 0))
    persistDeck(nextQueue, nextIndex, room.music_is_playing)
  }

  const moveTrack = (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= queue.length) return
    const nextQueue = [...queue]
    const [track] = nextQueue.splice(index, 1)
    nextQueue.splice(target, 0, track)
    const nextIndex = currentIndex === index ? target : currentIndex === target ? index : currentIndex
    persistDeck(nextQueue, nextIndex, room.music_is_playing)
  }

  const skip = () => {
    if (queue.length === 0) return
    const nextIndex = currentIndex + 1 >= queue.length ? 0 : currentIndex + 1
    persistDeck(queue, nextIndex, true)
  }

  const previewStyle = {
    minHeight: '260px',
    border: '1px solid var(--border)',
    background: 'var(--black)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  }

  return (
    <section className={embedded ? '' : 'card'} style={{ padding: embedded ? 0 : '14px' }}>
      <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>ROOM QUEUE</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(280px, 0.9fr)', gap: '14px', alignItems: 'start' }}>
        <div>
          <div style={previewStyle}>
            {!current ? (
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: '3rem', color: 'var(--border)', lineHeight: 1 }}>NO TRACK</div>
                <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', marginTop: '8px' }}>ADD AUDIO OR VIDEO TO THE ROOM QUEUE.</p>
              </div>
            ) : currentType === 'video' ? (
              <video ref={videoRef} src={current.url} poster={current.coverUrl || undefined} controls style={{ width: '100%', maxHeight: '420px', display: 'block', background: '#000' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', minHeight: '260px', background: current.coverUrl ? `url(${current.coverUrl}) center/cover` : 'linear-gradient(135deg, var(--dark), var(--black))', display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ width: '100%', padding: '18px', background: 'linear-gradient(transparent, rgba(0,0,0,0.82))' }}>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '2.2rem', color: '#fff', lineHeight: 1 }}>{current.title}</div>
                  <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: '#d8d8d0', marginTop: '5px' }}>{currentType.toUpperCase()}</div>
                </div>
              </div>
            )}
          </div>
          {current && currentType !== 'video' && <audio ref={audioRef} src={current.url} controls style={{ width: '100%', marginTop: '10px' }} />}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
            <button onClick={() => playIndex(currentIndex, !room.music_is_playing)} disabled={!current} className="btn btn-green" style={{ padding: '8px 12px', fontSize: '9px' }}>
              {room.music_is_playing ? 'PAUSE SYNC' : 'PLAY SYNC'}
            </button>
            <button onClick={skip} disabled={queue.length < 2} className="btn btn-gold" style={{ padding: '8px 12px', fontSize: '9px' }}>SKIP</button>
            <button onClick={() => persistDeck([], 0, false)} disabled={queue.length === 0} className="btn" style={{ padding: '8px 12px', fontSize: '9px' }}>CLEAR QUEUE</button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '12px' }}>
          <form onSubmit={addTrack} style={{ display: 'grid', gap: '8px' }}>
            <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--red)', letterSpacing: '0.1em' }}>ADD TO QUEUE</div>
            <input value={draft.title} onChange={event => setDraft(prev => ({ ...prev, title: event.target.value }))} placeholder="track / video title" style={{ background: 'var(--black)', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 10px', outline: 'none' }} />
            <input value={draft.url} onChange={event => setDraft(prev => ({ ...prev, url: event.target.value }))} placeholder="audio or video URL" style={{ background: 'var(--black)', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 10px', outline: 'none' }} />
            <input value={draft.coverUrl} onChange={event => setDraft(prev => ({ ...prev, coverUrl: event.target.value }))} placeholder="cover image URL optional" style={{ background: 'var(--black)', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 10px', outline: 'none' }} />
            <button type="submit" className="btn btn-red" style={{ justifyContent: 'center', padding: '9px 12px', fontSize: '9px' }}>ADD TRACK</button>
          </form>

          <div>
            <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', letterSpacing: '0.1em', marginBottom: '8px' }}>UP NEXT</div>
            {queue.length === 0 ? (
              <div style={{ border: '1px solid var(--border)', padding: '16px', fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)' }}>QUEUE EMPTY.</div>
            ) : queue.map((track, index) => (
              <div key={`${track.url}-${index}`} style={{ display: 'grid', gridTemplateColumns: '52px minmax(0, 1fr)', gap: '10px', border: index === currentIndex ? '1px solid var(--red)' : '1px solid var(--border)', padding: '8px', marginBottom: '8px', background: index === currentIndex ? 'rgba(230,57,70,0.08)' : 'transparent' }}>
                <div style={{ height: '52px', background: track.coverUrl ? `url(${track.coverUrl}) center/cover` : 'var(--dark)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Bebas Neue', color: 'var(--dim)' }}>
                  {inferTrackType(track.url).slice(0, 3).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', lineHeight: 1, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</div>
                  <div style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--dim)', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.url}</div>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '7px' }}>
                    <button onClick={() => playIndex(index, true)} className="btn btn-green" style={{ padding: '5px 7px', fontSize: '8px' }}>PLAY</button>
                    <button onClick={() => moveTrack(index, -1)} disabled={index === 0} className="btn" style={{ padding: '5px 7px', fontSize: '8px' }}>UP</button>
                    <button onClick={() => moveTrack(index, 1)} disabled={index === queue.length - 1} className="btn" style={{ padding: '5px 7px', fontSize: '8px' }}>DOWN</button>
                    <button onClick={() => removeTrack(index)} className="btn btn-red" style={{ padding: '5px 7px', fontSize: '8px' }}>REMOVE</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
