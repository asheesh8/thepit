/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Avatar({ profile, size = 42 }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      border: '1px solid var(--border)',
      background: profile?.avatar_url ? `url(${profile.avatar_url}) center/cover` : 'var(--black)',
      color: 'var(--red)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Bebas Neue',
      fontSize: `${Math.round(size * 0.46)}px`,
      flex: '0 0 auto',
    }}>
      {!profile?.avatar_url && profile?.username?.slice(0, 1).toUpperCase()}
    </div>
  )
}

function dmTitleFor(userA, userB) {
  return `DM:${[userA, userB].sort().join(':')}`
}

export default function Rooms({ session }) {
  const navigate = useNavigate()
  const [mutuals, setMutuals] = useState([])
  const [threads, setThreads] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDms()
  }, [])

  const loadDms = async () => {
    setLoading(true)
    setError('')
    const [followingResult, followerResult, dmResult] = await Promise.all([
      supabase
        .from('follows')
        .select('following_id, profiles!follows_following_id_fkey(id, username, bio, avatar_url)')
        .eq('follower_id', session.user.id),
      supabase
        .from('follows')
        .select('follower_id, profiles!follows_follower_id_fkey(id, username, bio, avatar_url)')
        .eq('following_id', session.user.id),
      supabase
        .from('live_rooms')
        .select('id, title, host_id, dm_peer_id, updated_at, created_at, profiles!live_rooms_host_id_profiles_fkey(id, username, avatar_url), dm_peer:profiles!live_rooms_dm_peer_id_profiles_fkey(id, username, avatar_url), live_room_messages(body, created_at, profiles(username))')
        .eq('room_type', 'dm')
        .or(`host_id.eq.${session.user.id},dm_peer_id.eq.${session.user.id}`)
        .order('updated_at', { ascending: false })
        .limit(40),
    ])

    if (followingResult.error || followerResult.error || dmResult.error) {
      setError(followingResult.error?.message || followerResult.error?.message || dmResult.error?.message)
    }

    const followers = new Set((followerResult.data || []).map(row => row.follower_id))
    setMutuals((followingResult.data || [])
      .filter(row => followers.has(row.following_id))
      .map(row => row.profiles)
      .filter(Boolean))

    setThreads((dmResult.data || []).map(room => ({
      ...room,
      other: room.host_id === session.user.id ? room.dm_peer : room.profiles,
      lastMessage: [...(room.live_room_messages || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0],
    })))
    setLoading(false)
  }

  const openDm = async (peer) => {
    if (!peer?.id) return
    setSelectedId(peer.id)
    setError('')
    const title = dmTitleFor(session.user.id, peer.id)
    const { data: existing, error: lookupError } = await supabase
      .from('live_rooms')
      .select('id')
      .eq('title', title)
      .eq('room_type', 'dm')
      .maybeSingle()

    if (lookupError) {
      setError(lookupError.message)
      setSelectedId('')
      return
    }
    if (existing) {
      navigate(`/rooms/${existing.id}`)
      return
    }

    const { data, error: insertError } = await supabase
      .from('live_rooms')
      .insert({
        title,
        room_type: 'dm',
        is_public: false,
        room_password: '',
        host_id: session.user.id,
        dm_peer_id: peer.id,
        status: 'live',
        agenda: `Direct message with @${peer.username}`,
      })
      .select('id')
      .single()

    setSelectedId('')
    if (insertError) {
      setError(insertError.message)
      return
    }
    if (data) navigate(`/rooms/${data.id}`)
  }

  return (
    <div style={{ paddingTop: '56px', minHeight: '100vh' }}>
      <div className="dm-home">
        <aside className="dm-home-sidebar">
          <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--red)', letterSpacing: '0.14em', marginBottom: '12px' }}>
            MUTUALS
          </div>
          {loading ? (
            <div className="dm-muted">LOADING...</div>
          ) : mutuals.length === 0 ? (
            <div className="dm-muted">FOLLOW EACH OTHER TO MESSAGE.</div>
          ) : mutuals.map(user => (
            <button key={user.id} onClick={() => openDm(user)} className="dm-user-row">
              <Avatar profile={user} size={34} />
              <span>@{user.username}</span>
            </button>
          ))}
        </aside>

        <main className="dm-home-main">
          <div className="dm-home-hero">
            <div>
              <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--green)', letterSpacing: '0.14em' }}>PRIVATE DESK</div>
              <h1 style={{ fontSize: '4.2rem', lineHeight: 0.9, marginTop: '8px' }}>DMs</h1>
              <p style={{ color: 'var(--dim)', lineHeight: 1.7, maxWidth: '560px', marginTop: '12px' }}>
                Message traders who follow you back. Each DM keeps chat, calls, screen share, music, notes, and action items in one private workspace.
              </p>
            </div>
          </div>

          {error && <div className="card" style={{ padding: '14px', color: 'var(--gold)', fontFamily: 'Space Mono', fontSize: '10px', marginBottom: '16px' }}>{error}</div>}

          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '2rem' }}>RECENT DMs</h2>
              <span style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)' }}>{threads.length} THREADS</span>
            </div>
            {loading ? (
              <div className="dm-empty">LOADING DMS...</div>
            ) : threads.length === 0 ? (
              <div className="dm-empty">START WITH SOMEONE IN YOUR MUTUALS LIST.</div>
            ) : threads.map(thread => (
              <button key={thread.id} onClick={() => navigate(`/rooms/${thread.id}`)} className="dm-thread-card">
                <Avatar profile={thread.other} />
                <div style={{ minWidth: 0, textAlign: 'left' }}>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', lineHeight: 1 }}>@{thread.other?.username || 'trader'}</div>
                  <div style={{ color: 'var(--dim)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '4px' }}>
                    {thread.lastMessage ? `${thread.lastMessage.profiles?.username || 'user'}: ${thread.lastMessage.body}` : 'No messages yet. Open the desk.'}
                  </div>
                </div>
              </button>
            ))}
          </section>
        </main>

        <aside className="dm-home-sidebar">
          <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--red)', letterSpacing: '0.14em', marginBottom: '12px' }}>
            QUICK START
          </div>
          <div className="dm-muted" style={{ lineHeight: 1.7 }}>
            Pick a mutual follower, send a message, then jump into camera or screen share inside the DM.
          </div>
          {selectedId && <div className="dm-muted" style={{ marginTop: '18px', color: 'var(--green)' }}>OPENING DESK...</div>}
        </aside>
      </div>
    </div>
  )
}
