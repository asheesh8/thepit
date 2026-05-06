import ParticipantTile from './ParticipantTile'
import CallControls from './CallControls'
import { useMemo, useState } from 'react'

export default function LiveStage({ localStream, remoteStreams, mediaState, rtc }) {
  const [pinnedId, setPinnedId] = useState(null)
  const [audioPrefs, setAudioPrefs] = useState({})
  const [menu, setMenu] = useState(null)
  const tiles = useMemo(() => [
      { id: 'local', label: 'YOU', stream: localStream, muted: true, active: mediaState.camera },
      ...remoteStreams.map(remote => ({
        id: remote.peerId,
        label: `PEER ${remote.peerId.slice(0, 8)}`,
        stream: remote.stream,
        muted: false,
        active: true,
      })),
    ], [localStream, mediaState.camera, remoteStreams])
  const orderedTiles = useMemo(() => {
    if (!pinnedId) return tiles
    const pinned = tiles.find(tile => tile.id === pinnedId)
    if (!pinned) return tiles
    return [pinned, ...tiles.filter(tile => tile.id !== pinnedId)]
  }, [tiles, pinnedId])
  const hasMedia = orderedTiles.some(tile => tile.stream)
  const gridClass = orderedTiles.length <= 1 ? 'call-grid single' : orderedTiles.length === 2 ? 'call-grid two' : 'call-grid'

  const updateAudioPref = (tileId, patch) => {
    setAudioPrefs(prev => ({
      ...prev,
      [tileId]: { muted: false, volume: 1, ...prev[tileId], ...patch },
    }))
  }

  const openMenu = (event, tile) => {
    event.preventDefault()
    setMenu({ tile, x: event.clientX, y: event.clientY })
  }

  const closeMenu = () => setMenu(null)
  const currentPrefs = menu ? { muted: false, volume: 1, ...audioPrefs[menu.tile.id] } : null

  return (
    <section className="call-stage" onClick={closeMenu}>
      <div className="call-stage-topbar">
        <div>
          <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--green)', letterSpacing: '0.14em' }}>LIVE CALL</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.7rem', lineHeight: 1 }}>VOICE. CAMERA. SCREEN.</div>
        </div>
        <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)' }}>{tiles.length} TILE{tiles.length === 1 ? '' : 'S'}</div>
      </div>

      <div className={gridClass}>
        {hasMedia ? (
          orderedTiles.map((tile, index) => {
            const prefs = { muted: false, volume: 1, ...audioPrefs[tile.id] }
            const isLocal = tile.id === 'local'
            return (
            <ParticipantTile
              key={tile.id}
              label={tile.label}
              stream={tile.stream}
              muted={tile.muted || prefs.muted}
              volume={isLocal ? 0 : prefs.volume}
              mirror={!mediaState.sharing || tile.id !== 'local'}
              featured={orderedTiles.length <= 2 || (pinnedId && index === 0)}
              active={tile.active}
              pinned={tile.id === pinnedId}
              onContextMenu={event => openMenu(event, tile)}
            />
            )
          })
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
