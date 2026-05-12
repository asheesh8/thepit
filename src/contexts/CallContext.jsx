import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import useWebRTCRoom from '../hooks/useWebRTCRoom'

const CallCtx = createContext(null)

export function CallProvider({ session, children }) {
  const [activeRoom, setActiveRoom] = useState(null)   // { id, peerName, peerAvatar }
  const [participants, setParticipants] = useState([])
  const [pending, setPending] = useState([])
  const channelRef = useRef(null)
  const audioKeepaliveRef = useRef(null)

  // sendSignal broadcasts over a dedicated call channel (survives page navigation)
  const sendSignal = useCallback(sig => {
    channelRef.current?.send({ type: 'broadcast', event: 'signal', payload: sig })
  }, [])

  const rtc = useWebRTCRoom({ userId: session.user.id, participants, sendSignal })

  // Keep a stable ref to rtc so async callbacks always see the latest state
  const rtcRef = useRef(rtc)
  useEffect(() => { rtcRef.current = rtc })

  // Open / close the dedicated call channel whenever activeRoom changes
  useEffect(() => {
    if (!activeRoom) {
      if (channelRef.current) {
        channelRef.current.untrack()
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setParticipants([])
      // Stop audio keepalive
      if (audioKeepaliveRef.current) {
        try { audioKeepaliveRef.current.close() } catch { /* ignore */ }
        audioKeepaliveRef.current = null
      }
      return
    }

    // Silent AudioContext loop — keeps iOS audio session alive in background
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx) {
        const ctx = new AudioCtx()
        const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
        const src = ctx.createBufferSource()
        const gain = ctx.createGain()
        gain.gain.value = 0.001
        src.buffer = buf
        src.loop = true
        src.connect(gain)
        gain.connect(ctx.destination)
        src.start()
        audioKeepaliveRef.current = ctx
      }
    } catch { /* AudioContext unavailable */ }

    // MediaSession API — tells the OS "audio is playing" to prevent background kill
    try {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing'
      }
    } catch { /* ignore */ }

    const ch = supabase.channel(`call:${activeRoom.id}`)
    channelRef.current = ch   // set ref BEFORE subscribe so sendSignal works immediately
    ch
      .on('broadcast', { event: 'signal' }, ({ payload }) =>
        setPending(p => [...p, payload])
      )
      .on('presence', { event: 'sync' }, () => {
        const all = Object.values(ch.presenceState()).flat()
        const deduped = [...new Map(all.map(p => [p.user_id, p])).values()]
        setParticipants(deduped)
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await ch.track({ user_id: session.user.id })
          // Re-announce presence if already in a call — handles channel reconnects.
          // The other peer's peer-ready handler will re-initiate if the connection dropped.
          if (rtcRef.current.mediaState.joined) {
            ch.send({
              type: 'broadcast', event: 'signal',
              payload: { kind: 'peer-ready', from: session.user.id },
            })
          }
        }
      })

    return () => {
      ch.untrack()
      supabase.removeChannel(ch)
      channelRef.current = null
    }
  }, [activeRoom?.id, session.user.id])

  // Drain signal queue into the persistent RTC instance.
  // Use rtcRef so we always call the latest handleSignal without adding it as a dep.
  useEffect(() => {
    if (!pending.length) return
    const [next, ...rest] = pending
    setPending(rest)
    rtcRef.current.handleSignal(next)
  }, [pending])

  const startCall = useCallback((roomInfo) => setActiveRoom(roomInfo), [])

  const endCall = useCallback(() => {
    rtc.leaveMedia()
    setActiveRoom(null)
    try {
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none'
    } catch { /* ignore */ }
  }, [rtc])

  return (
    <CallCtx.Provider value={{ activeRoom, rtc, participants, startCall, endCall }}>
      {children}
    </CallCtx.Provider>
  )
}

export const useCall = () => useContext(CallCtx)
