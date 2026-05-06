import { Link } from 'react-router-dom'
import { formatRoomTime, getRoomType } from '../lib/liveRooms'

export default function RoomCard({ room }) {
  const type = getRoomType(room.room_type)

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
          <span className="tag" style={{ color: room.status === 'live' ? 'var(--green)' : 'var(--dim)' }}>{room.status}</span>
        </div>
      </div>
      {room.agenda && <p style={{ fontSize: '13px', color: 'var(--dim)', lineHeight: 1.6 }}>{room.agenda}</p>}
    </Link>
  )
}
