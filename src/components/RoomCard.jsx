import { Link } from 'react-router-dom'
import { formatRoomTime, getRoomType } from '../lib/liveRooms'

export default function RoomCard({ room }) {
  const type = getRoomType(room.room_type)
  const activePeople = (room.active_presence || room.live_room_presence || []).slice(0, 5)

  return (
    <Link to={`/rooms/${room.id}`} className="card fade-in" style={{ display: 'block', padding: '20px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <h2 style={{ fontSize: '2rem', lineHeight: 1 }}>{room.title}</h2>
          <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.08em', marginTop: '5px' }}>
            HOST @{room.profiles?.username || 'unknown'} / {formatRoomTime(room.created_at)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span className="tag" style={{ color: type.color }}>{type.shortLabel}</span>
          {room.room_password && <span className="tag" style={{ color: 'var(--gold)' }}>LOCKED</span>}
          <span className="tag" style={{ color: room.status === 'live' ? 'var(--green)' : 'var(--dim)' }}>{room.status}</span>
        </div>
      </div>
      {room.agenda && <p style={{ fontSize: '13px', color: 'var(--dim)', lineHeight: 1.6 }}>{room.agenda}</p>}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px' }}>
        <div style={{ display: 'flex', paddingLeft: '6px' }}>
          {(activePeople.length ? activePeople : [{ user_id: 'host', profiles: room.profiles }]).map(person => (
            <div key={person.user_id} title={person.profiles?.username ? `@${person.profiles.username}` : 'active'} style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              marginLeft: '-6px',
              border: '1px solid var(--border)',
              background: person.profiles?.avatar_url ? `url(${person.profiles.avatar_url}) center/cover` : 'var(--dark)',
              boxShadow: '0 0 0 2px var(--card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Space Mono',
              fontSize: '10px',
              color: 'var(--text)',
            }}>
              {!person.profiles?.avatar_url && (person.profiles?.username || '?').slice(0, 1).toUpperCase()}
            </div>
          ))}
        </div>
        <span style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)' }}>
          {activePeople.length ? `${activePeople.length} ACTIVE` : 'HOST READY'}
        </span>
      </div>
    </Link>
  )
}
