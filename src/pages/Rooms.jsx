/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import useRoomRealtime from '../hooks/useRoomRealtime'
import useWebRTCRoom from '../hooks/useWebRTCRoom'
import RoomChat from '../components/RoomChat'
import LiveStage from '../components/LiveStage'
import { showDeviceNotification } from '../lib/deviceNotifications'

function Avatar({ profile, size = 42 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: '1px solid var(--border)',
      background: profile?.avatar_url ? `url(${profile.avatar_url}) center/cover` : 'var(--black)',
      color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Bebas Neue', fontSize: `${Math.round(size * 0.46)}px`, flexShrink: 0,
    }}>
      {!profile?.avatar_url && profile?.username?.slice(0, 1).toUpperCase()}
    </div>
  )
}

function GroupIcon({ size = 38 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--dark)', border: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, fontFamily: 'Bebas Neue', fontSize: `${Math.round(size * 0.42)}px`, color: 'var(--red)',
    }}>#</div>
  )
}

function dmTitleFor(a, b) {
  return `DM:${[a, b].sort().join(':')}`
}

function uniqueIds(ids) {
  return [...new Set(ids.filter(Boolean))]
}

export default function Rooms({ session }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { id: routeRoomId } = useParams()
  const [threads, setThreads] = useState([])
  const [mutuals, setMutuals] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [roomLoading, setRoomLoading] = useState(false)
  const [showNewDm, setShowNewDm] = useState(false)
  const [callActive, setCallActive] = useState(false)
  const [callNotes, setCallNotes] = useState('')
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupMembers, setGroupMembers] = useState([])
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [mobileView, setMobileView] = useState('list')
  const [pendingSignals, setPendingSignals] = useState([])
  const [error, setError] = useState('')
  const [currentProfile, setCurrentProfile] = useState(null)
  const [incomingCall, setIncomingCall] = useState(null)
  const [callAnnounced, setCallAnnounced] = useState(false)
  const [showCallNotes, setShowCallNotes] = useState(false)

  const { participants, connected, sendSignal, broadcastRefresh } = useRoomRealtime({
    roomId: selectedId,
    userId: session.user.id,
    onSignal: signal => {
      if (signal?.kind === 'call-invite' && signal.from !== session.user.id) {
        setIncomingCall(signal)
        showDeviceNotification({
          title: `${signal.callerName || 'Someone'} is calling`,
          body: signal.title || 'Tap to join the call',
          tag: `call-${selectedId}`,
          url: `/rooms/${selectedId}`,
          type: 'call',
          requireInteraction: true,
        })
        return
      }
      setPendingSignals(prev => [...prev, signal])
    },
    onRefresh: () => loadRoom(selectedId),
  })
  const rtc = useWebRTCRoom({ userId: session.user.id, participants, sendSignal })
  const selectedThread = threads.find(t => t.id === selectedId)
  const dmPeer = selectedRoom?.room_type === 'dm'
    ? (selectedRoom.host_id === session.user.id ? selectedRoom.dm_peer : selectedRoom.profiles)
    : null
  const chatTitle = selectedRoom
    ? (selectedRoom.room_type === 'dm' ? `@${dmPeer?.username || 'trader'}` : (selectedRoom.title || 'Group'))
    : (selectedThread?.room_type === 'dm' ? `@${selectedThread?.other?.username || '...'}` : (selectedThread?.title || '...'))
  const isDm = (selectedRoom ?? selectedThread)?.room_type === 'dm'

  useEffect(() => {
    const openId = location.state?.openId
    loadAll(openId)
  }, [])

  useEffect(() => {
    if (routeRoomId) {
      selectThread(routeRoomId, { syncUrl: false })
      return
    }
    setSelectedId(null)
    setSelectedRoom(null)
    setMessages([])
    setMobileView('list')
  }, [routeRoomId])

  useEffect(() => {
    if (pendingSignals.length === 0) return
    const [next, ...rest] = pendingSignals
    setPendingSignals(rest)
    rtc.handleSignal(next)
  }, [pendingSignals])

  useEffect(() => {
    if (!callActive) return
    let wakeLock = null
    let cancelled = false
    const originalTitle = document.title

    const keepAwake = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen')
        }
      } catch (wakeError) {
        console.warn('Could not keep call screen awake', wakeError)
      }
    }

    document.title = `LIVE CALL · ${chatTitle}`
    keepAwake()

    const handleVisibility = () => {
      if (!cancelled && document.visibilityState === 'visible' && !wakeLock) keepAwake()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      document.title = originalTitle
      document.removeEventListener('visibilitychange', handleVisibility)
      wakeLock?.release?.()
    }
  }, [callActive, chatTitle])

  // Real-time message delivery for the active conversation
  useEffect(() => {
    if (!selectedId) return
    const channel = supabase
      .channel(`messages:${selectedId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'live_room_messages',
        filter: `room_id=eq.${selectedId}`,
      }, async payload => {
        const { data } = await supabase
          .from('live_room_messages')
          .select('*, profiles(username, avatar_url)')
          .eq('id', payload.new.id)
          .single()
        if (data) setMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev
          return [...prev, data]
        })
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [selectedId])

  const loadAll = async (autoOpenId = null) => {
    setLoading(true)
    setError('')
    const [followingRes, followerRes, dmRoomRes] = await Promise.all([
      supabase.from('follows').select('following_id').eq('follower_id', session.user.id),
      supabase.from('follows').select('follower_id').eq('following_id', session.user.id),
      supabase.from('live_rooms')
        .select('id, title, host_id, dm_peer_id, updated_at, room_type')
        .eq('room_type', 'dm')
        .or(`host_id.eq.${session.user.id},dm_peer_id.eq.${session.user.id}`)
        .order('updated_at', { ascending: false })
        .limit(80),
    ])

    const loadError = followingRes.error || followerRes.error || dmRoomRes.error
    if (loadError) {
      setError(loadError.message)
      setLoading(false)
      return
    }

    const followingIds = (followingRes.data || []).map(row => row.following_id)
    const followerIds = (followerRes.data || []).map(row => row.follower_id)
    const followerSet = new Set(followerIds)
    const mutualIds = followingIds.filter(id => followerSet.has(id))
    const dmRooms = dmRoomRes.data || []
    const dmPeerIds = dmRooms.map(room => room.host_id === session.user.id ? room.dm_peer_id : room.host_id)
    const profileIds = uniqueIds([session.user.id, ...mutualIds, ...dmPeerIds])
    const roomIds = dmRooms.map(room => room.id)

    const [profileRes, messageRes] = await Promise.all([
      profileIds.length
        ? supabase.from('profiles').select('id, username, bio, avatar_url').in('id', profileIds)
        : Promise.resolve({ data: [], error: null }),
      roomIds.length
        ? supabase.from('live_room_messages')
          .select('room_id, body, created_at, profiles(username)')
          .in('room_id', roomIds)
          .order('created_at', { ascending: false })
          .limit(120)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (profileRes.error || messageRes.error) {
      setError(profileRes.error?.message || messageRes.error?.message)
    }

    const profileById = new Map((profileRes.data || []).map(profile => [profile.id, profile]))
    setCurrentProfile(profileById.get(session.user.id) || null)
    setMutuals(mutualIds.map(id => profileById.get(id)).filter(Boolean))

    const latestMessageByRoom = new Map()
    for (const message of (messageRes.data || [])) {
      if (!latestMessageByRoom.has(message.room_id)) latestMessageByRoom.set(message.room_id, message)
    }

    const dms = dmRooms.map(room => ({
      ...room,
      other: profileById.get(room.host_id === session.user.id ? room.dm_peer_id : room.host_id),
      lastMessage: latestMessageByRoom.get(room.id),
    }))

    // Group chats — requires live_room_members table (see SQL setup)
    let groups = []
    try {
      const { data: gd } = await supabase
        .from('live_room_members')
        .select('room_id, live_rooms!inner(id, title, host_id, room_type, updated_at, live_room_messages(body, created_at, profiles(username)))')
        .eq('user_id', session.user.id)
      groups = (gd || [])
        .filter(r => r.live_rooms?.room_type === 'group')
        .map(r => ({
          ...r.live_rooms,
          lastMessage: [...(r.live_rooms.live_room_messages || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0],
        }))
    } catch (groupError) {
      console.warn('Could not load group chats', groupError)
    }

    setThreads([...dms, ...groups].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)))
    setLoading(false)
    if (autoOpenId) selectThread(autoOpenId)
  }

  const loadRoom = async (roomId) => {
    if (!roomId) return
    setRoomLoading(true)
    setError('')
    const [{ data: roomData, error: roomError }, { data: msgData, error: msgError }] = await Promise.all([
      supabase.from('live_rooms')
        .select('*')
        .eq('id', roomId)
        .single(),
      supabase.from('live_room_messages')
        .select('*, profiles(username, avatar_url)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true }),
    ])
    if (roomError || msgError) setError(roomError?.message || msgError?.message)
    if (roomData?.room_type === 'dm') {
      const peerId = roomData.host_id === session.user.id ? roomData.dm_peer_id : roomData.host_id
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, bio')
        .in('id', uniqueIds([roomData.host_id, peerId]))
      const profileById = new Map((profiles || []).map(profile => [profile.id, profile]))
      setSelectedRoom({
        ...roomData,
        profiles: profileById.get(roomData.host_id),
        dm_peer: profileById.get(peerId),
      })
    } else {
      setSelectedRoom(roomData)
    }
    setMessages(msgData || [])
    setRoomLoading(false)
  }

  const selectThread = async (threadId, options = {}) => {
    if (selectedId === threadId) {
      setMobileView('chat')
      if (options.syncUrl !== false && routeRoomId !== threadId) navigate(`/rooms/${threadId}`)
      return
    }
    if (callActive) { rtc.leaveMedia(); setCallActive(false); setCallNotes('') }
    setSelectedId(threadId)
    setMobileView('chat')
    if (options.syncUrl !== false && routeRoomId !== threadId) navigate(`/rooms/${threadId}`)
    await loadRoom(threadId)
  }

  const openDm = async (peer) => {
    if (!peer?.id) return
    const title = dmTitleFor(session.user.id, peer.id)
    setError('')
    const { data: existing, error: existingError } = await supabase.from('live_rooms').select('id').eq('title', title).eq('room_type', 'dm').maybeSingle()
    if (existingError) {
      setError(existingError.message)
      return
    }
    let id = existing?.id
    if (!id) {
      const { data, error: insertError } = await supabase.from('live_rooms').insert({
        title, room_type: 'dm', is_public: false, room_password: '',
        host_id: session.user.id, dm_peer_id: peer.id, status: 'live',
        agenda: `Direct message with @${peer.username}`,
      }).select('id').single()
      if (insertError) {
        setError(insertError.message)
        return
      }
      id = data?.id
    }
    if (id) { await loadAll(); selectThread(id) }
    setShowNewDm(false)
  }

  const createGroup = async () => {
    if (!groupName.trim() || groupMembers.length === 0) return
    setCreatingGroup(true)
    const { data } = await supabase.from('live_rooms').insert({
      title: groupName.trim(), room_type: 'group', is_public: false, room_password: '',
      host_id: session.user.id, status: 'live', agenda: `Group: ${groupName.trim()}`,
    }).select('id').single()
    if (data) {
      await supabase.from('live_room_members').insert(
        [session.user.id, ...groupMembers.map(m => m.id)].map(uid => ({ room_id: data.id, user_id: uid }))
      )
      await loadAll()
      selectThread(data.id)
    }
    setShowGroupModal(false); setGroupName(''); setGroupMembers([]); setCreatingGroup(false)
  }

  const announceCall = async () => {
    if (!selectedId || callAnnounced) return
    const callerName = currentProfile?.username ? `@${currentProfile.username}` : 'Someone'
    setCallAnnounced(true)
    await sendSignal({
      kind: 'call-invite',
      from: session.user.id,
      callerName,
      title: chatTitle,
      sent_at: new Date().toISOString(),
    })
    const { data } = await supabase
      .from('live_room_messages')
      .insert({
        room_id: selectedId,
        user_id: session.user.id,
        body: `📞 ${callerName} started a call. Tap to join.`,
      })
      .select('*, profiles(username, avatar_url)')
      .single()
    if (data) {
      setMessages(prev => prev.some(message => message.id === data.id) ? prev : [...prev, data])
      await supabase.from('live_rooms').update({ updated_at: new Date().toISOString() }).eq('id', selectedId)
      broadcastRefresh({ kind: 'chat', message: data })
    }
  }

  const startCall = async ({ announce = true } = {}) => {
    setCallNotes('')
    setShowCallNotes(false)
    setCallActive(true)
    setIncomingCall(null)
    if (announce) await announceCall()
    await rtc.joinMedia()
  }

  const joinIncomingCall = () => {
    setCallAnnounced(true)
    startCall({ announce: false })
  }

  const startScreenShare = async () => {
    setCallNotes('')
    setShowCallNotes(false)
    setCallActive(true)
    setIncomingCall(null)
    await announceCall()
    if (!rtc.mediaState.joined) await rtc.joinMedia()
    await rtc.shareScreen()
  }

  const endCall = async () => {
    rtc.leaveMedia()
    setCallActive(false)
    setIncomingCall(null)
    setCallAnnounced(false)
    setShowCallNotes(false)
    if (callNotes.trim() && selectedId) {
      const body = `\u{1F4CB} CALL NOTES\n${'─'.repeat(26)}\n${callNotes.trim()}`
      await supabase.from('live_room_messages').insert({ room_id: selectedId, user_id: session.user.id, body })
      broadcastRefresh({ kind: 'chat' })
    }
    setCallNotes('')
  }

  const fmtTime = (iso) => {
    if (!iso) return ''
    const d = new Date(iso), diff = Date.now() - d
    if (diff < 60000) return 'now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className={`dm-page-shell${mobileView === 'chat' ? ' mobile-chat-view' : ''}`}>

      {/* ── LEFT SIDEBAR ── */}
      <aside className="dm-page-sidebar">
        <div className="dm-page-sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button className="dm-sidebar-back-btn" onClick={() => navigate('/feed')} aria-label="Back to feed">
              ←
            </button>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.7rem', letterSpacing: '0.06em' }}>MESSAGES</div>
          </div>
          <div className="dm-sidebar-actions" style={{ display: 'flex', gap: '6px' }}>
            <button className="btn" style={{ padding: '6px 10px', fontSize: '9px' }} onClick={() => setShowNewDm(v => !v)}>+ DM</button>
            <button className="btn" style={{ padding: '6px 10px', fontSize: '9px' }} onClick={() => setShowGroupModal(true)}>+ GROUP</button>
          </div>
        </div>

        {showNewDm && (
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', letterSpacing: '0.12em', marginBottom: '8px' }}>START A NEW DM</div>
            {mutuals.length === 0
              ? <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--muted)', lineHeight: 1.8 }}>FOLLOW EACH OTHER TO UNLOCK DMs.</div>
              : mutuals.map(user => (
                <button key={user.id} onClick={() => openDm(user)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '7px 8px', background: 'none', border: '1px solid transparent', cursor: 'pointer',
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                >
                  <Avatar profile={user} size={26} />
                  <span style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)' }}>@{user.username}</span>
                </button>
              ))
            }
          </div>
        )}

        <div className="dm-page-thread-list">
          {loading
            ? <div style={{ padding: '24px', fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)' }}>LOADING...</div>
            : threads.length === 0
              ? <div style={{ padding: '24px', fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--muted)', lineHeight: 1.9 }}>NO CONVERSATIONS YET.<br />TAP + DM OR + GROUP.</div>
              : threads.map(thread => (
                <button key={thread.id} onClick={() => selectThread(thread.id)}
                  className={`dm-page-thread-item${selectedId === thread.id ? ' active' : ''}`}
                >
                  {thread.room_type === 'group' ? <GroupIcon size={38} /> : <Avatar profile={thread.other} size={38} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.05rem', letterSpacing: '0.04em', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {thread.room_type === 'group' ? thread.title : `@${thread.other?.username || 'trader'}`}
                      </span>
                      <span style={{ fontFamily: 'Space Mono', fontSize: '7px', color: 'var(--muted)', flexShrink: 0 }}>
                        {fmtTime(thread.lastMessage?.created_at || thread.updated_at)}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'DM Sans', fontSize: '11px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                      {thread.lastMessage?.body || 'No messages yet'}
                    </div>
                  </div>
                </button>
              ))
          }
        </div>
      </aside>

      {/* ── RIGHT CHAT PANEL ── */}
      <main className="dm-page-chat">
        {!selectedId ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px' }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '3.2rem', color: 'var(--border)', letterSpacing: '0.06em' }}>THE DESK</div>
            <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.12em' }}>SELECT A CONVERSATION TO START</div>
          </div>
        ) : (
          <>
            <header className="dm-page-chat-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                <button className="dm-page-back-btn" onClick={() => { setMobileView('list'); navigate('/rooms') }}>←</button>
                {selectedRoom?.room_type === 'group' ? <GroupIcon size={36} /> : <Avatar profile={dmPeer} size={36} />}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', letterSpacing: '0.04em', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {chatTitle}
                  </div>
                  {isDm && dmPeer?.username && (
                    <div style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--dim)', letterSpacing: '0.06em', marginTop: '1px' }}>
                      @{dmPeer.username}
                    </div>
                  )}
                </div>
              </div>
              <div className="dm-chat-actions" style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                <button className="btn btn-green dm-call-btn" style={{ padding: '7px 13px', fontSize: '9px', letterSpacing: '0.1em' }} onClick={startCall}>▶ <span className="dm-call-label">CALL</span></button>
                <button className="btn dm-screen-btn" style={{ padding: '7px 11px', fontSize: '9px' }} onClick={startScreenShare}>SCREEN</button>
              </div>
            </header>
            <div className="dm-page-chat-body">
              {roomLoading
                ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)' }}>LOADING...</div>
                : <>
                  {error && <div className="dm-inline-error">{error}</div>}
                  <RoomChat
                    embedded fullHeight title={null}
                    roomId={selectedId}
                    session={session}
                    messages={messages}
                    isDm={isDm}
                    onRefresh={payload => { broadcastRefresh(payload); loadRoom(selectedId); loadAll() }}
                  />
                </>
              }
            </div>
          </>
        )}
      </main>

      {incomingCall && !callActive && (
        <div className="incoming-call-banner">
          <div>
            <div className="incoming-call-kicker">INCOMING CALL</div>
            <div className="incoming-call-title">{incomingCall.callerName || 'Someone'} is calling</div>
            <div className="incoming-call-room">{incomingCall.title || chatTitle}</div>
          </div>
          <div className="incoming-call-actions">
            <button className="btn" onClick={() => setIncomingCall(null)}>DECLINE</button>
            <button className="btn btn-green" onClick={joinIncomingCall}>JOIN</button>
          </div>
        </div>
      )}

      {/* ── CALL OVERLAY ── */}
      {callActive && (
        <div className="dm-call-overlay">
          <div className="dm-call-overlay-box">
            <header className="dm-call-overlay-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {selectedRoom?.room_type !== 'group' && <Avatar profile={dmPeer} size={34} />}
                <div>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', letterSpacing: '0.06em', lineHeight: 1 }}>{chatTitle}</div>
                  <div style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--green)', letterSpacing: '0.1em', marginTop: '2px' }}>
                    ● LIVE · {participants.filter(p => p.user_id !== session.user.id).length > 0 ? `${participants.filter(p => p.user_id !== session.user.id).length} WITH YOU` : 'WAITING...'}
                  </div>
                </div>
              </div>
              <div className="dm-call-header-actions">
                <button className="btn" style={{ padding: '9px 14px', fontSize: '9px', letterSpacing: '0.12em' }} onClick={() => setShowCallNotes(prev => !prev)}>
                  {showCallNotes ? 'HIDE NOTES' : 'NOTES'}
                </button>
                <button className="btn btn-red" style={{ padding: '9px 18px', fontSize: '9px', letterSpacing: '0.12em' }} onClick={endCall}>END CALL</button>
              </div>
            </header>
            <div className="dm-call-stage-wrap">
              <LiveStage localStream={rtc.localStream} localScreenStream={rtc.localScreenStream} remoteStreams={rtc.remoteStreams} mediaState={rtc.mediaState} rtc={rtc} />
            </div>
            <div className={`dm-call-notes-wrap ${showCallNotes ? 'open' : ''}`}>
              <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', letterSpacing: '0.1em', marginBottom: '8px' }}>
                CALL NOTES — sent to chat when you end the call
              </div>
              <textarea
                value={callNotes}
                onChange={e => setCallNotes(e.target.value)}
                placeholder="Jot down setups, takeaways, action items..."
                rows={4}
                style={{
                  width: '100%', background: 'var(--black)', border: '1px solid var(--border)',
                  color: 'var(--text)', padding: '10px 12px', resize: 'none', outline: 'none',
                  fontFamily: 'DM Sans', fontSize: '13px', lineHeight: 1.5, boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── GROUP CREATION MODAL ── */}
      {showGroupModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }} onClick={e => { if (e.target === e.currentTarget) setShowGroupModal(false) }}>
          <div style={{ width: '100%', maxWidth: '420px', background: 'var(--dark)', border: '1px solid var(--border)', padding: '28px', position: 'relative' }}>
            <button onClick={() => setShowGroupModal(false)} style={{ position: 'absolute', top: '14px', right: '14px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dim)', fontSize: '18px', lineHeight: 1 }}>×</button>
            <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--red)', letterSpacing: '0.18em', marginBottom: '8px' }}>NEW GROUP CHAT</div>
            <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', marginBottom: '20px', lineHeight: 1 }}>CREATE GROUP</h2>

            <label style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', letterSpacing: '0.1em', display: 'block', marginBottom: '6px' }}>GROUP NAME</label>
            <input
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="e.g. ES Scalpers"
              style={{ width: '100%', background: 'var(--black)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 12px', outline: 'none', boxSizing: 'border-box', marginBottom: '16px' }}
            />

            <label style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>ADD MEMBERS (MUTUALS)</label>
            <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px' }}>
              {mutuals.length === 0
                ? <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--muted)' }}>NO MUTUALS FOUND.</div>
                : mutuals.map(user => {
                  const sel = groupMembers.some(m => m.id === user.id)
                  return (
                    <button key={user.id} onClick={() => setGroupMembers(prev => sel ? prev.filter(m => m.id !== user.id) : [...prev, user])}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: sel ? 'rgba(230,57,70,0.1)' : 'none', border: `1px solid ${sel ? 'var(--red)' : 'var(--border)'}`, cursor: 'pointer', marginBottom: '4px' }}
                    >
                      <Avatar profile={user} size={28} />
                      <span style={{ fontFamily: 'Space Mono', fontSize: '9px', color: sel ? 'var(--text)' : 'var(--dim)', flex: 1, textAlign: 'left' }}>@{user.username}</span>
                      {sel && <span style={{ color: 'var(--red)', fontSize: '13px' }}>✓</span>}
                    </button>
                  )
                })
              }
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowGroupModal(false)} className="btn" style={{ flex: 1, justifyContent: 'center', padding: '11px' }}>CANCEL</button>
              <button onClick={createGroup} className="btn btn-red" disabled={!groupName.trim() || groupMembers.length === 0 || creatingGroup} style={{ flex: 1, justifyContent: 'center', padding: '11px' }}>
                {creatingGroup ? 'CREATING...' : 'CREATE GROUP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
