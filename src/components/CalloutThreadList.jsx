/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import CalloutComposer from './CalloutComposer'
import CalloutThreadCard from './CalloutThreadCard'

export default function CalloutThreadList({ entry, session }) {
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadThreads()
  }, [entry.id])

  const loadThreads = async () => {
    setLoading(true)
    setError('')
    const { data, error: loadError } = await supabase
      .from('callout_threads')
      .select('*, profiles(username), callout_replies(*, profiles(username))')
      .eq('entry_id', entry.id)
      .order('created_at', { ascending: false })

    if (loadError) setError(loadError.message)
    setThreads(data || [])
    setLoading(false)
  }

  const createThread = async ({ reason, body }) => {
    const { data, error: insertError } = await supabase
      .from('callout_threads')
      .insert({ entry_id: entry.id, user_id: session.user.id, reason, body })
      .select('*, profiles(username), callout_replies(*, profiles(username))')
      .single()
    if (insertError) return { error: insertError.message }
    if (data) setThreads(prev => [data, ...prev])
    return { data }
  }

  const createReply = async (threadId, body) => {
    const { data } = await supabase
      .from('callout_replies')
      .insert({ thread_id: threadId, user_id: session.user.id, body })
      .select('*, profiles(username)')
      .single()
    if (data) {
      setThreads(prev => prev.map(thread => (
        thread.id === threadId
          ? { ...thread, callout_replies: [...(thread.callout_replies || []), data] }
          : thread
      )))
    }
  }

  const toggleResolved = async (thread) => {
    const { data } = await supabase
      .from('callout_threads')
      .update({ is_resolved: !thread.is_resolved, updated_at: new Date().toISOString() })
      .eq('id', thread.id)
      .select('*, profiles(username), callout_replies(*, profiles(username))')
      .single()
    if (data) setThreads(prev => prev.map(row => row.id === data.id ? data : row))
  }

  return (
    <div style={{ marginTop: '16px' }}>
      <CalloutComposer onSubmit={createThread} />
      {loading ? (
        <div style={{ padding: '14px 0', fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)' }}>LOADING CALLOUTS...</div>
      ) : error ? (
        <div style={{ padding: '14px 0', fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--gold)' }}>{error}</div>
      ) : threads.length === 0 ? (
        <div style={{ padding: '14px 0', fontFamily: 'Space Mono', fontSize: '10px', color: 'var(--dim)' }}>NO STRUCTURED CALLOUTS YET.</div>
      ) : (
        threads.map(thread => (
          <CalloutThreadCard
            key={thread.id}
            thread={thread}
            session={session}
            entryUserId={entry.user_id}
            onReply={createReply}
            onToggleResolved={toggleResolved}
          />
        ))
      )}
    </div>
  )
}
