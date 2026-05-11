import ParticipantTile from './ParticipantTile'
import CallControls from './CallControls'
import { useMemo, useState } from 'react'

export default function LiveStage({ localStream, localScreenStream, remoteStreams, mediaState, rtc }) {
  const [manualSpotlitId, setManualSpotlitId] = useState(null)
  const [audioPrefs, setAudioPrefs] = useState({})
  const [menu, setMenu] = useState(null)

  const tiles = useMemo(() => [
    {
      id: 'local',
      label: 'YOU',
      sublabel: 'CAMERA',
      stream: localStream,
      muted: true,
      active: mediaState.camera,
      type: 'camera',
      isLocal: true,
    },
    ...(localScreenStream ? [{
      id: 'local-screen',
      label: 'YOUR SCREEN',
      sublabel: 'SHARING',
      stream: localScreenStream,
      muted: true,
      active: true,
      type: 'screen',
      isLocal: true,
    }] : []),
    ...remoteStreams.map(remote => {
      const remoteCamCount = remoteStreams.filter(r => r.type !== 'screen').length
      return {
        id: `${remote.peerId}-${remote.stream.id}`,
        label: remote.type === 'screen'
          ? 'SCREEN SHARE'
          : remoteCamCount === 1
            ? 'CALL PARTNER'
            : `GUEST ${remote.peerId.slice(0, 4).toUpperCase()}`,
        sublabel: remote.type === 'screen' ? 'SCREEN' : 'REMOTE',
        stream: remote.stream,
        muted: false,
        active: true,
        type: remote.type || 'camera',
        isLocal: false,
      }
    }),
  ], [localScreenStream, localStream, mediaState.camera, remoteStreams])

  // Auto-spotlight priority: screen share → first remote camera → local (alone)
  const autoSpotlitId = useMemo(() => {
    const screen = tiles.find(t => t.type === 'screen')
    if (screen) return screen.id
    const remote = tiles.find(t => !t.isLocal)
    if (remote) return remote.id
    return tiles[0]?.id ?? null
  }, [tiles])

  // If manual override tile still exists, respect it; otherwise fall back to auto
  const spotlitId = (manualSpotlitId && tiles.some(t => t.id === manualSpotlitId))
    ? manualSpotlitId
    : autoSpotlitId

  const spotlit = tiles.find(t => t.id === spotlitId)
  const stripTiles = tiles.filter(t => t.id !== spotlitId)
  const isWaiting = !!localStream && remoteStreams.length === 0
  const hasStrip = stripTiles.length > 0

  const toggleSpotlight = (tileId) => {
    setManualSpotlitId(prev => {
      if (prev === tileId) return null          // click spotlit tile → clear manual override
      return tileId
    })
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

  return (
    <section className="call-stage" onClick={() => setMenu(null)}>
      {/* ── Top bar ── */}
      <div className="call-stage-topbar">
        <div>
          <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--green)', letterSpacing: '0.14em' }}>
            LIVE CALL
          </div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', lineHeight: 1 }}>
            {isWaiting ? 'WAITING FOR THEM.' : tiles.length === 2 ? 'ONE ON ONE.' : 'VOICE. CAMERA. SCREEN.'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {manualSpotlitId && (
            <button
              onClick={() => setManualSpotlitId(null)}
              style={{
                fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--dim)',
                background: 'none', border: '1px solid var(--border)',
                padding: '4px 8px', cursor: 'pointer', letterSpacing: '0.1em',
              }}
            >
              AUTO FOCUS
            </button>
          )}
          <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)' }}>
            {remoteStreams.length} CONNECTED
          </div>
        </div>
      </div>

      {/* ── Focus layout — always ── */}
      {tiles.length > 0 ? (
        <div className="call-focus-layout">
          {/* Main big tile */}
          <div className="call-focus-main">
            {spotlit ? (
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
            ) : (
              <div className="call-empty">
                <div style={{ fontFamily: 'Bebas Neue', fontSize: '3rem', color: 'var(--border)', lineHeight: 1 }}>ROOM STAGE</div>
                <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', marginTop: '8px' }}>JOIN CALL TO GO LIVE.</p>
              </div>
            )}
            {isWaiting && (
              <div className="call-waiting-overlay">
                <div className="call-waiting-pulse" />
                <div>
                  <h3>RINGING</h3>
                  <p>Keep this open — they'll see a call banner.</p>
                </div>
              </div>
            )}
          </div>

          {/* Strip — only when there are other tiles */}
          {hasStrip && (
            <div className="call-focus-strip">
              {stripTiles.map(tile => {
                const prefs = audioPrefs[tile.id] || {}
                return (
                  <div key={tile.id} className="call-strip-tile">
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
        <div className="call-empty">
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '3rem', color: 'var(--border)', lineHeight: 1 }}>ROOM STAGE</div>
          <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', marginTop: '8px' }}>JOIN CALL TO GO LIVE.</p>
        </div>
      )}

      {/* ── Context menu ── */}
      {menu && (
        <div className="call-context-menu" style={{ left: menu.x, top: menu.y }} onClick={e => e.stopPropagation()}>
          <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', letterSpacing: '0.1em', marginBottom: '8px' }}>
            {menu.tile.label}
          </div>
          <button onClick={() => { toggleSpotlight(menu.tile.id); setMenu(null) }} className="call-menu-item">
            {spotlitId === menu.tile.id ? 'CLEAR FOCUS' : 'FOCUS THIS TILE'}
          </button>
          {menu.tile.id !== 'local' && (
            <>
              <button
                onClick={() => updateAudioPref(menu.tile.id, { muted: !(audioPrefs[menu.tile.id]?.muted) })}
                className="call-menu-item"
              >
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
