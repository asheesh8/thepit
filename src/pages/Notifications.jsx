/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

function timeAgo(value) {
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.max(1, Math.floor(diff / 60000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const TYPE_ICON = { follow: '👤', reaction: '⚡', comment: '💬', callout: '🎯', default: '🔔' }

export default function Notifications({ session }) {
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [dismissed, setDismissed] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('pit_dismissed_notices') || '[]')) }
    catch { return new Set() }
  })

  const dismiss = (id) => {
    setDismissed(prev => {
      const next = new Set(prev)
      next.add(id)
      try { localStorage.setItem('pit_dismissed_notices', JSON.stringify([...next])) } catch {}
      return next
    })
  }

  const dismissAll = () => {
    const ids = items.map(i => i.id)
    setDismissed(prev => {
      const next = new Set([...prev, ...ids])
      try { localStorage.setItem('pit_dismissed_notices', JSON.stringify([...next])) } catch {}
      return next
    })
  }

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const [entryResult, postResult, followResult] = await Promise.all([
      supabase.from('entries').select('id, symbol').eq('user_id', session.user.id).limit(80),
      supabase.from('posts').select('id, body').eq('user_id', session.user.id).limit(80),
      supabase.from('follows')
        .select('follower_id, created_at, profiles!follows_follower_id_fkey(username)')
        .eq('following_id', session.user.id)
        .order('created_at', { ascending: false }).limit(10),
    ])

    const entryIds = entryResult.data?.map(e => e.id) || []
    const postIds  = postResult.data?.map(p => p.id) || []
    const entryById = new Map((entryResult.data || []).map(e => [e.id, e]))
    const postById  = new Map((postResult.data  || []).map(p => [p.id, p]))

    const activityQueries = []
    if (entryIds.length > 0) {
      activityQueries.push(
        supabase.from('reactions').select('entry_id, user_id, type, created_at, profiles(username)').in('entry_id', entryIds).neq('user_id', session.user.id).order('created_at', { ascending: false }).limit(15),
        supabase.from('comments').select('entry_id, user_id, body, created_at, profiles(username)').in('entry_id', entryIds).neq('user_id', session.user.id).order('created_at', { ascending: false }).limit(15),
        supabase.from('callout_threads').select('entry_id, user_id, reason, created_at, profiles(username)').in('entry_id', entryIds).neq('user_id', session.user.id).order('created_at', { ascending: false }).limit(10),
      )
    }
    if (postIds.length > 0) {
      activityQueries.push(
        supabase.from('post_reactions').select('post_id, user_id, type, created_at, profiles(username)').in('post_id', postIds).neq('user_id', session.user.id).order('created_at', { ascending: false }).limit(15),
        supabase.from('post_comments').select('post_id, user_id, body, created_at, profiles(username)').in('post_id', postIds).neq('user_id', session.user.id).order('created_at', { ascending: false }).limit(15),
      )
    }

    const results = await Promise.all(activityQueries)
    const notices = [
      ...(followResult.data || []).map(row => ({
        id: `follow-${row.follower_id}-${row.created_at}`,
        icon: TYPE_ICON.follow,
        actor: row.profiles?.username ? `@${row.profiles.username}` : '@someone',
        text: 'followed you',
        meta: 'CONNECTION',
        href: `/profile/${row.profiles?.username || ''}`,
        created_at: row.created_at,
      })),
    ]

    for (const result of results) {
      for (const row of (result.data || [])) {
        if (row.entry_id) {
          const entry = entryById.get(row.entry_id)
          const isComment = 'body' in row
          const isCallout = 'reason' in row
          notices.push({
            id: `${isComment ? 'ec' : isCallout ? 'ct' : 'er'}-${row.user_id}-${row.created_at}`,
            icon: isComment ? TYPE_ICON.comment : isCallout ? TYPE_ICON.callout : TYPE_ICON.reaction,
            actor: row.profiles?.username ? `@${row.profiles.username}` : '@someone',
            text: isComment ? 'commented on your trade' : isCallout ? 'opened a review on your trade' : `${row.type === 'props' ? 'gave you props on' : 'called out your'} ${entry?.symbol || 'trade'}`,
            meta: entry?.symbol || 'TRADE',
            href: '/feed',
            created_at: row.created_at,
          })
        }
        if (row.post_id) {
          const post = postById.get(row.post_id)
          const isComment = 'body' in row
          notices.push({
            id: `${isComment ? 'pc' : 'pr'}-${row.user_id}-${row.created_at}`,
            icon: isComment ? TYPE_ICON.comment : TYPE_ICON.reaction,
            actor: row.profiles?.username ? `@${row.profiles.username}` : '@someone',
            text: isComment ? 'commented on your post' : `${row.type === 'props' ? 'gave props to' : 'called out'} your post`,
            meta: post?.body ? post.body.slice(0, 24).toUpperCase() : 'POST',
            href: '/feed',
            created_at: row.created_at,
          })
        }
      }
    }

    setItems(notices.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
    setLoading(false)
  }

  const visible = items.filter(i => !dismissed.has(i.id))

  return (
    <div style={{ paddingTop: 'calc(56px + env(safe-area-inset-top, 0px))', minHeight: '100vh' }}>
      <div className="page-shell" style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '3rem', letterSpacing: '0.05em', lineHeight: 1, marginBottom: '4px' }}>NOTIFICATIONS</h1>
            <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', letterSpacing: '0.1em' }}>
              {visible.length} UNREAD
            </p>
          </div>
          {visible.length > 0 && (
            <button onClick={dismissAll} style={{ background: 'none', border: 'none', fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', cursor: 'pointer', letterSpacing: '0.08em' }}>
              CLEAR ALL
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--dim)' }}>LOADING...</div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '2.5rem', color: 'var(--border)', marginBottom: '8px' }}>ALL CLEAR</div>
            <p style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)' }}>NO NEW NOTIFICATIONS</p>
          </div>
        ) : visible.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '22px', flexShrink: 0, marginTop: '2px' }}>{item.icon}</span>
            <Link to={item.href} style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}>
              <div style={{ fontFamily: 'DM Sans', fontSize: '14px', color: 'var(--text)', lineHeight: 1.4 }}>
                <span style={{ fontFamily: 'Space Mono', fontSize: '11px', fontWeight: 700 }}>{item.actor}</span>{' '}
                {item.text}
              </div>
              <div style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)', marginTop: '4px', letterSpacing: '0.06em' }}>
                {item.meta} · {timeAgo(item.created_at)}
              </div>
            </Link>
            <button onClick={() => dismiss(item.id)} style={{ flexShrink: 0, background: 'none', border: 'none', color: 'var(--muted)', fontSize: '18px', cursor: 'pointer', padding: '0 0 0 4px', lineHeight: 1, opacity: 0.6 }}>
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
