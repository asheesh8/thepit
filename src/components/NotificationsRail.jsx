/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function timeAgo(value) {
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.max(1, Math.floor(diff / 60000))
  if (minutes < 60) return `${minutes}M`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}H`
  return `${Math.floor(hours / 24)}D`
}

function actorName(profile) {
  return profile?.username ? `@${profile.username}` : '@someone'
}

function Notice({ item }) {
  return (
    <Link to={item.href} className="notice-row">
      <div className="notice-avatar">{item.avatar}</div>
      <div style={{ minWidth: 0 }}>
        <div className="notice-copy">
          <span style={{ color: 'var(--text)' }}>{item.actor}</span> {item.text}
        </div>
        <div className="notice-meta">{item.meta} · {timeAgo(item.created_at)}</div>
      </div>
    </Link>
  )
}

export default function NotificationsRail({ session }) {
  const [items, setItems] = useState([])

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadNotifications = async () => {
    const [entryResult, postResult, followResult] = await Promise.all([
      supabase.from('entries').select('id, symbol').eq('user_id', session.user.id).limit(80),
      supabase.from('posts').select('id, body').eq('user_id', session.user.id).limit(80),
      supabase
        .from('follows')
        .select('follower_id, created_at, profiles!follows_follower_id_fkey(username)')
        .eq('following_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(8),
    ])

    const entryIds = entryResult.data?.map(entry => entry.id) || []
    const postIds = postResult.data?.map(post => post.id) || []
    const entryById = new Map((entryResult.data || []).map(entry => [entry.id, entry]))
    const postById = new Map((postResult.data || []).map(post => [post.id, post]))

    const activityQueries = []
    if (entryIds.length > 0) {
      activityQueries.push(
        supabase
          .from('reactions')
          .select('entry_id, user_id, type, created_at, profiles(username)')
          .in('entry_id', entryIds)
          .neq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('comments')
          .select('entry_id, user_id, body, created_at, profiles(username)')
          .in('entry_id', entryIds)
          .neq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('callout_threads')
          .select('entry_id, user_id, reason, created_at, profiles(username)')
          .in('entry_id', entryIds)
          .neq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(10)
      )
    }

    if (postIds.length > 0) {
      activityQueries.push(
        supabase
          .from('post_reactions')
          .select('post_id, user_id, type, created_at, profiles(username)')
          .in('post_id', postIds)
          .neq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('post_comments')
          .select('post_id, user_id, body, created_at, profiles(username)')
          .in('post_id', postIds)
          .neq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(10)
      )
    }

    const activityResults = await Promise.all(activityQueries)
    const notices = [
      ...(followResult.data || []).map(row => ({
        id: `follow-${row.follower_id}-${row.created_at}`,
        actor: actorName(row.profiles),
        avatar: 'F',
        text: 'followed you',
        meta: 'CONNECTION',
        href: `/profile/${row.profiles?.username || ''}`,
        created_at: row.created_at,
      })),
    ]

    for (const result of activityResults) {
      for (const row of (result.data || [])) {
        if (row.entry_id) {
          const entry = entryById.get(row.entry_id)
          const isComment = Object.hasOwn(row, 'body')
          const isCallout = Object.hasOwn(row, 'reason')
          notices.push({
            id: `${isComment ? 'entry-comment' : isCallout ? 'callout' : 'entry-reaction'}-${row.user_id}-${row.created_at}`,
            actor: actorName(row.profiles),
            avatar: isComment ? 'C' : isCallout ? 'R' : 'P',
            text: isComment ? 'commented on your trade' : isCallout ? 'opened a review thread' : `${row.type === 'callout' ? 'called out' : 'gave props to'} your trade`,
            meta: entry?.symbol || 'TRADE',
            href: '/feed',
            created_at: row.created_at,
          })
        }

        if (row.post_id) {
          const post = postById.get(row.post_id)
          const isComment = Object.hasOwn(row, 'body')
          notices.push({
            id: `${isComment ? 'post-comment' : 'post-reaction'}-${row.user_id}-${row.created_at}`,
            actor: actorName(row.profiles),
            avatar: isComment ? 'C' : 'P',
            text: isComment ? 'commented on your post' : `${row.type === 'callout' ? 'called out' : 'gave props to'} your post`,
            meta: post?.body ? post.body.slice(0, 18).toUpperCase() : 'POST',
            href: '/feed',
            created_at: row.created_at,
          })
        }
      }
    }

    setItems(notices.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 12))
  }

  return (
    <aside className="notifications-rail">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--red)', letterSpacing: '0.14em' }}>NOTIFICATIONS</div>
        <span style={{ fontFamily: 'Space Mono', fontSize: '9px', color: 'var(--dim)' }}>{items.length}</span>
      </div>

      {items.length === 0 ? (
        <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)', lineHeight: 1.5 }}>
          QUIET RIGHT NOW.
        </div>
      ) : items.map(item => <Notice key={item.id} item={item} />)}
    </aside>
  )
}
