import ParticipantTile from './ParticipantTile'

export default function LiveStage({ localStream, remoteStreams }) {
  const main = remoteStreams[0]

  return (
    <section className="card" style={{ padding: '14px', minHeight: '420px' }}>
      <div style={{ height: '360px', background: 'var(--black)', border: '1px solid var(--border)', marginBottom: '12px' }}>
        {main ? (
          <ParticipantTile label={`PEER ${main.peerId.slice(0, 8)}`} stream={main.stream} />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px' }}>
            <div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '3rem', color: 'var(--border)', lineHeight: 1 }}>ROOM STAGE</div>
              <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', marginTop: '8px' }}>JOIN MEDIA OR WAIT FOR A SCREEN SHARE.</p>
            </div>
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
        <ParticipantTile label="YOU" stream={localStream} muted isLocal />
        {remoteStreams.map(remote => (
          <ParticipantTile key={remote.peerId} label={`PEER ${remote.peerId.slice(0, 8)}`} stream={remote.stream} />
        ))}
      </div>
    </section>
  )
}
