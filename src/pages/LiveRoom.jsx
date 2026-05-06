/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getRoomType } from '../lib/liveRooms'
import useRoomRealtime from '../hooks/useRoomRealtime'
import useWebRTCRoom from '../hooks/useWebRTCRoom'
import LiveStage from '../components/LiveStage'
import CallControls from '../components/CallControls'
import RoomContextPanel from '../components/RoomContextPanel'
import RoomChat from '../components/RoomChat'
import RoomNotes from '../components/RoomNotes'
import RoomActionItems from '../components/RoomActionItems'
import MusicDeck from '../components/MusicDeck'

export default function LiveRoom({ session }) {
  const { id } = useParams()
  const [room, setRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [actions, setActions] = useState([])
  const [activeTool, setActiveTool] = useState('chat')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [pendingSignals, setPendingSignals] = useState([])
  const { participants, connected, sendSignal, broadcastRefresh } = useRoomRealtime({
    roomId: id,
    userId: session.user.id,
    onSignal: signal => setPendingSignals(prev => [...prev, signal]),
    onRefresh: () => loadRoom(),
  })
  const rtc = useWebRTCRoom({ userId: session.user.id, participants, sendSignal })
  const type = getRoomType(room?.room_type)
  const isHost = room?.host_id === session.user.id
  const tools = [
    { key: 'chat', label: 'CHAT' },
    { key: 'notes', label: 'NOTES' },
    { key: 'actions', label: 'ACTIONS' },
    { key: 'music', label: 'MUSIC' },
  ]

  useEffect(() => {
    loadRoom()
  }, [id])

  useEffect(() => {
    if (pendingSignals.length === 0) return
    const [next, ...rest] = pendingSignals
    setPendingSignals(rest)
    rtc.handleSignal(next)
  }, [pendingSignals, rtc])

  const loadRoom = async () => {
    setLoading(true)
    setError('')
    const [{ data: roomData, error: roomError }, { data: messageData }, { data: actionData }] = await Promise.all([
      supabase
        .from('live_rooms')
        .select('*, profiles(username), entries(*, profiles(username), strategies(name)), strategies(*)')
        .eq('id', id)
        .single(),
      supabase
        .from('live_room_messages')
        .select('*, profiles(username)')
        .eq('room_id', id)
        .order('created_at', { ascending: true }),
      supabase
        .from('live_room_action_items')
        .select('*, profiles(username)')
        .eq('room_id', id)
        .order('created_at', { ascending: true }),
    ])
    if (roomError) setError(roomError.message)
    setRoom(roomData)
    setMessages(messageData || [])
    setActions(actionData || [])
    setLoading(false)
  }

  const copyInvite = async () => {
    await navigator.clipboard.writeText(window.location.href)
  }

  const completeRoom = async () => {
    const { data } = await supabase.from('live_rooms').update({ status: 'complete', updated_at: new Date().toISOString() }).eq('id', id).select('*, profiles(username), entries(*, profiles(username), strategies(name)), strategies(*)').single()
    if (data) {
      setRoom(data)
      broadcastRefresh({ kind: 'room' })
    }
  }

  if (loading) return <div style={{ paddingTop: '100px', textAlign: 'center', fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--dim)' }}>LOADING ROOM...</div>
  if (error || !room) return <div style={{ paddingTop: '100px', textAlign: 'center', fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--red)' }}>{error || 'ROOM NOT FOUND'}</div>

  return (
    <div style={{ paddingTop: '56px', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div>
            <Link to="/rooms" style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.1em' }}>BACK TO ROOMS</Link>
            <h1 style={{ fontSize: '3rem', lineHeight: 1, marginTop: '8px' }}>{room.title}</h1>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
              <span className="tag" style={{ color: type.color }}>{type.label}</span>
              <span className="tag" style={{ color: room.status === 'live' ? 'var(--green)' : 'var(--dim)' }}>{room.status}</span>
              <span className="tag" style={{ color: connected ? 'var(--green)' : 'var(--red)' }}>{connected ? 'REALTIME' : 'CONNECTING'}</span>
              <span className="tag" style={{ color: 'var(--dim)' }}>{participants.length} PRESENT</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button onClick={copyInvite} className="btn" style={{ padding: '9px 12px', fontSize: '10px' }}>COPY INVITE</button>
            {isHost && room.status === 'live' && <button onClick={completeRoom} className="btn btn-green" style={{ padding: '9px 12px', fontSize: '10px' }}>MARK COMPLETE</button>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: '16px', alignItems: 'start' }}>
          <main style={{ display: 'grid', gap: '14px' }}>
            <LiveStage localStream={rtc.localStream} remoteStreams={rtc.remoteStreams} />
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--dark)',
                position: 'sticky',
                top: '56px',
                zIndex: 5,
              }}>
                {tools.map(tool => (
                  <button
                    key={tool.key}
                    onClick={() => setActiveTool(tool.key)}
                    style={{
                      flex: 1,
                      padding: '12px 10px',
                      background: activeTool === tool.key ? 'var(--card)' : 'transparent',
                      border: 'none',
                      borderBottom: activeTool === tool.key ? '1px solid var(--red)' : '1px solid transparent',
                      color: activeTool === tool.key ? 'var(--text)' : 'var(--dim)',
                      fontFamily: 'Space Mono',
                      fontSize: '10px',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {tool.label}
                  </button>
                ))}
              </div>
              <div style={{ padding: '16px', minHeight: '280px' }}>
                {activeTool === 'chat' && (
                  <RoomChat embedded roomId={room.id} session={session} messages={messages} onRefresh={payload => { broadcastRefresh(payload); loadRoom() }} />
                )}
                {activeTool === 'notes' && (
                  <RoomNotes embedded room={room} canEdit onSaved={payload => { setRoom(payload.room); broadcastRefresh(payload) }} />
                )}
                {activeTool === 'actions' && (
                  <RoomActionItems embedded roomId={room.id} session={session} items={actions} onRefresh={payload => { broadcastRefresh(payload); loadRoom() }} />
                )}
                {activeTool === 'music' && (
                  <MusicDeck embedded room={room} onSaved={payload => { setRoom(payload.room); broadcastRefresh(payload) }} />
                )}
              </div>
            </div>
            <CallControls
              mediaState={rtc.mediaState}
              onJoin={rtc.joinMedia}
              onLeave={rtc.leaveMedia}
              onMic={rtc.toggleMic}
              onCamera={rtc.toggleCamera}
              onShare={rtc.shareScreen}
            />
          </main>
          <RoomContextPanel room={room} session={session} />
        </div>
      </div>
    </div>
  )
}
