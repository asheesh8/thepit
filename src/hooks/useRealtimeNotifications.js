import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useRealtimeNotifications(session, onNotification) {
  const channelRef = useRef(null)
  const userId = session?.user?.id

  const notify = useCallback((n) => {
    if (typeof onNotification === 'function') onNotification(n)
  }, [onNotification])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`notifications:${userId}`)

      // new DM / group message addressed to me
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_room_messages' },
        async (payload) => {
          const msg = payload.new
          if (msg.user_id === userId) return   // my own message

          // check if this room involves me
          const { data: room } = await supabase
            .from('live_rooms')
            .select('id, title, room_type, host_id, dm_peer_id')
            .eq('id', msg.room_id)
            .single()

          if (!room) return
          const isMyRoom = room.host_id === userId || room.dm_peer_id === userId

          if (!isMyRoom) {
            // check group membership
            const { data: membership } = await supabase
              .from('live_room_members')
              .select('room_id')
              .eq('room_id', msg.room_id)
              .eq('user_id', userId)
              .maybeSingle()
            if (!membership) return
          }

          // get sender username
          const { data: sender } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', msg.user_id)
            .single()

          notify({
            type: 'message',
            title: sender?.username ? `@${sender.username}` : 'New message',
            body: msg.body?.slice(0, 80) || '...',
            link: '/rooms',
            roomId: msg.room_id,
          })
        }
      )

      // reaction on one of my entries
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reactions' },
        async (payload) => {
          const reaction = payload.new
          if (reaction.user_id === userId) return

          // check if the entry belongs to me
          const { data: entry } = await supabase
            .from('entries')
            .select('user_id, symbol')
            .eq('id', reaction.entry_id)
            .single()

          if (!entry || entry.user_id !== userId) return

          const { data: reactor } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', reaction.user_id)
            .single()

          const emoji = reaction.type === 'props' ? '🤜' : '⚡'
          notify({
            type: 'reaction',
            title: `${emoji} @${reactor?.username || 'someone'}`,
            body: reaction.type === 'props'
              ? `gave you props on ${entry.symbol}`
              : `called out your ${entry.symbol} trade`,
            link: '/journal',
          })
        }
      )

      // someone started following me
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'follows' },
        async (payload) => {
          const follow = payload.new
          if (follow.following_id !== userId) return

          const { data: follower } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', follow.follower_id)
            .single()

          notify({
            type: 'follow',
            title: `@${follower?.username || 'someone'} followed you`,
            body: 'Check your connections',
            link: '/connections',
          })
        }
      )

      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, notify])
}
