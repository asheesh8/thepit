export default function CallControls({ mediaState, onJoin, onLeave, onMic, onCamera, onShare }) {
  return (
    <div className="call-dock">
      {!mediaState.joined ? (
        <button onClick={onJoin} className="btn btn-green" style={{ padding: '10px 16px', fontSize: '10px' }}>JOIN CALL</button>
      ) : (
        <>
          <button onClick={onMic} className={`btn ${mediaState.mic ? 'btn-green' : 'btn-red'}`} style={{ padding: '10px 14px', fontSize: '10px' }}>{mediaState.mic ? 'MIC ON' : 'MIC OFF'}</button>
          <button onClick={onCamera} className={`btn ${mediaState.camera ? 'btn-green' : 'btn-red'}`} style={{ padding: '10px 14px', fontSize: '10px' }}>{mediaState.camera ? 'CAM ON' : 'CAM OFF'}</button>
          <button onClick={onShare} className="btn btn-gold" style={{ padding: '10px 14px', fontSize: '10px' }}>{mediaState.sharing ? 'STOP SCREEN' : 'SHARE SCREEN'}</button>
          <button onClick={onLeave} className="btn btn-red" style={{ padding: '10px 14px', fontSize: '10px' }}>LEAVE CALL</button>
        </>
      )}
      {mediaState.error && <div style={{ width: '100%', textAlign: 'center', fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--red)' }}>{mediaState.error}</div>}
    </div>
  )
}
