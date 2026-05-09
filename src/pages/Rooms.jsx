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

  const fmtTime = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now - d
    if (diffMs < 60000) return 'just now'
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`
    if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div style={{ paddingTop: 'calc(56px + env(safe-area-inset-top, 0px))', minHeight: '100vh', background: 'var(--black)' }}>
      <div className="messages-shell" style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '280px 1fr', minHeight: 'calc(100vh - 56px)' }}>

        {/* left: contacts */}
        <aside style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'Space Mono', fontSize: '9px', letterSpacing: '0.2em', color: 'var(--dim)', marginBottom: '14px' }}>NEW MESSAGE</div>
            {loading ? (
              <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)' }}>LOADING...</div>
            ) : mutuals.length === 0 ? (
              <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--muted)', lineHeight: 1.8 }}>FOLLOW EACH OTHER TO UNLOCK DMs.</div>
            ) : mutuals.map(user => (
              <button key={user.id} onClick={() => openDm(user)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 10px', background: 'none', border: '1px solid transparent',
                cursor: 'pointer', marginBottom: '2px', transition: 'all 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
              >
                <Avatar profile={user} size={32} />
                <span style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.04em' }}>@{user.username}</span>
              </button>
            ))}
          </div>
          {selectedId && (
            <div style={{ padding: '12px 16px', fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--green)', letterSpacing: '0.1em' }}>
              OPENING DESK...
            </div>
          )}
        </aside>

        {/* right: threads */}
        <main style={{ display: 'flex', flexDirection: 'column' }}>
          {/* header */}
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'Space Mono', fontSize: '9px', letterSpacing: '0.2em', color: 'var(--dim)', marginBottom: '4px' }}>PRIVATE DESK</div>
              <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2.4rem', letterSpacing: '0.06em', lineHeight: 1 }}>MESSAGES</h1>
            </div>
            <span style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.1em' }}>
              {threads.length} THREAD{threads.length !== 1 ? 'S' : ''}
            </span>
          </div>

          {error && (
            <div style={{ margin: '16px 24px', padding: '12px 14px', border: '1px solid var(--gold)', fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--gold)' }}>
              {error}
            </div>
          )}

          {/* thread list */}
          <div style={{ flex: 1, padding: '8px 0' }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)' }}>LOADING...</div>
            ) : threads.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: 'var(--border)', marginBottom: '8px' }}>NO DMs YET</div>
                <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.1em' }}>SELECT A MUTUAL FROM THE LEFT TO START</div>
              </div>
            ) : threads.map(thread => (
              <button
                key={thread.id}
                onClick={() => navigate(`/rooms/${thread.id}`)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '14px 24px', background: 'none', border: 'none',
                  borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  transition: 'background 0.12s', textAlign: 'left',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--dark)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <Avatar profile={thread.other} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', letterSpacing: '0.05em', lineHeight: 1 }}>
                      @{thread.other?.username || 'trader'}
                    </span>
                    <span style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--muted)', letterSpacing: '0.06em', flexShrink: 0 }}>
                      {fmtTime(thread.lastMessage?.created_at || thread.updated_at)}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {thread.lastMessage
                      ? `${thread.lastMessage.profiles?.username === thread.other?.username ? '' : 'You: '}${thread.lastMessage.body}`
                      : 'No messages yet — open the desk.'
                    }
                  </div>
                </div>
                <span style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', flexShrink: 0 }}>→</span>
              </button>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
