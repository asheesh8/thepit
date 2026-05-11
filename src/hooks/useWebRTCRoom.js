import { useEffect, useRef, useState } from 'react'
import { makePeerSignal } from '../lib/liveRooms'

const rtcConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

export default function useWebRTCRoom({ userId, participants, sendSignal }) {
  const localVideoRef = useRef(null)
  const peersRef = useRef(new Map())
  const localStreamRef = useRef(null)
  const cameraTrackRef = useRef(null)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStreams, setRemoteStreams] = useState([])
  const [mediaState, setMediaState] = useState({ joined: false, mic: true, camera: true, sharing: false, error: '' })

  useEffect(() => {
    return () => leaveMedia()
  }, [])

  useEffect(() => {
    if (!mediaState.joined || !localStreamRef.current) return
    participants.forEach(participant => {
      if (participant.user_id && participant.user_id !== userId) callPeer(participant.user_id)
    })
  }, [participants, mediaState.joined, userId])

  const attachLocalStream = (stream) => {
    localStreamRef.current = stream
    cameraTrackRef.current = stream.getVideoTracks()[0] || null
    peersRef.current.forEach(peer => addMissingLocalTracks(peer, stream))
    setLocalStream(stream)
    if (localVideoRef.current) localVideoRef.current.srcObject = stream
  }

  const addMissingLocalTracks = (peer, stream) => {
    const sentTrackIds = new Set(peer.getSenders().map(sender => sender.track?.id).filter(Boolean))
    stream.getTracks().forEach(track => {
      if (!sentTrackIds.has(track.id)) peer.addTrack(track, stream)
    })
  }

  const replaceVideoTrack = (track) => {
    peersRef.current.forEach(peer => {
      const sender = peer.getSenders().find(item => item.track?.kind === 'video')
      if (sender) sender.replaceTrack(track)
    })
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
      setRemoteStreams(prev => {
        const without = prev.filter(item => item.peerId !== peerId)
        return [...without, { peerId, stream }]
      })
    }

    peer.onconnectionstatechange = () => {
      if (['failed', 'disconnected', 'closed'].includes(peer.connectionState)) {
        peersRef.current.delete(peerId)
        setRemoteStreams(prev => prev.filter(item => item.peerId !== peerId))
      }
    }

    const stream = localStreamRef.current
    if (stream) addMissingLocalTracks(peer, stream)
    peersRef.current.set(peerId, peer)
    return peer
  }

  const callPeer = async (peerId) => {
    if (!localStreamRef.current || peerId === userId) return
    const peer = getOrCreatePeer(peerId)
    if (peer.signalingState !== 'stable') return
    addMissingLocalTracks(peer, localStreamRef.current)
    const offer = await peer.createOffer()
    await peer.setLocalDescription(offer)
    await sendSignal(makePeerSignal({ kind: 'offer', from: userId, to: peerId, data: offer }))
  }

  const joinMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      attachLocalStream(stream)
      setMediaState({ joined: true, mic: true, camera: true, sharing: false, error: '' })
      await sendSignal(makePeerSignal({ kind: 'peer-ready', from: userId }))
      for (const participant of participants) {
        if (participant.user_id !== userId) await callPeer(participant.user_id)
      }
    } catch (error) {
      setMediaState(prev => ({ ...prev, error: error.message || 'Media permissions failed.' }))
    }
  }

  const leaveMedia = () => {
    localStreamRef.current?.getTracks().forEach(track => track.stop())
    peersRef.current.forEach(peer => peer.close())
    peersRef.current.clear()
    localStreamRef.current = null
    cameraTrackRef.current = null
    setLocalStream(null)
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
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      const screenTrack = displayStream.getVideoTracks()[0]
      const currentVideo = localStreamRef.current?.getVideoTracks()[0]
      replaceVideoTrack(screenTrack)
      if (currentVideo) localStreamRef.current.removeTrack(currentVideo)
      localStreamRef.current.addTrack(screenTrack)
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()))
      setMediaState(prev => ({ ...prev, sharing: true }))
      screenTrack.onended = () => {
        const cameraTrack = cameraTrackRef.current
        if (cameraTrack && localStreamRef.current) {
          localStreamRef.current.removeTrack(screenTrack)
          localStreamRef.current.addTrack(cameraTrack)
          replaceVideoTrack(cameraTrack)
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()))
        }
        setMediaState(prev => ({ ...prev, sharing: false, camera: !!cameraTrack && cameraTrack.enabled }))
      }
    } catch (error) {
      setMediaState(prev => ({ ...prev, error: error.message || 'Screenshare failed.' }))
    }
  }

  const handleSignal = async (signal) => {
    if (!signal || signal.from === userId || (signal.to && signal.to !== userId)) return
    if (signal.kind === 'peer-ready' && localStreamRef.current) {
      await callPeer(signal.from)
      return
    }
    if (signal.kind === 'peer-left') {
      peersRef.current.get(signal.from)?.close()
      peersRef.current.delete(signal.from)
      setRemoteStreams(prev => prev.filter(item => item.peerId !== signal.from))
      return
    }

    const peer = getOrCreatePeer(signal.from)
    if (signal.kind === 'offer') {
      if (localStreamRef.current) addMissingLocalTracks(peer, localStreamRef.current)
      await peer.setRemoteDescription(new RTCSessionDescription(signal.data))
      const answer = await peer.createAnswer()
      await peer.setLocalDescription(answer)
      await sendSignal(makePeerSignal({ kind: 'answer', from: userId, to: signal.from, data: answer }))
    }
    if (signal.kind === 'answer') {
      await peer.setRemoteDescription(new RTCSessionDescription(signal.data))
    }
    if (signal.kind === 'ice-candidate') {
      await peer.addIceCandidate(new RTCIceCandidate(signal.data))
    }
  }

  return {
    localVideoRef,
    localStream,
    remoteStreams,
    mediaState,
    joinMedia,
    leaveMedia,
    toggleMic,
    toggleCamera,
    shareScreen,
    handleSignal,
  }
}
