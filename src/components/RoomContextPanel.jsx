import EntryCard from './EntryCard'

export default function RoomContextPanel({ room, session }) {
  return (
    <aside className="card" style={{ padding: '16px', height: 'fit-content' }}>
      <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--red)', letterSpacing: '0.12em', marginBottom: '12px' }}>ROOM CONTEXT</div>
      {room.agenda && (
        <section style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '6px' }}>AGENDA</h3>
          <p style={{ fontSize: '13px', color: 'var(--dim)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{room.agenda}</p>
        </section>
      )}
      {room.strategies && (
        <section style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '6px' }}>{room.strategies.name}</h3>
          <p style={{ fontSize: '13px', color: 'var(--dim)', lineHeight: 1.6 }}>{room.strategies.setup_conditions || room.strategies.entry_rules || 'Strategy linked.'}</p>
        </section>
      )}
      {room.entries ? (
        <div style={{ marginTop: '12px' }}>
          <EntryCard entry={room.entries} session={session} showActions={false} />
        </div>
      ) : !room.agenda && !room.strategies ? (
        <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)' }}>NO TRADE OR STRATEGY LINKED.</p>
      ) : null}
    </aside>
  )
}
