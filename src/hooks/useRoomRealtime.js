/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { createRoomChannelName } from '../lib/liveRooms'

export default function useRoomRealtime({ roomId, userId, onSignal, onRefresh }) {
  const channelRef = useRef(null)
  const [participants, setParticipants] = useState([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!roomId || !userId) return
    const channel = supabase.channel(createRoomChannelName(roomId), {
      config: { presence: { key: userId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        // Deduplicate by user_id — stale presence entries can accumulate on reconnects
        const seen = new Set()
        const unique = Object.values(state).flat().filter(p => {
          if (!p.user_id || seen.has(p.user_id)) return false
          seen.add(p.user_id)
          return true
        })
        setParticipants(unique)
      })
      .on('broadcast', { event: 'signal' }, payload => onSignal?.(payload.payload))
      .on('broadcast', { event: 'room-refresh' }, payload => onRefresh?.(payload.payload))
      .subscribe(async status => {
        setConnected(status === 'SUBSCRIBED')
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId, joined_at: new Date().toISOString() })
          channel.send({ type: 'broadcast', event: 'signal', payload: { kind: 'peer-ready', from: userId } })
        }
      })

    channelRef.current = channel

    return () => {
      channel.untrack()
      channel.send({ type: 'broadcast', event: 'signal', payload: { kind: 'peer-left', from: userId } })
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [roomId, userId])

  const sendSignal = async (payload) => {
    await channelRef.current?.send({ type: 'broadcast', event: 'signal', payload })
  }

  const broadcastRefresh = async (payload) => {
    await channelRef.current?.send({ type: 'broadcast', event: 'room-refresh', payload })
  }

  return { participants, connected, sendSignal, broadcastRefresh }
}
