import { useEffect, useRef, useState } from 'react'
import { makePeerSignal } from '../lib/liveRooms'

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
}

export default function useWebRTCRoom({ userId, participants, sendSignal }) {
  const localVideoRef = useRef(null)
  const peersRef = useRef(new Map())
  const localStreamRef = useRef(null)
  const screenStreamRef = useRef(null)
  const cameraTrackRef = useRef(null)
  const screenTrackIdsRef = useRef(new Set())
  const remoteScreenStreamsRef = useRef(new Map())
  const [localStream, setLocalStream] = useState(null)
  const [localScreenStream, setLocalScreenStream] = useState(null)
  const [remoteStreams, setRemoteStreams] = useState([])
  const [mediaState, setMediaState] = useState({ joined: false, mic: true, camera: true, sharing: false, error: '' })

  useEffect(() => {
    return () => leaveMedia()
  }, [])

  // When our media is ready and participants change, try to connect to any new peers
  useEffect(() => {
    if (!mediaState.joined || !localStreamRef.current) return
    participants.forEach(participant => {
      if (participant.user_id && participant.user_id !== userId) {
        callPeer(participant.user_id, false) // non-forced: skip if already connected
      }
    })
  }, [participants, mediaState.joined, userId])

  const attachLocalStream = (stream) => {
    localStreamRef.current = stream
    cameraTrackRef.current = stream.getVideoTracks()[0] || null
    peersRef.current.forEach(peer => addMissingLocalTracks(peer, stream))
    setLocalStream(stream)
    if (localVideoRef.current) localVideoRef.current.srcObject = stream
  }

  const setRemoteStreamType = (peerId, streamId, type) => {
    const next = new Map(remoteScreenStreamsRef.current)
    const current = new Set(next.get(peerId) || [])
    if (type === 'screen') current.add(streamId)
    else current.delete(streamId)
    if (current.size) next.set(peerId, current)
    else next.delete(peerId)
    remoteScreenStreamsRef.current = next
    setRemoteStreams(prev => prev.map(item => (
      item.peerId === peerId && item.stream.id === streamId ? { ...item, type } : item
    )))
  }

  const addMissingLocalTracks = (peer, stream) => {
    const sentTrackIds = new Set(peer.getSenders().map(sender => sender.track?.id).filter(Boolean))
    stream.getTracks().forEach(track => {
      if (!sentTrackIds.has(track.id)) peer.addTrack(track, stream)
    })
  }

  const addScreenTracksToPeer = (peer, stream) => {
    const sentTrackIds = new Set(peer.getSenders().map(sender => sender.track?.id).filter(Boolean))
    stream.getTracks().forEach(track => {
      if (!sentTrackIds.has(track.id)) peer.addTrack(track, stream)
    })
  }

  const announceScreenStream = async (stream, active) => {
    await sendSignal(makePeerSignal({
      kind: active ? 'screen-start' : 'screen-stop',
      from: userId,
      data: { streamId: stream.id },
    }))
  }

  const stopScreenShare = async () => {
    const stream = screenStreamRef.current
    if (!stream) return
    peersRef.current.forEach(peer => {
      peer.getSenders()
        .filter(sender => sender.track && screenTrackIdsRef.current.has(sender.track.id))
        .forEach(sender => peer.removeTrack(sender))
    })
    stream.getTracks().forEach(track => track.stop())
    screenStreamRef.current = null
    screenTrackIdsRef.current = new Set()
    setLocalScreenStream(null)
    setMediaState(prev => ({ ...prev, sharing: false }))
    await announceScreenStream(stream, false)
    for (const participant of participants) {
      if (participant.user_id !== userId) await callPeer(participant.user_id, true)
    }
  }

  // Tear down a peer cleanly and remove its streams
  const closePeer = (peerId) => {
    const peer = peersRef.current.get(peerId)
    if (peer) {
      try { peer.close() } catch (_) {}
      peersRef.current.delete(peerId)
    }
    setRemoteStreams(prev => prev.filter(item => item.peerId !== peerId))
  }

  const getOrCreatePeer = (peerId) => {
    if (peersRef.current.has(peerId)) return peersRef.current.get(peerId)
    const peer = new RTCPeerConnection(rtcConfig)

    peer.onicecandidate = event => {
      if (event.candidate) {
        sendSignal(makePeerSignal({ kind: 'ice-candidate', from: userId, to: peerId, data: event.candidate }))
      }
    }

    peer.ontrack = event => {
      const [stream] = event.streams
      if (!stream) return
      const type = remoteScreenStreamsRef.current.get(peerId)?.has(stream.id) ? 'screen' : 'camera'
      setRemoteStreams(prev => {
        const key = `${peerId}:${stream.id}`
        const without = prev.filter(item => `${item.peerId}:${item.stream.id}` !== key)
        return [...without, { peerId, stream, type, _ts: Date.now() }]
      })
    }

    peer.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(peer.connectionState)) {
        peersRef.current.delete(peerId)
        setRemoteStreams(prev => prev.filter(item => item.peerId !== peerId))
      }
    }

    // Auto-restart ICE if it disconnects transiently
    peer.oniceconnectionstatechange = () => {
      if (peer.iceConnectionState === 'failed') {
        try { peer.restartIce() } catch (_) {}
      }
    }

    const stream = localStreamRef.current
    if (stream) addMissingLocalTracks(peer, stream)
    if (screenStreamRef.current) addScreenTracksToPeer(peer, screenStreamRef.current)
    peersRef.current.set(peerId, peer)
    return peer
  }

  // force=true: always reconnect even if already connected (used on peer-ready)
  // force=false: skip if already in good shape
  const callPeer = async (peerId, force = false) => {
    if (!localStreamRef.current || peerId === userId) return
    const existing = peersRef.current.get(peerId)
    if (existing) {
      if (!force && existing.connectionState === 'connected') return
      closePeer(peerId)
    }
    const peer = getOrCreatePeer(peerId)
    addMissingLocalTracks(peer, localStreamRef.current)
    if (screenStreamRef.current) addScreenTracksToPeer(peer, screenStreamRef.current)
    try {
      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      await sendSignal(makePeerSignal({ kind: 'offer', from: userId, to: peerId, data: offer }))
    } catch (err) {
      console.warn('callPeer error:', err)
    }
  }

  const joinMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      attachLocalStream(stream)
      setMediaState({ joined: true, mic: true, camera: true, sharing: false, error: '' })
      await sendSignal(makePeerSignal({ kind: 'peer-ready', from: userId }))
      for (const participant of participants) {
        if (participant.user_id !== userId) await callPeer(participant.user_id, true)
      }
    } catch (error) {
      setMediaState(prev => ({ ...prev, error: error.message || 'Media permissions failed.' }))
    }
  }

  const leaveMedia = () => {
    screenStreamRef.current?.getTracks().forEach(track => track.stop())
    localStreamRef.current?.getTracks().forEach(track => track.stop())
    peersRef.current.forEach(peer => { try { peer.close() } catch (_) {} })
    peersRef.current.clear()
    localStreamRef.current = null
    screenStreamRef.current = null
    cameraTrackRef.current = null
    screenTrackIdsRef.current = new Set()
    remoteScreenStreamsRef.current = new Map()
    setLocalStream(null)
    setLocalScreenStream(null)
    setRemoteStreams([])
    setMediaState({ joined: false, mic: true, camera: true, sharing: false, error: '' })
    sendSignal(makePeerSignal({ kind: 'peer-left', from: userId }))
  }

  const toggleMic = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0]
    if (!audioTrack) return
    audioTrack.enabled = !audioTrack.enabled
    setMediaState(prev => ({ ...prev, mic: audioTrack.enabled }))
  }

  const toggleCamera = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0]
    if (!videoTrack) return
    videoTrack.enabled = !videoTrack.enabled
    setMediaState(prev => ({ ...prev, camera: videoTrack.enabled }))
  }

  const shareScreen = async () => {
    try {
      if (!localStreamRef.current) await joinMedia()
      if (screenStreamRef.current) {
        await stopScreenShare()
        return
      }
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      screenStreamRef.current = displayStream
      screenTrackIdsRef.current = new Set(displayStream.getTracks().map(track => track.id))
      peersRef.current.forEach(peer => addScreenTracksToPeer(peer, displayStream))
      setLocalScreenStream(displayStream)
      setMediaState(prev => ({ ...prev, sharing: true }))
      await announceScreenStream(displayStream, true)
      for (const participant of participants) {
        if (participant.user_id !== userId) await callPeer(participant.user_id, true)
      }
      const screenTrack = displayStream.getVideoTracks()[0]
      if (screenTrack) screenTrack.onended = () => stopScreenShare()
    } catch (error) {
      setMediaState(prev => ({ ...prev, error: error.message || 'Screenshare failed.' }))
    }
  }

  const handleSignal = async (signal) => {
    if (!signal || signal.from === userId || (signal.to && signal.to !== userId)) return

    if (signal.kind === 'peer-ready') {
      // Force-reset any existing connection so we start fresh
      closePeer(signal.from)
      if (localStreamRef.current) await callPeer(signal.from, true)
      return
    }

    if (signal.kind === 'peer-left') {
      closePeer(signal.from)
      remoteScreenStreamsRef.current.delete(signal.from)
      return
    }

    if (signal.kind === 'screen-start' && signal.data?.streamId) {
      setRemoteStreamType(signal.from, signal.data.streamId, 'screen')
      return
    }
    if (signal.kind === 'screen-stop' && signal.data?.streamId) {
      setRemoteStreamType(signal.from, signal.data.streamId, 'camera')
      setRemoteStreams(prev => prev.filter(item => !(item.peerId === signal.from && item.stream.id === signal.data.streamId)))
      return
    }

    const peer = getOrCreatePeer(signal.from)
    if (signal.kind === 'offer') {
      if (localStreamRef.current) addMissingLocalTracks(peer, localStreamRef.current)
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(signal.data))
        const answer = await peer.createAnswer()
        await peer.setLocalDescription(answer)
        await sendSignal(makePeerSignal({ kind: 'answer', from: userId, to: signal.from, data: answer }))
      } catch (err) {
        console.warn('offer handler error:', err)
      }
    }
    if (signal.kind === 'answer') {
      try { await peer.setRemoteDescription(new RTCSessionDescription(signal.data)) } catch (err) {
        console.warn('answer handler error:', err)
      }
    }
    if (signal.kind === 'ice-candidate') {
      try { await peer.addIceCandidate(new RTCIceCandidate(signal.data)) } catch (_) {}
    }
  }

  return {
    localVideoRef,
    localStream,
    localScreenStream,
    remoteStreams,
    mediaState,
    joinMedia,
    leaveMedia,
    toggleMic,
    toggleCamera,
    shareScreen,
    stopScreenShare,
    handleSignal,
  }
}
