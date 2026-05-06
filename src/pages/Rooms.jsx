/* eslint-disable react-hooks/immutability */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import RoomCard from '../components/RoomCard'
import RoomCreateForm from '../components/RoomCreateForm'

export default function Rooms({ session }) {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadRooms()
  }, [])

  const loadRooms = async () => {
    setLoading(true)
    setError('')
    const { data, error: loadError } = await supabase
      .from('live_rooms')
      .select('*, profiles!live_rooms_host_id_profiles_fkey(username, avatar_url), live_room_presence(user_id, last_seen, profiles!live_room_presence_user_id_profiles_fkey(username, avatar_url))')
      .order('created_at', { ascending: false })
      .limit(40)
    if (loadError) setError(loadError.message)
    const cutoff = Date.now() - 5 * 60 * 1000
    setRooms((data || []).map(room => ({
      ...room,
      active_presence: (room.live_room_presence || []).filter(row => new Date(row.last_seen).getTime() > cutoff),
    })))
    setLoading(false)
  }

  const createRoom = async (payload) => {
    const { data, error: insertError } = await supabase
      .from('live_rooms')
      .insert({ ...payload, room_password: payload.room_password?.trim() || '', is_public: true, host_id: session.user.id, status: 'live' })
      .select('id')
      .single()
    if (insertError) return { error: insertError.message }
    if (data) navigate(`/rooms/${data.id}`)
    return { data }
  }

  return (
    <div style={{ paddingTop: '56px', minHeight: '100vh' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '3rem', lineHeight: 1, marginBottom: '4px' }}>LIVE ROOMS</h1>
            <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.1em' }}>
              CALL. SHARE SCREENS. REVIEW THE WORK.
            </p>
          </div>
          <button onClick={() => setShowCreate(prev => !prev)} className="btn btn-red" style={{ padding: '10px 18px', fontSize: '11px' }}>
            {showCreate ? 'CLOSE' : '+ ROOM'}
          </button>
        </div>

        {showCreate && <RoomCreateForm session={session} onCreate={createRoom} />}
        {error && <div className="card" style={{ padding: '14px', marginBottom: '18px', color: 'var(--gold)', fontFamily: 'Space Mono', fontSize: '10px' }}>{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--dim)' }}>LOADING ROOMS...</div>
        ) : rooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '2.5rem', color: 'var(--border)', marginBottom: '10px' }}>NO ROOMS LIVE</div>
            <button onClick={() => setShowCreate(true)} className="btn btn-red">START THE FIRST ROOM</button>
          </div>
        ) : rooms.map(room => <RoomCard key={room.id} room={room} />)}
      </div>
    </div>
  )
}
