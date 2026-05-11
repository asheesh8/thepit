import ParticipantTile from './ParticipantTile'
import CallControls from './CallControls'
import { useMemo, useState } from 'react'

export default function LiveStage({ localStream, localScreenStream, remoteStreams, mediaState, rtc }) {
  const [pinnedId, setPinnedId] = useState(null)
  const [audioPrefs, setAudioPrefs] = useState({})
  const [menu, setMenu] = useState(null)
  const tiles = useMemo(() => [
      { id: 'local', label: 'YOU', sublabel: 'CAMERA', stream: localStream, muted: true, active: mediaState.camera, type: 'camera' },
      ...(localScreenStream ? [{ id: 'local-screen', label: 'YOUR SCREEN', sublabel: 'SHARING', stream: localScreenStream, muted: true, active: true, type: 'screen' }] : []),
      ...remoteStreams.map(remote => ({
        id: `${remote.peerId}-${remote.stream.id}`,
        label: remote.type === 'screen'
          ? 'THEIR SCREEN'
          : remoteStreams.length === 1 ? 'CALL PARTNER' : `GUEST ${remote.peerId.slice(0, 4).toUpperCase()}`,
        sublabel: remote.type === 'screen' ? 'SCREEN' : 'REMOTE',
        stream: remote.stream,
        muted: false,
        active: true,
        type: remote.type || 'camera',
      })),
    ], [localScreenStream, localStream, mediaState.camera, remoteStreams])
  const orderedTiles = useMemo(() => {
    if (!pinnedId) return tiles
    const pinned = tiles.find(tile => tile.id === pinnedId)
    if (!pinned) return tiles
    return [pinned, ...tiles.filter(tile => tile.id !== pinnedId)]
  }, [tiles, pinnedId])
  const hasMedia = orderedTiles.some(tile => tile.stream)
  const isWaiting = !!localStream && remoteStreams.length === 0
  const gridClass = isWaiting
    ? 'call-grid solo-live'
    : orderedTiles.length <= 1
      ? 'call-grid single'
      : orderedTiles.length === 2
        ? 'call-grid two'
        : 'call-grid group'

  const updateAudioPref = (tileId, patch) => {
    setAudioPrefs(prev => ({
      ...prev,
      [tileId]: { muted: false, volume: 1, ...prev[tileId], ...patch },
    }))
  }

  const openMenu = (event, tile) => {
    event.preventDefault()
    const menuWidth = 220
    const menuHeight = tile.id === 'local' ? 120 : 190
    setMenu({
      tile,
      x: Math.min(event.clientX, window.innerWidth - menuWidth - 12),
      y: Math.min(event.clientY, window.innerHeight - menuHeight - 12),
    })
  }

  const closeMenu = () => setMenu(null)
  const currentPrefs = menu ? { muted: false, volume: 1, ...audioPrefs[menu.tile.id] } : null

  return (
    <section className="call-stage" onClick={closeMenu}>
      <div className="call-stage-topbar">
        <div>
          <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--green)', letterSpacing: '0.14em' }}>LIVE CALL</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.7rem', lineHeight: 1 }}>
            {isWaiting ? 'WAITING FOR THEM.' : orderedTiles.length === 2 ? 'ONE ON ONE.' : 'VOICE. CAMERA. SCREEN.'}
          </div>
        </div>
        <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)' }}>
          {remoteStreams.length} CONNECTED
        </div>
      </div>

      <div className={gridClass}>
        {hasMedia ? (
          <>
          {orderedTiles.map((tile, index) => {
            const prefs = { muted: false, volume: 1, ...audioPrefs[tile.id] }
            const isLocal = tile.id === 'local' || tile.id === 'local-screen'
            const isFeatured = (!!pinnedId && index === 0) || isWaiting
            return (
            <ParticipantTile
              key={tile.id}
              label={tile.label}
              sublabel={tile.sublabel}
              stream={tile.stream}
              muted={tile.muted || prefs.muted}
              volume={isLocal ? 0 : prefs.volume}
              mirror={tile.type !== 'screen'}
              featured={isFeatured}
              active={tile.active}
              pinned={tile.id === pinnedId}
              onContextMenu={event => openMenu(event, tile)}
            />
            )
          })}
          {isWaiting && (
            <div className="call-waiting-panel">
              <div className="call-waiting-pulse" />
              <div>
                <h3>RINGING</h3>
                <p>They will see an incoming call banner and phone notification. Keep this open.</p>
              </div>
            </div>
          )}
          </>
        ) : (
          <div className="call-empty">
            <div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '3rem', color: 'var(--border)', lineHeight: 1 }}>ROOM STAGE</div>
              <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', marginTop: '8px' }}>JOIN MEDIA OR WAIT FOR THE CREW.</p>
            </div>
          </div>
        )}
      </div>

      {menu && currentPrefs && (
        <div className="call-context-menu" style={{ left: menu.x, top: menu.y }} onClick={event => event.stopPropagation()}>
          <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', letterSpacing: '0.1em', marginBottom: '8px' }}>
            {menu.tile.label}
          </div>
          <button
            onClick={() => {
              setPinnedId(prev => prev === menu.tile.id ? null : menu.tile.id)
              closeMenu()
            }}
            className="call-menu-item"
          >
            {pinnedId === menu.tile.id ? 'UNPIN TILE' : 'PIN TILE'}
          </button>
          {menu.tile.id !== 'local' && (
            <>
              <button
                onClick={() => updateAudioPref(menu.tile.id, { muted: !currentPrefs.muted })}
                className="call-menu-item"
              >
                {currentPrefs.muted ? 'UNMUTE FOR ME' : 'MUTE FOR ME'}
              </button>
              <label className="call-volume-control">
                <span>VOLUME {Math.round(currentPrefs.volume * 100)}%</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={currentPrefs.volume}
                  onChange={event => updateAudioPref(menu.tile.id, { volume: Number(event.target.value), muted: false })}
                />
              </label>
            </>
          )}
          {menu.tile.id === 'local' && (
            <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', lineHeight: 1.5 }}>
              LOCAL AUDIO IS CONTROLLED BY MIC.
            </div>
          )}
        </div>
      )}

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
