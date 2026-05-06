/* eslint-disable react-hooks/immutability */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getRoomType } from '../lib/liveRooms'

function Avatar({ profile, size = 26 }) {
  const initial = (profile?.username || '?').slice(0, 1).toUpperCase()

  return (
    <div title={profile?.username ? `@${profile.username}` : 'active'} style={{
      width: size,
      height: size,
      borderRadius: '50%',
      border: '1px solid var(--border)',
      background: profile?.avatar_url ? `url(${profile.avatar_url}) center/cover` : 'var(--dark)',
      color: 'var(--text)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Space Mono',
      fontSize: '10px',
      marginLeft: '-6px',
      boxShadow: '0 0 0 2px var(--black)',
    }}>
      {!profile?.avatar_url && initial}
    </div>
  )
}

export default function RoomSidebarWidget() {
  const [rooms, setRooms] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    loadRooms()
    const interval = setInterval(loadRooms, 20000)
    return () => clearInterval(interval)
  }, [])

  const loadRooms = async () => {
    const { data, error: loadError } = await supabase
      .from('live_rooms')
      .select('id, title, room_type, status, room_password, created_at, profiles!live_rooms_host_id_profiles_fkey(username, avatar_url), live_room_presence(user_id, last_seen, profiles!live_room_presence_user_id_profiles_fkey(username, avatar_url))')
      .eq('status', 'live')
      .order('created_at', { ascending: false })
      .limit(8)

    if (loadError) {
      setError(loadError.message)
      return
    }
    setError('')
    const cutoff = Date.now() - 5 * 60 * 1000
    setRooms((data || []).map(room => ({
      ...room,
      active_presence: (room.live_room_presence || []).filter(row => new Date(row.last_seen).getTime() > cutoff),
    })))
  }

  if (error) return null

  return (
    <aside className="rooms-side-rail">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--red)', letterSpacing: '0.14em' }}>LIVE ROOMS</div>
        <Link to="/rooms" style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)' }}>VIEW</Link>
      </div>

      {rooms.length === 0 ? (
        <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', lineHeight: 1.5 }}>NO ROOMS LIVE.</div>
      ) : rooms.map(room => {
        const type = getRoomType(room.room_type)
        const people = room.active_presence || []
        return (
          <Link key={room.id} to={`/rooms/${room.id}`} style={{ display: 'block', padding: '12px 0', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.25rem', color: 'var(--text)', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {room.title}
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '5px' }}>
                  <span style={{ fontFamily: 'Space Mono', fontSize: '8px', color: type.color }}>{type.shortLabel}</span>
                  {room.room_password && <span style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--gold)' }}>LOCKED</span>}
                </div>
              </div>
              <div style={{ minWidth: '42px', height: '18px', borderRadius: '12px', border: '1px solid var(--green)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Space Mono', fontSize: '8px' }}>
                LIVE
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px', paddingLeft: '6px' }}>
              {people.length > 0 ? people.slice(0, 5).map(person => (
                <Avatar key={person.user_id} profile={person.profiles} />
              )) : <Avatar profile={room.profiles} />}
              <span style={{ marginLeft: '8px', fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--dim)' }}>
                {people.length > 0 ? `${people.length} ACTIVE` : 'HOST'}
              </span>
            </div>
          </Link>
        )
      })}
    </aside>
  )
}
