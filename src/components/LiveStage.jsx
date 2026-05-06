import ParticipantTile from './ParticipantTile'
import CallControls from './CallControls'

export default function LiveStage({ localStream, remoteStreams, mediaState, rtc }) {
  const tiles = [
    { id: 'local', label: 'YOU', stream: localStream, muted: true, active: mediaState.camera },
    ...remoteStreams.map(remote => ({
      id: remote.peerId,
      label: `PEER ${remote.peerId.slice(0, 8)}`,
      stream: remote.stream,
      muted: false,
      active: true,
    })),
  ]
  const hasMedia = tiles.some(tile => tile.stream)
  const gridClass = tiles.length <= 1 ? 'call-grid single' : tiles.length === 2 ? 'call-grid two' : 'call-grid'

  return (
    <section className="call-stage">
      <div className="call-stage-topbar">
        <div>
          <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--green)', letterSpacing: '0.14em' }}>LIVE CALL</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.7rem', lineHeight: 1 }}>VOICE. CAMERA. SCREEN.</div>
        </div>
        <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)' }}>{tiles.length} TILE{tiles.length === 1 ? '' : 'S'}</div>
      </div>

      <div className={gridClass}>
        {hasMedia ? (
          tiles.map(tile => (
            <ParticipantTile
              key={tile.id}
              label={tile.label}
              stream={tile.stream}
              muted={tile.muted}
              mirror={!mediaState.sharing || tile.id !== 'local'}
              featured={tiles.length <= 2}
              active={tile.active}
            />
          ))
        ) : (
          <div className="call-empty">
            <div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '3rem', color: 'var(--border)', lineHeight: 1 }}>ROOM STAGE</div>
              <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', marginTop: '8px' }}>JOIN MEDIA OR WAIT FOR THE CREW.</p>
            </div>
          </div>
        )}
      </div>

      <CallControls
        mediaState={mediaState}
        onJoin={rtc.joinMedia}
        onLeave={rtc.leaveMedia}
        onMic={rtc.toggleMic}
        onCamera={rtc.toggleCamera}
        onShare={rtc.shareScreen}
      />
    </section>
  )
}
