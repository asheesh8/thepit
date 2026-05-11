/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import useRoomRealtime from '../hooks/useRoomRealtime'
import useWebRTCRoom from '../hooks/useWebRTCRoom'
import RoomChat from '../components/RoomChat'
import LiveStage from '../components/LiveStage'

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

export default function Rooms({ session }) {
  const location = useLocation()
  const navigate = useNavigate()
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

  const { participants, connected, sendSignal, broadcastRefresh } = useRoomRealtime({
    roomId: selectedId,
    userId: session.user.id,
    onSignal: signal => setPendingSignals(prev => [...prev, signal]),
    onRefresh: () => loadRoom(selectedId),
  })
  const rtc = useWebRTCRoom({ userId: session.user.id, participants, sendSignal })

  useEffect(() => {
    const openId = location.state?.openId
    loadAll(openId)
  }, [])

  useEffect(() => {
    if (pendingSignals.length === 0) return
    const [next, ...rest] = pendingSignals
    setPendingSignals(rest)
    rtc.handleSignal(next)
  }, [pendingSignals])

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
    const [followingRes, followerRes, dmRes] = await Promise.all([
      supabase.from('follows')
        .select('following_id, profiles!follows_following_id_fkey(id, username, bio, avatar_url)')
        .eq('follower_id', session.user.id),
      supabase.from('follows').select('follower_id').eq('following_id', session.user.id),
      supabase.from('live_rooms')
        .select('id, title, host_id, dm_peer_id, updated_at, room_type, profiles!live_rooms_host_id_profiles_fkey(id, username, avatar_url), dm_peer:profiles!live_rooms_dm_peer_id_profiles_fkey(id, username, avatar_url), live_room_messages(body, created_at, profiles(username))')
        .or(`host_id.eq.${session.user.id},dm_peer_id.eq.${session.user.id}`)
        .eq('room_type', 'dm')
        .order('updated_at', { ascending: false })
        .limit(40),
    ])

    const followerSet = new Set((followerRes.data || []).map(r => r.follower_id))
    setMutuals(
      (followingRes.data || [])
        .filter(r => followerSet.has(r.following_id))
        .map(r => r.profiles)
        .filter(Boolean)
    )

    const dms = (dmRes.data || []).map(room => ({
      ...room,
      other: room.host_id === session.user.id ? room.dm_peer : room.profiles,
      lastMessage: [...(room.live_room_messages || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0],
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
    } catch (_) {}

    setThreads([...dms, ...groups].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)))
    setLoading(false)
    if (autoOpenId) selectThread(autoOpenId)
  }

  const loadRoom = async (roomId) => {
    if (!roomId) return
    setRoomLoading(true)
    const [{ data: roomData }, { data: msgData }] = await Promise.all([
      supabase.from('live_rooms')
        .select('*, profiles!live_rooms_host_id_profiles_fkey(id, username, avatar_url, bio), dm_peer:profiles!live_rooms_dm_peer_id_profiles_fkey(id, username, avatar_url, bio)')
        .eq('id', roomId)
        .single(),
      supabase.from('live_room_messages')
        .select('*, profiles(username, avatar_url)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true }),
    ])
    setSelectedRoom(roomData)
    setMessages(msgData || [])
    setRoomLoading(false)
  }

  const selectThread = async (threadId) => {
    if (selectedId === threadId) return
    if (callActive) { rtc.leaveMedia(); setCallActive(false); setCallNotes('') }
    setSelectedId(threadId)
    setMobileView('chat')
    await loadRoom(threadId)
  }

  const openDm = async (peer) => {
    if (!peer?.id) return
    const title = dmTitleFor(session.user.id, peer.id)
    const { data: existing } = await supabase.from('live_rooms').select('id').eq('title', title).eq('room_type', 'dm').maybeSingle()
    let id = existing?.id
    if (!id) {
      const { data } = await supabase.from('live_rooms').insert({
        title, room_type: 'dm', is_public: false, room_password: '',
        host_id: session.user.id, dm_peer_id: peer.id, status: 'live',
        agenda: `Direct message with @${peer.username}`,
      }).select('id').single()
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

  const startCall = () => {
    setCallNotes('')
    setCallActive(true)
    rtc.joinMedia()
  }

  const startScreenShare = async () => {
    setCallNotes('')
    setCallActive(true)
    if (!rtc.mediaState.joined) await rtc.joinMedia()
    rtc.shareScreen()
  }

  const endCall = async () => {
    rtc.leaveMedia()
    setCallActive(false)
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

  const selectedThread = threads.find(t => t.id === selectedId)

  const dmPeer = selectedRoom?.room_type === 'dm'
    ? (selectedRoom.host_id === session.user.id ? selectedRoom.dm_peer : selectedRoom.profiles)
    : null

  // Use thread data as fallback title while room is loading
  const chatTitle = selectedRoom
    ? (selectedRoom.room_type === 'dm' ? `@${dmPeer?.username || 'trader'}` : (selectedRoom.title || 'Group'))
    : (selectedThread?.room_type === 'dm' ? `@${selectedThread?.other?.username || '...'}` : (selectedThread?.title || '...'))

  const isDm = (selectedRoom ?? selectedThread)?.room_type === 'dm'

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
          <div style={{ display: 'flex', gap: '6px' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <button className="dm-page-back-btn" onClick={() => { setMobileView('list'); setSelectedId(null) }}>←</button>
                {selectedRoom?.room_type === 'group' ? <GroupIcon size={40} /> : <Avatar profile={dmPeer} size={40} />}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', letterSpacing: '0.04em', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chatTitle}</div>
                  <div style={{ fontFamily: 'Space Mono', fontSize: '8px', color: connected ? 'var(--green)' : 'var(--muted)', letterSpacing: '0.08em', marginTop: '2px' }}>
                    {connected ? '● LIVE' : '○ CONNECTING'} · {participants.length} PRESENT
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button className="btn btn-green" style={{ padding: '8px 14px', fontSize: '9px', letterSpacing: '0.1em' }} onClick={startCall}>▶ CALL</button>
                <button className="btn" style={{ padding: '8px 12px', fontSize: '9px' }} onClick={startScreenShare}>SCREEN</button>
              </div>
            </header>
            <div className="dm-page-chat-body">
              {roomLoading
                ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)' }}>LOADING...</div>
                : <RoomChat
                    embedded fullHeight title={null}
                    roomId={selectedId}
                    session={session}
                    messages={messages}
                    isDm={isDm}
                    onRefresh={payload => { broadcastRefresh(payload); loadRoom(selectedId); loadAll() }}
                  />
              }
            </div>
          </>
        )}
      </main>

      {/* ── CALL OVERLAY ── */}
      {callActive && (
        <div className="dm-call-overlay">
          <div className="dm-call-overlay-box">
            <header className="dm-call-overlay-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {selectedRoom?.room_type !== 'group' && <Avatar profile={dmPeer} size={34} />}
                <div>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', letterSpacing: '0.06em', lineHeight: 1 }}>{chatTitle}</div>
                  <div style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--green)', letterSpacing: '0.1em', marginTop: '2px' }}>● LIVE CALL · {participants.length} PRESENT</div>
                </div>
              </div>
              <button className="btn btn-red" style={{ padding: '9px 18px', fontSize: '9px', letterSpacing: '0.12em' }} onClick={endCall}>END CALL</button>
            </header>
            <div className="dm-call-stage-wrap">
              <LiveStage localStream={rtc.localStream} remoteStreams={rtc.remoteStreams} mediaState={rtc.mediaState} rtc={rtc} />
            </div>
            <div className="dm-call-notes-wrap">
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
