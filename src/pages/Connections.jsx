/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

export default function Connections({ session }) {
  const [tab, setTab] = useState('followers')
  const [followers, setFollowers] = useState([])
  const [following, setFollowing] = useState([])
  const [loading, setLoading] = useState(true)
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    loadConnections()
  }, [])

  const loadConnections = async () => {
    setLoading(true)

    // people who follow me
    const { data: followerData } = await supabase
      .from('follows')
      .select('follower_id, profiles!follows_follower_id_fkey(id, username, bio)')
      .eq('following_id', session.user.id)

    // people i follow
    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id, profiles!follows_following_id_fkey(id, username, bio)')
      .eq('follower_id', session.user.id)

    setFollowers(followerData?.map(f => f.profiles) || [])
    setFollowing(followingData?.map(f => f.profiles) || [])

    // suggestions: followers of people i follow, that i don't follow yet
    const followingIds = followingData?.map(f => f.following_id) || []
    if (followingIds.length > 0) {
      const { data: suggestData } = await supabase
        .from('follows')
        .select('following_id, profiles!follows_following_id_fkey(id, username, bio)')
        .in('follower_id', followingIds)
        .neq('following_id', session.user.id)
        .limit(10)

      const alreadyFollowing = new Set(followingIds)
      const unique = []
      const seen = new Set()
      for (const s of (suggestData || [])) {
        if (!alreadyFollowing.has(s.following_id) && !seen.has(s.following_id)) {
          unique.push(s.profiles)
          seen.add(s.following_id)
        }
      }
      // If social-graph suggestions are sparse, pad with newest users
      if (unique.length < 5) {
        const alreadySeen = new Set([...alreadyFollowing, ...unique.map(u => u.id), session.user.id])
        const { data: newest } = await supabase
          .from('profiles')
          .select('id, username, bio')
          .not('id', 'in', `(${[...alreadySeen].join(',')})`)
          .order('created_at', { ascending: false })
          .limit(5 - unique.length)
        unique.push(...(newest || []))
      }
      setSuggestions(unique.slice(0, 5))
    } else {
      // Not following anyone yet — show newest traders
      const { data: newest } = await supabase
        .from('profiles')
        .select('id, username, bio')
        .neq('id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(8)
      setSuggestions(newest || [])
    }

    setLoading(false)
  }

  const handleUnfollow = async (userId) => {
    await supabase.from('follows').delete().match({ follower_id: session.user.id, following_id: userId })
    setFollowing(prev => prev.filter(u => u.id !== userId))
  }

  const handleFollow = async (user) => {
    await supabase.from('follows').insert({ follower_id: session.user.id, following_id: user.id })
    setFollowing(prev => [...prev, user])
    setSuggestions(prev => prev.filter(u => u.id !== user.id))
  }

  const UserRow = ({ user, action }) => (
    <div className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <Link to={`/profile/${user.username}`} style={{ flex: 1 }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', letterSpacing: '0.05em' }}>@{user.username}</div>
        {user.bio && <div style={{ fontFamily: 'DM Sans', fontSize: '12px', color: '#888880', marginTop: '2px' }}>{user.bio}</div>}
      </Link>
      {action}
    </div>
  )

  const followingIds = new Set(following.map(u => u.id))

  return (
    <div style={{ paddingTop: 'calc(56px + env(safe-area-inset-top, 0px))', minHeight: '100vh' }}>
      <div className="page-shell connections-shell" style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 24px' }}>

        <h1 style={{ fontSize: '3rem', letterSpacing: '0.05em', marginBottom: '4px' }}>CONNECTIONS</h1>
        <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: '#444440', letterSpacing: '0.1em', marginBottom: '32px' }}>
          {followers.length} FOLLOWERS · {following.length} FOLLOWING
        </p>

        {/* tabs */}
        <div className="mobile-tabs" style={{ display: 'flex', borderBottom: '1px solid #242424', marginBottom: '24px' }}>
          {[['followers', `FOLLOWERS (${followers.length})`], ['following', `FOLLOWING (${following.length})`], ['suggestions', 'SUGGESTED']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Space Mono', fontSize: '10px', letterSpacing: '0.08em',
              color: tab === key ? '#e8e8e0' : '#444440',
              borderBottom: tab === key ? '1px solid #e63946' : '1px solid transparent',
              marginBottom: '-1px',
            }}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', fontFamily: 'Space Mono', fontSize: '11px', color: '#444440' }}>LOADING...</div>
        ) : (
          <>
            {tab === 'followers' && (
              followers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#2a2a2a', marginBottom: '8px' }}>NO FOLLOWERS YET</div>
                  <p style={{ fontFamily: 'Space Mono', fontSize: '11px', color: '#444440' }}>POST TRADES AND PEOPLE WILL FIND YOU</p>
                </div>
              ) : followers.map(user => (
                <UserRow key={user.id} user={user} action={
                  !followingIds.has(user.id) ? (
                    <button onClick={() => handleFollow(user)} className="btn btn-red" style={{ padding: '6px 14px', fontSize: '10px' }}>
                      FOLLOW BACK
                    </button>
                  ) : (
                    <span style={{ fontFamily: 'Space Mono', fontSize: '10px', color: '#444440' }}>FOLLOWING</span>
                  )
                } />
              ))
            )}

            {tab === 'following' && (
              following.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#2a2a2a', marginBottom: '8px' }}>NOT FOLLOWING ANYONE</div>
                  <Link to="/search" className="btn btn-red" style={{ display: 'inline-flex', padding: '10px 20px', fontSize: '11px', marginTop: '12px' }}>FIND TRADERS</Link>
                </div>
              ) : following.map(user => (
                <UserRow key={user.id} user={user} action={
                  <button onClick={() => handleUnfollow(user.id)} className="btn" style={{ padding: '6px 14px', fontSize: '10px', color: '#444440' }}>
                    UNFOLLOW
                  </button>
                } />
              ))
            )}

            {tab === 'suggestions' && (
              suggestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#2a2a2a', marginBottom: '8px' }}>NO SUGGESTIONS YET</div>
                  <p style={{ fontFamily: 'Space Mono', fontSize: '11px', color: '#444440' }}>FOLLOW MORE TRADERS TO GET SUGGESTIONS</p>
                </div>
              ) : suggestions.map(user => (
                <UserRow key={user.id} user={user} action={
                  <button onClick={() => handleFollow(user)} className="btn btn-red" style={{ padding: '6px 14px', fontSize: '10px' }}>
                    FOLLOW
                  </button>
                } />
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}
