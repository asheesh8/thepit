import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import EntryCard from '../components/EntryCard'

const CATEGORIES = ['mentorship', 'psychology', 'strategy', 'tools', 'other']
const CATEGORY_COLORS = {
  mentorship: '#e63946', psychology: '#f4a261', strategy: '#2ec4b6',
  tools: '#888880', other: '#444440'
}

export default function Profile({ session }) {
  const { username } = useParams()
  const [profile, setProfile] = useState(null)
  const [entries, setEntries] = useState([])
  const [resources, setResources] = useState([])
  const [isOwn, setIsOwn] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [tab, setTab] = useState('trades') // trades | resources
  const [loading, setLoading] = useState(true)

  // resource form
  const [showAddResource, setShowAddResource] = useState(false)
  const [newResource, setNewResource] = useState({ title: '', url: '', category: 'mentorship' })

  useEffect(() => {
    loadProfile()
  }, [username])

  const loadProfile = async () => {
    setLoading(true)

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()

    if (!prof) { setLoading(false); return }
    setProfile(prof)
    setIsOwn(prof.id === session.user.id)

    // check following
    const { data: followData } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', session.user.id)
      .eq('following_id', prof.id)
      .single()
    setIsFollowing(!!followData)

    // follower count
    const { count } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', prof.id)
    setFollowerCount(count || 0)

    // public entries
    const { data: entriesData } = await supabase
      .from('entries')
      .select('*, profiles(username), reactions(type, user_id)')
      .eq('user_id', prof.id)
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    const processed = (entriesData || []).map(entry => ({
      ...entry,
      props_count: entry.reactions?.filter(r => r.type === 'props').length || 0,
      callout_count: entry.reactions?.filter(r => r.type === 'callout').length || 0,
      user_reaction: entry.reactions?.find(r => r.user_id === session.user.id)?.type || null,
    }))
    setEntries(processed)

    // resources
    const { data: resData } = await supabase
      .from('resources')
      .select('*')
      .eq('user_id', prof.id)
      .order('sort_order', { ascending: true })
    setResources(resData || [])

    setLoading(false)
  }

  const handleFollow = async () => {
    if (isFollowing) {
      await supabase.from('follows').delete().match({ follower_id: session.user.id, following_id: profile.id })
      setIsFollowing(false)
      setFollowerCount(c => c - 1)
    } else {
      await supabase.from('follows').insert({ follower_id: session.user.id, following_id: profile.id })
      setIsFollowing(true)
      setFollowerCount(c => c + 1)
    }
  }

  const addResource = async (e) => {
    e.preventDefault()
    const { data } = await supabase.from('resources').insert({
      user_id: session.user.id,
      title: newResource.title,
      url: newResource.url,
      category: newResource.category,
      sort_order: resources.length,
    }).select().single()
    if (data) setResources(prev => [...prev, data])
    setNewResource({ title: '', url: '', category: 'mentorship' })
    setShowAddResource(false)
  }

  const deleteResource = async (id) => {
    await supabase.from('resources').delete().eq('id', id)
    setResources(prev => prev.filter(r => r.id !== id))
  }

  if (loading) return <div style={{ paddingTop: '100px', textAlign: 'center', fontFamily: 'Space Mono', fontSize: '11px', color: '#444440' }}>LOADING...</div>
  if (!profile) return <div style={{ paddingTop: '100px', textAlign: 'center', fontFamily: 'Space Mono', fontSize: '11px', color: '#e63946' }}>USER NOT FOUND</div>

  return (
    <div style={{ paddingTop: '56px', minHeight: '100vh' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 24px' }}>

        {/* profile header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '3.5rem', letterSpacing: '0.05em', lineHeight: 1 }}>
                @{profile.username}
              </h1>
              <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: '#444440', letterSpacing: '0.1em', marginTop: '4px' }}>
                {followerCount} FOLLOWERS · {entries.length} PUBLIC TRADES
              </div>
            </div>
            {!isOwn && (
              <button onClick={handleFollow} className={`btn ${isFollowing ? '' : 'btn-red'}`} style={{ padding: '10px 20px', fontSize: '11px' }}>
                {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
              </button>
            )}
          </div>

          {profile.bio && (
            <p style={{ fontSize: '14px', color: '#888880', lineHeight: 1.7 }}>{profile.bio}</p>
          )}
        </div>

        {/* tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #242424', marginBottom: '24px' }}>
          {[['trades', 'TRADES'], ['resources', 'RESOURCE LIBRARY']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Space Mono', fontSize: '10px', letterSpacing: '0.08em',
              color: tab === key ? '#e8e8e0' : '#444440',
              borderBottom: tab === key ? '1px solid #e63946' : '1px solid transparent',
              marginBottom: '-1px',
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* trades tab */}
        {tab === 'trades' && (
          entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#2a2a2a' }}>NO PUBLIC TRADES</div>
            </div>
          ) : entries.map(entry => (
            <EntryCard key={entry.id} entry={entry} session={session} />
          ))
        )}

        {/* resources tab */}
        {tab === 'resources' && (
          <div>
            {isOwn && (
              <button onClick={() => setShowAddResource(!showAddResource)} className="btn btn-red" style={{ marginBottom: '20px', padding: '10px 20px', fontSize: '11px' }}>
                + ADD RESOURCE
              </button>
            )}

            {showAddResource && (
              <form onSubmit={addResource} className="card" style={{ padding: '20px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontFamily: 'Space Mono', fontSize: '10px', color: '#888880', display: 'block', marginBottom: '6px' }}>TITLE</label>
                  <input value={newResource.title} onChange={e => setNewResource(p => ({ ...p, title: e.target.value }))}
                    placeholder="ICT 2022 Mentorship" required
                    style={{ width: '100%', background: '#111', border: '1px solid #242424', padding: '10px 12px', color: '#e8e8e0', fontSize: '13px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontFamily: 'Space Mono', fontSize: '10px', color: '#888880', display: 'block', marginBottom: '6px' }}>URL</label>
                  <input value={newResource.url} onChange={e => setNewResource(p => ({ ...p, url: e.target.value }))}
                    placeholder="https://youtube.com/..." required type="url"
                    style={{ width: '100%', background: '#111', border: '1px solid #242424', padding: '10px 12px', color: '#e8e8e0', fontSize: '13px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontFamily: 'Space Mono', fontSize: '10px', color: '#888880', display: 'block', marginBottom: '6px' }}>CATEGORY</label>
                  <select value={newResource.category} onChange={e => setNewResource(p => ({ ...p, category: e.target.value }))}
                    style={{ width: '100%', background: '#111', border: '1px solid #242424', padding: '10px 12px', color: '#e8e8e0', fontSize: '13px', outline: 'none' }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                  </select>
                </div>
                <button type="submit" className="btn btn-green" style={{ padding: '10px', fontSize: '11px' }}>SAVE RESOURCE</button>
              </form>
            )}

            {resources.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', fontFamily: 'Space Mono', fontSize: '11px', color: '#444440' }}>
                {isOwn ? 'ADD THE RESOURCES THAT SHAPED YOUR TRADING' : 'NO RESOURCES SHARED YET'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {resources.map(r => (
                  <div key={r.id} className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <a href={r.url} target="_blank" rel="noopener noreferrer"
                        style={{ fontFamily: 'DM Sans', fontSize: '14px', color: '#e8e8e0', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                        {r.title} ↗
                      </a>
                      <span className="tag" style={{ color: CATEGORY_COLORS[r.category], fontSize: '9px' }}>
                        {r.category.toUpperCase()}
                      </span>
                    </div>
                    {isOwn && (
                      <button onClick={() => deleteResource(r.id)} style={{
                        background: 'none', border: 'none', color: '#444440', cursor: 'pointer',
                        fontFamily: 'Space Mono', fontSize: '10px', padding: '4px 8px',
                      }}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
