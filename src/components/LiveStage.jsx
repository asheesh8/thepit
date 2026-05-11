import ParticipantTile from './ParticipantTile'
import CallControls from './CallControls'
import { useMemo, useState } from 'react'

export default function LiveStage({ localStream, localScreenStream, remoteStreams, mediaState, rtc }) {
  const [spotlitId, setSpotlitId] = useState(null)
  const [audioPrefs, setAudioPrefs] = useState({})
  const [menu, setMenu] = useState(null)

  const tiles = useMemo(() => [
    { id: 'local', label: 'YOU', sublabel: 'CAMERA', stream: localStream, muted: true, active: mediaState.camera, type: 'camera' },
    ...(localScreenStream ? [{ id: 'local-screen', label: 'YOUR SCREEN', sublabel: 'SHARING', stream: localScreenStream, muted: true, active: true, type: 'screen' }] : []),
    ...remoteStreams.map(remote => ({
      id: `${remote.peerId}-${remote.stream.id}`,
      label: remote.type === 'screen' ? 'SCREEN SHARE' : (remoteStreams.filter(r => r.type !== 'screen').length === 1 ? 'CALL PARTNER' : `GUEST ${remote.peerId.slice(0, 4).toUpperCase()}`),
      sublabel: remote.type === 'screen' ? 'SCREEN' : 'REMOTE',
      stream: remote.stream,
      muted: false,
      active: true,
      type: remote.type || 'camera',
    })),
  ], [localScreenStream, localStream, mediaState.camera, remoteStreams])

  const isWaiting = !!localStream && remoteStreams.length === 0
  const spotlit = tiles.find(t => t.id === spotlitId)
  const others = tiles.filter(t => t.id !== spotlitId)
  const hasSpotlight = !!spotlit && tiles.length > 1

  // Auto-spotlight screen share when it appears
  useMemo(() => {
    const screenTile = tiles.find(t => t.type === 'screen')
    if (screenTile && !spotlitId) setSpotlitId(screenTile.id)
    if (!screenTile && spotlitId) {
      const stillExists = tiles.find(t => t.id === spotlitId)
      if (!stillExists) setSpotlitId(null)
    }
  }, [tiles.map(t => t.id).join(',')])

  const toggleSpotlight = (tileId) => {
    setSpotlitId(prev => prev === tileId ? null : tileId)
  }

  const updateAudioPref = (tileId, patch) => {
    setAudioPrefs(prev => ({ ...prev, [tileId]: { muted: false, volume: 1, ...prev[tileId], ...patch } }))
  }

  const openMenu = (event, tile) => {
    event.preventDefault()
    event.stopPropagation()
    setMenu({
      tile,
      x: Math.min(event.clientX, window.innerWidth - 230),
      y: Math.min(event.clientY, window.innerHeight - 200),
    })
  }

  const gridClass = hasSpotlight
    ? 'call-grid call-grid-spotlight'
    : isWaiting
      ? 'call-grid solo-live'
      : tiles.length <= 1
        ? 'call-grid single'
        : tiles.length === 2
          ? 'call-grid two'
          : 'call-grid group'

  return (
    <section className="call-stage" onClick={() => setMenu(null)}>
      <div className="call-stage-topbar">
        <div>
          <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--green)', letterSpacing: '0.14em' }}>LIVE CALL</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', lineHeight: 1 }}>
            {isWaiting ? 'WAITING FOR THEM.' : tiles.length === 2 ? 'ONE ON ONE.' : 'VOICE. CAMERA. SCREEN.'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {hasSpotlight && (
            <button
              onClick={() => setSpotlitId(null)}
              style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--dim)', background: 'none', border: '1px solid var(--border)', padding: '4px 8px', cursor: 'pointer', letterSpacing: '0.1em' }}
            >
              EXIT FOCUS
            </button>
          )}
          <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)' }}>
            {remoteStreams.length} CONNECTED
          </div>
        </div>
      </div>

      {/* ── Spotlight layout ── */}
      {hasSpotlight ? (
        <div className="call-spotlight-layout">
          <div className="call-spotlight-main">
            <ParticipantTile
              key={spotlit.id}
              label={spotlit.label}
              sublabel={spotlit.sublabel}
              stream={spotlit.stream}
              muted={spotlit.muted || (audioPrefs[spotlit.id]?.muted ?? false)}
              volume={spotlit.id === 'local' ? 0 : (audioPrefs[spotlit.id]?.volume ?? 1)}
              mirror={spotlit.type !== 'screen'}
              active={spotlit.active}
              spotlit
              onSpotlight={() => toggleSpotlight(spotlit.id)}
              onContextMenu={e => openMenu(e, spotlit)}
            />
          </div>
          {others.length > 0 && (
            <div className="call-thumbnail-strip">
              {others.map(tile => {
                const prefs = audioPrefs[tile.id] || {}
                return (
                  <div key={tile.id} className="call-thumbnail">
                    <ParticipantTile
                      label={tile.label}
                      sublabel={tile.sublabel}
                      stream={tile.stream}
                      muted={tile.muted || (prefs.muted ?? false)}
                      volume={tile.id === 'local' ? 0 : (prefs.volume ?? 1)}
                      mirror={tile.type !== 'screen'}
                      active={tile.active}
                      onSpotlight={() => toggleSpotlight(tile.id)}
                      onContextMenu={e => openMenu(e, tile)}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        /* ── Normal grid layout ── */
        <div className={gridClass}>
          {tiles.length > 0 ? (
            <>
              {tiles.map(tile => {
                const prefs = audioPrefs[tile.id] || {}
                return (
                  <ParticipantTile
                    key={tile.id}
                    label={tile.label}
                    sublabel={tile.sublabel}
                    stream={tile.stream}
                    muted={tile.muted || (prefs.muted ?? false)}
                    volume={tile.id === 'local' ? 0 : (prefs.volume ?? 1)}
                    mirror={tile.type !== 'screen'}
                    active={tile.active}
                    onSpotlight={() => toggleSpotlight(tile.id)}
                    onContextMenu={e => openMenu(e, tile)}
                  />
                )
              })}
              {isWaiting && (
                <div className="call-waiting-panel">
                  <div className="call-waiting-pulse" />
                  <div>
                    <h3>RINGING</h3>
                    <p>Keep this open — they'll see a call banner.</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="call-empty">
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '3rem', color: 'var(--border)', lineHeight: 1 }}>ROOM STAGE</div>
              <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', marginTop: '8px' }}>JOIN CALL TO GO LIVE.</p>
            </div>
          )}
        </div>
      )}

      {/* Context menu */}
      {menu && (
        <div className="call-context-menu" style={{ left: menu.x, top: menu.y }} onClick={e => e.stopPropagation()}>
          <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', letterSpacing: '0.1em', marginBottom: '8px' }}>
            {menu.tile.label}
          </div>
          <button onClick={() => { toggleSpotlight(menu.tile.id); setMenu(null) }} className="call-menu-item">
            {spotlitId === menu.tile.id ? 'EXIT FOCUS' : 'FOCUS THIS TILE'}
          </button>
          {menu.tile.id !== 'local' && (
            <>
              <button onClick={() => updateAudioPref(menu.tile.id, { muted: !(audioPrefs[menu.tile.id]?.muted) })} className="call-menu-item">
                {audioPrefs[menu.tile.id]?.muted ? 'UNMUTE FOR ME' : 'MUTE FOR ME'}
              </button>
              <label className="call-volume-control">
                <span>VOLUME {Math.round((audioPrefs[menu.tile.id]?.volume ?? 1) * 100)}%</span>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={audioPrefs[menu.tile.id]?.volume ?? 1}
                  onChange={e => updateAudioPref(menu.tile.id, { volume: Number(e.target.value), muted: false })}
                />
              </label>
            </>
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
