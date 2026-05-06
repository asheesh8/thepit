import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function MusicDeck({ room, onSaved }) {
  const audioRef = useRef(null)
  const [musicUrl, setMusicUrl] = useState(room.music_url || '')
  const [musicTitle, setMusicTitle] = useState(room.music_title || '')

  useEffect(() => {
    setMusicUrl(room.music_url || '')
    setMusicTitle(room.music_title || '')
    if (audioRef.current && room.music_is_playing) audioRef.current.play().catch(() => {})
    if (audioRef.current && !room.music_is_playing) audioRef.current.pause()
  }, [room.music_url, room.music_title, room.music_is_playing])

  const saveMusic = async (isPlaying = room.music_is_playing) => {
    const { data } = await supabase
      .from('live_rooms')
      .update({ music_url: musicUrl, music_title: musicTitle, music_is_playing: isPlaying, updated_at: new Date().toISOString() })
      .eq('id', room.id)
      .select('*')
      .single()
    if (data) onSaved?.({ kind: 'music', room: data })
  }

  return (
    <section className="card" style={{ padding: '14px' }}>
      <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>MUSIC DECK</h3>
      <div style={{ display: 'grid', gap: '8px' }}>
        <input value={musicTitle} onChange={event => setMusicTitle(event.target.value)} placeholder="track title" style={{ background: 'var(--black)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 10px', outline: 'none' }} />
        <input value={musicUrl} onChange={event => setMusicUrl(event.target.value)} placeholder="audio URL" style={{ background: 'var(--black)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 10px', outline: 'none' }} />
        {room.music_url && <audio ref={audioRef} src={room.music_url} controls style={{ width: '100%' }} />}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => saveMusic(false)} className="btn" style={{ padding: '8px 12px', fontSize: '9px' }}>SAVE</button>
          <button onClick={() => saveMusic(!room.music_is_playing)} className="btn btn-green" style={{ padding: '8px 12px', fontSize: '9px' }}>{room.music_is_playing ? 'PAUSE SYNC' : 'PLAY SYNC'}</button>
        </div>
      </div>
    </section>
  )
}
