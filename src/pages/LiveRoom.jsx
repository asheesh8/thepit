/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getRoomType } from '../lib/liveRooms'
import useRoomRealtime from '../hooks/useRoomRealtime'
import useWebRTCRoom from '../hooks/useWebRTCRoom'
import LiveStage from '../components/LiveStage'
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
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [roomUnlocked, setRoomUnlocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dmThreads, setDmThreads] = useState([])

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
  const isDm = room?.room_type === 'dm'
  const dmPeer = isDm ? (room.host_id === session.user.id ? room.dm_peer : room.profiles) : null
  const isDmMember = isDm && (room.host_id === session.user.id || room.dm_peer_id === session.user.id)
  const needsPassword = !isDm && !!room?.room_password && !isHost && !roomUnlocked
  const tools = [
    { key: 'chat', label: 'CHAT' },
    { key: 'notes', label: 'NOTES' },
    { key: 'actions', label: 'ACTIONS' },
    { key: 'music', label: 'MUSIC' },
  ]

  useEffect(() => {
    loadRoom()
    loadDmThreads()
  }, [id])

  useEffect(() => {
    if (!room) return
    const stored = sessionStorage.getItem(`room-unlocked:${room.id}`) === 'true'
    setRoomUnlocked(!room.room_password || room.host_id === session.user.id || stored)
  }, [room?.id, room?.room_password, room?.host_id, session.user.id])

  useEffect(() => {
    if (!room || needsPassword) return

    const markPresence = async () => {
      await supabase.from('live_room_presence').upsert({
        room_id: room.id,
        user_id: session.user.id,
        last_seen: new Date().toISOString(),
      })
    }

    markPresence()
    const interval = setInterval(markPresence, 30000)

    return () => {
      clearInterval(interval)
      supabase.from('live_room_presence').delete().eq('room_id', room.id).eq('user_id', session.user.id)
    }
  }, [room?.id, needsPassword, session.user.id])

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
        .select('*, profiles!live_rooms_host_id_profiles_fkey(id, username, avatar_url, bio), dm_peer:profiles!live_rooms_dm_peer_id_profiles_fkey(id, username, avatar_url, bio), entries(*, profiles(username), strategies(name)), strategies(*)')
        .eq('id', id)
        .single(),
      supabase
        .from('live_room_messages')
        .select('*, profiles(username, avatar_url)')
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

  const loadDmThreads = async () => {
    const { data } = await supabase
      .from('live_rooms')
      .select('id, title, host_id, dm_peer_id, updated_at, profiles!live_rooms_host_id_profiles_fkey(id, username, avatar_url), dm_peer:profiles!live_rooms_dm_peer_id_profiles_fkey(id, username, avatar_url)')
      .eq('room_type', 'dm')
      .or(`host_id.eq.${session.user.id},dm_peer_id.eq.${session.user.id}`)
      .order('updated_at', { ascending: false })
      .limit(20)

    setDmThreads((data || []).map(thread => ({
      ...thread,
      other: thread.host_id === session.user.id ? thread.dm_peer : thread.profiles,
    })))
  }

  const copyInvite = async () => {
    await navigator.clipboard.writeText(window.location.href)
  }

  const completeRoom = async () => {
    const { data } = await supabase.from('live_rooms').update({ status: 'complete', updated_at: new Date().toISOString() }).eq('id', id).select('*, profiles!live_rooms_host_id_profiles_fkey(username, avatar_url), entries(*, profiles(username), strategies(name)), strategies(*)').single()
    if (data) {
      setRoom(data)
      broadcastRefresh({ kind: 'room' })
    }
  }

  const unlockRoom = (event) => {
    event.preventDefault()
    if (passwordInput === room.room_password) {
      sessionStorage.setItem(`room-unlocked:${room.id}`, 'true')
      setRoomUnlocked(true)
      setPasswordError('')
      return
    }
    setPasswordError('Wrong room password.')
  }

  if (loading) return <div style={{ paddingTop: '100px', textAlign: 'center', fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--dim)' }}>LOADING ROOM...</div>
  if (error || !room) return <div style={{ paddingTop: '100px', textAlign: 'center', fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--red)' }}>{error || 'ROOM NOT FOUND'}</div>
  if (isDm && !isDmMember) return <div style={{ paddingTop: '100px', textAlign: 'center', fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--red)' }}>DM NOT AVAILABLE</div>

  if (needsPassword) {
    return (
      <div style={{ paddingTop: 'calc(56px + env(safe-area-inset-top, 0px))', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px' }}>
        <form onSubmit={unlockRoom} className="card" style={{ width: '100%', maxWidth: '420px', padding: '24px' }}>
          <h1 style={{ fontSize: '2.7rem', lineHeight: 1, marginBottom: '8px' }}>ROOM LOCKED</h1>
          <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.1em', marginBottom: '18px' }}>
            ENTER THE ROOM PASSWORD TO JOIN.
          </p>
          <input
            value={passwordInput}
            onChange={event => setPasswordInput(event.target.value)}
            type="password"
            autoFocus
            placeholder="room password"
            style={{ width: '100%', background: 'var(--black)', border: '1px solid var(--border)', color: 'var(--text)', padding: '12px 14px', outline: 'none', marginBottom: '12px' }}
          />
          {passwordError && <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--red)', marginBottom: '12px' }}>{passwordError}</div>}
          <button type="submit" className="btn btn-red" style={{ width: '100%', justifyContent: 'center' }}>JOIN ROOM</button>
        </form>
      </div>
    )
  }

  if (isDm) {
    return (
      <div className="dm-thread-shell">
        <aside className="dm-thread-sidebar">
          <Link to="/rooms" className="dm-back-link">BACK TO DMS</Link>
          <div className="dm-sidebar-title">DIRECTS</div>
          <div className="dm-thread-list">
            {dmThreads.length === 0 ? (
              <div className="dm-muted">NO DMS YET.</div>
            ) : dmThreads.map(thread => (
              <Link key={thread.id} to={`/rooms/${thread.id}`} className={`dm-thread-link ${thread.id === room.id ? 'active' : ''}`}>
                <div className="dm-thread-avatar" style={{ background: thread.other?.avatar_url ? `url(${thread.other.avatar_url}) center/cover` : 'var(--black)' }}>
                  {!thread.other?.avatar_url && thread.other?.username?.slice(0, 1).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="dm-thread-name">@{thread.other?.username || 'trader'}</div>
                  <div className="dm-thread-sub">MUTUAL FOLLOW</div>
                </div>
              </Link>
            ))}
          </div>
        </aside>

        <main className="dm-chat-panel">
          <header className="dm-chat-header">
            <div className="dm-chat-identity">
              <div className="dm-chat-avatar" style={{ background: dmPeer?.avatar_url ? `url(${dmPeer.avatar_url}) center/cover` : 'var(--black)' }}>
                {!dmPeer?.avatar_url && dmPeer?.username?.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <h1>@{dmPeer?.username || 'trader'}</h1>
                <div className="dm-chat-status">
                  <span>{connected ? 'REALTIME' : 'CONNECTING'}</span>
                  <span>{participants.length} PRESENT</span>
                  <span>MUTUAL FOLLOW</span>
                </div>
              </div>
            </div>
            <div className="dm-chat-actions">
              <button className="btn btn-green" onClick={() => rtc.joinMedia()} style={{ padding: '9px 12px', fontSize: '9px' }}>CALL</button>
              <button className="btn" onClick={() => (rtc.mediaState.joined ? rtc.shareScreen() : rtc.joinMedia())} style={{ padding: '9px 12px', fontSize: '9px' }}>SCREEN</button>
            </div>
          </header>
          <div className="dm-chat-body">
            <RoomChat
              embedded
              fullHeight
              title={null}
              roomId={room.id}
              session={session}
              messages={messages}
              onRefresh={payload => { broadcastRefresh(payload); loadRoom(); loadDmThreads() }}
            />
          </div>
        </main>

        <aside className="dm-tools-panel">
          <section className="dm-tool-card dm-call-card">
            <div className="dm-tool-eyebrow">LIVE CALL</div>
            <LiveStage localStream={rtc.localStream} remoteStreams={rtc.remoteStreams} mediaState={rtc.mediaState} rtc={rtc} />
          </section>
          <section className="dm-tool-card">
            <div className="dm-tool-eyebrow">MUSIC</div>
            <MusicDeck embedded room={room} onSaved={payload => { setRoom(payload.room); broadcastRefresh(payload) }} />
          </section>
          <section className="dm-tool-card">
            <RoomNotes embedded room={room} canEdit onSaved={payload => { setRoom(payload.room); broadcastRefresh(payload) }} />
          </section>
          <section className="dm-tool-card">
            <RoomActionItems embedded roomId={room.id} session={session} items={actions} onRefresh={payload => { broadcastRefresh(payload); loadRoom() }} />
          </section>
        </aside>
      </div>
    )
  }

  return (
    <div style={{ paddingTop: 'calc(56px + env(safe-area-inset-top, 0px))', minHeight: '100vh' }}>
      <div className="live-room-shell" style={{ maxWidth: '1440px', margin: '0 auto', padding: '18px' }}>
        <div className="room-header">
          <div>
            <Link to="/rooms" style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.1em' }}>BACK TO DMS</Link>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
              {isDm && (
                <div style={{
                  width: '54px', height: '54px', borderRadius: '50%', border: '1px solid var(--border)',
                  background: dmPeer?.avatar_url ? `url(${dmPeer.avatar_url}) center/cover` : 'var(--black)',
                  color: 'var(--red)', display: 'grid', placeItems: 'center', fontFamily: 'Bebas Neue', fontSize: '1.7rem'
                }}>
                  {!dmPeer?.avatar_url && dmPeer?.username?.slice(0, 1).toUpperCase()}
                </div>
              )}
              <h1 style={{ fontSize: '2.35rem', lineHeight: 1 }}>{isDm ? `@${dmPeer?.username || 'trader'}` : room.title}</h1>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
              <span className="tag" style={{ color: isDm ? 'var(--green)' : type.color }}>{isDm ? 'DIRECT MESSAGE' : type.label}</span>
              <span className="tag" style={{ color: connected ? 'var(--green)' : 'var(--red)' }}>{connected ? 'REALTIME' : 'CONNECTING'}</span>
              <span className="tag" style={{ color: 'var(--dim)' }}>{participants.length} PRESENT</span>
            </div>
          </div>
          <div className="room-header-actions">
            {!isDm && <button onClick={copyInvite} className="btn" style={{ padding: '9px 12px', fontSize: '10px' }}>COPY INVITE</button>}
            {!isDm && isHost && room.status === 'live' && <button onClick={completeRoom} className="btn btn-green" style={{ padding: '9px 12px', fontSize: '10px' }}>MARK COMPLETE</button>}
          </div>
        </div>

        <div className="discord-room-shell">
          <main style={{ minWidth: 0 }}>
            <LiveStage localStream={rtc.localStream} remoteStreams={rtc.remoteStreams} mediaState={rtc.mediaState} rtc={rtc} />
          </main>
          <aside className="room-functions-panel">
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--dark)',
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
            {isDm ? (
              <aside className="card dm-context-panel">
                <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--red)', letterSpacing: '0.12em', marginBottom: '14px' }}>DM CONTEXT</div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: '1px solid var(--border)', background: dmPeer?.avatar_url ? `url(${dmPeer.avatar_url}) center/cover` : 'var(--black)', color: 'var(--red)', display: 'grid', placeItems: 'center', fontFamily: 'Bebas Neue', fontSize: '1.4rem' }}>
                    {!dmPeer?.avatar_url && dmPeer?.username?.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', lineHeight: 1 }}>@{dmPeer?.username}</div>
                    <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', marginTop: '4px' }}>MUTUAL FOLLOW</div>
                  </div>
                </div>
                {dmPeer?.bio && <p style={{ color: 'var(--dim)', fontSize: '13px', lineHeight: 1.6, marginBottom: '14px' }}>{dmPeer.bio}</p>}
                <div className="dm-muted" style={{ lineHeight: 1.7 }}>
                  Use this desk for messages, trade review calls, screen share, shared music, notes, and follow-through items.
                </div>
              </aside>
            ) : (
              <RoomContextPanel room={room} session={session} />
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
