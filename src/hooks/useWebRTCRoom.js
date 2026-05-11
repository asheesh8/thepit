/* eslint-disable react-hooks/exhaustive-deps */
/**
 * useWebRTCRoom — Perfect-Negotiation WebRTC hook
 *
 * Key design decisions
 * ────────────────────
 * 1. ONLY ONE side initiates an offer between any two peers.
 *    The peer with the *lower* userId always starts, using this rule in both
 *    the participants effect AND the peer-ready handler.  This eliminates the
 *    "glare" (simultaneous offers) problem in normal operation.
 *
 * 2. Perfect Negotiation (RFC 8829 §4.1.1) as a safety net.
 *    If glare somehow still occurs (e.g. simultaneous joins):
 *      • "polite" peer (lower userId) rolls back its own offer and accepts
 *        the incoming one.
 *      • "impolite" peer ignores the incoming offer and waits for its answer.
 *
 * 3. onnegotiationneeded drives ALL offer creation.
 *    We never call createOffer() manually.  Adding/removing tracks fires
 *    onnegotiationneeded automatically, which handles both initial calls
 *    and screen-share renegotiation without recreating peers.
 *
 * 4. joinMedia() does NOT call peers.
 *    It sets joined=true (which fires the participants useEffect) and sends
 *    peer-ready.  The participants effect + peer-ready handler take care of
 *    establishing connections without duplication.
 */
import { useEffect, useRef, useState } from 'react'
import { makePeerSignal } from '../lib/liveRooms'

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
}

export default function useWebRTCRoom({ userId, participants, sendSignal }) {
  const localVideoRef       = useRef(null)
  const peersRef            = useRef(new Map())     // peerId → RTCPeerConnection
  const localStreamRef      = useRef(null)
  const screenStreamRef     = useRef(null)
  const cameraTrackRef      = useRef(null)
  const screenTrackIdsRef   = useRef(new Set())
  const remoteScreenStreams  = useRef(new Map())     // peerId → Set<streamId>
  const makingOfferRef      = useRef(new Map())     // peerId → bool
  const ignoreOfferRef      = useRef(new Map())     // peerId → bool

  const [localStream,       setLocalStream]       = useState(null)
  const [localScreenStream, setLocalScreenStream] = useState(null)
  const [remoteStreams,     setRemoteStreams]      = useState([])
  const [mediaState,        setMediaState]        = useState({
    joined: false, mic: true, camera: true, sharing: false, error: '',
  })

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => leaveMedia(), [])

  // ── Connect to newly-discovered peers ────────────────────────────────────
  // Only the peer with the *lower* userId initiates to avoid simultaneous offers.
  useEffect(() => {
    if (!mediaState.joined || !localStreamRef.current) return
    for (const p of participants) {
      if (!p.user_id || p.user_id === userId) continue
      if (userId >= p.user_id) continue              // other side will initiate
      const existing = peersRef.current.get(p.user_id)
      if (existing && !['failed', 'closed'].includes(existing.connectionState)) continue
      _connectToPeer(p.user_id)
    }
  }, [participants, mediaState.joined])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isPolite = (peerId) => userId < peerId      // polite = rolls back on collision

  const _addMissingTracks = (peer, stream) => {
    const sent = new Set(peer.getSenders().map(s => s.track?.id).filter(Boolean))
    for (const track of stream.getTracks()) {
      if (!sent.has(track.id)) peer.addTrack(track, stream)
    }
  }

  const _closePeer = (peerId) => {
    const peer = peersRef.current.get(peerId)
    if (peer) { try { peer.close() } catch (_) {} peersRef.current.delete(peerId) }
    setRemoteStreams(prev => prev.filter(r => r.peerId !== peerId))
  }

  const _getOrCreatePeer = (peerId) => {
    if (peersRef.current.has(peerId)) return peersRef.current.get(peerId)

    const peer = new RTCPeerConnection(RTC_CONFIG)

    // ── Perfect Negotiation: onnegotiationneeded creates all offers ─────
    peer.onnegotiationneeded = async () => {
      try {
        makingOfferRef.current.set(peerId, true)
        await peer.setLocalDescription()           // browser creates offer automatically
        await sendSignal(makePeerSignal({
          kind: 'offer', from: userId, to: peerId, data: peer.localDescription,
        }))
      } catch (err) {
        console.warn('[rtc] onnegotiationneeded:', peerId, err.message)
      } finally {
        makingOfferRef.current.set(peerId, false)
      }
    }

    peer.onicecandidate = ({ candidate }) => {
      if (candidate) {
        sendSignal(makePeerSignal({ kind: 'ice-candidate', from: userId, to: peerId, data: candidate }))
      }
    }

    peer.ontrack = ({ streams }) => {
      const stream = streams[0]
      if (!stream) return
      const type = remoteScreenStreams.current.get(peerId)?.has(stream.id) ? 'screen' : 'camera'
      setRemoteStreams(prev => {
        const key = `${peerId}:${stream.id}`
        return [...prev.filter(r => `${r.peerId}:${r.stream.id}` !== key), { peerId, stream, type, _ts: Date.now() }]
      })
    }

    peer.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(peer.connectionState)) {
        peersRef.current.delete(peerId)
        setRemoteStreams(prev => prev.filter(r => r.peerId !== peerId))
      }
    }

    peer.oniceconnectionstatechange = () => {
      if (peer.iceConnectionState === 'failed') {
        try { peer.restartIce() } catch (_) {}
      }
    }

    peersRef.current.set(peerId, peer)
    return peer
  }

  /**
   * Ensure we have a peer connection to `peerId` and our local tracks are on it.
   * onnegotiationneeded fires automatically after addTrack and sends the offer.
   */
  const _connectToPeer = (peerId) => {
    if (!localStreamRef.current || peerId === userId) return
    const peer = _getOrCreatePeer(peerId)
    _addMissingTracks(peer, localStreamRef.current)
    if (screenStreamRef.current) _addMissingTracks(peer, screenStreamRef.current)
  }

  // ── Public API ────────────────────────────────────────────────────────────
  const joinMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      localStreamRef.current = stream
      cameraTrackRef.current = stream.getVideoTracks()[0] || null
      // Attach to any pre-existing peer connections (e.g. reconnecting)
      peersRef.current.forEach(peer => _addMissingTracks(peer, stream))
      setLocalStream(stream)
      if (localVideoRef.current) localVideoRef.current.srcObject = stream
      setMediaState({ joined: true, mic: true, camera: true, sharing: false, error: '' })
      // Announce readiness — the participants effect and peer-ready handler handle connections.
      // We intentionally do NOT loop here; that would create offers simultaneously with peer-ready.
      await sendSignal(makePeerSignal({ kind: 'peer-ready', from: userId }))
    } catch (err) {
      setMediaState(prev => ({ ...prev, error: err.message || 'Camera / mic permission denied.' }))
    }
  }

  const leaveMedia = () => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    peersRef.current.forEach(peer => { try { peer.close() } catch (_) {} })
    peersRef.current.clear()
    makingOfferRef.current.clear()
    ignoreOfferRef.current.clear()
    localStreamRef.current    = null
    screenStreamRef.current   = null
    cameraTrackRef.current    = null
    screenTrackIdsRef.current = new Set()
    remoteScreenStreams.current = new Map()
    setLocalStream(null)
    setLocalScreenStream(null)
    setRemoteStreams([])
    setMediaState({ joined: false, mic: true, camera: true, sharing: false, error: '' })
    sendSignal(makePeerSignal({ kind: 'peer-left', from: userId }))
  }

  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setMediaState(prev => ({ ...prev, mic: track.enabled }))
  }

  const toggleCamera = () => {
    const track = localStreamRef.current?.getVideoTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setMediaState(prev => ({ ...prev, camera: track.enabled }))
  }

  const shareScreen = async () => {
    try {
      if (!localStreamRef.current) await joinMedia()
      if (screenStreamRef.current) { await _stopScreenShare(); return }
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      screenStreamRef.current   = display
      screenTrackIdsRef.current = new Set(display.getTracks().map(t => t.id))
      // Adding tracks to existing peers fires onnegotiationneeded → renegotiation
      peersRef.current.forEach(peer => _addMissingTracks(peer, display))
      setLocalScreenStream(display)
      setMediaState(prev => ({ ...prev, sharing: true }))
      await sendSignal(makePeerSignal({ kind: 'screen-start', from: userId, data: { streamId: display.id } }))
      const videoTrack = display.getVideoTracks()[0]
      if (videoTrack) videoTrack.onended = () => _stopScreenShare()
    } catch (err) {
      setMediaState(prev => ({ ...prev, error: err.message || 'Screenshare failed.' }))
    }
  }

  const _stopScreenShare = async () => {
    const stream = screenStreamRef.current
    if (!stream) return
    // Removing tracks fires onnegotiationneeded → renegotiation (no peer close/reopen needed)
    peersRef.current.forEach(peer => {
      peer.getSenders()
        .filter(s => s.track && screenTrackIdsRef.current.has(s.track.id))
        .forEach(s => { try { peer.removeTrack(s) } catch (_) {} })
    })
    stream.getTracks().forEach(t => t.stop())
    await sendSignal(makePeerSignal({ kind: 'screen-stop', from: userId, data: { streamId: stream.id } }))
    screenStreamRef.current   = null
    screenTrackIdsRef.current = new Set()
    setLocalScreenStream(null)
    setMediaState(prev => ({ ...prev, sharing: false }))
  }

  const handleSignal = async (signal) => {
    if (!signal) return
    if (signal.from === userId) return                          // own signal
    if (signal.to && signal.to !== userId) return              // directed elsewhere

    // ── Peer lifecycle ────────────────────────────────────────────────────
    if (signal.kind === 'peer-ready') {
      // The remote peer just got camera/mic.
      // We only initiate if we have the lower userId; otherwise they'll call us
      // (from THEIR participants effect or peer-ready handler).
      const existing = peersRef.current.get(signal.from)
      if (existing && !['failed', 'closed'].includes(existing.connectionState)) {
        // Connection already in progress or established — don't disturb it
        return
      }
      _closePeer(signal.from)
      makingOfferRef.current.delete(signal.from)
      ignoreOfferRef.current.delete(signal.from)
      if (localStreamRef.current) {
        if (userId < signal.from) {
          // We have the lower ID → we initiate (they'll answer)
          _connectToPeer(signal.from)
        }
        // else: they have lower ID → they'll send an offer; we just need the peer ready
        // _getOrCreatePeer alone (no tracks) won't trigger onnegotiationneeded
        // — the offer handler will add our tracks after setRemoteDescription
      }
      return
    }

    if (signal.kind === 'peer-left') {
      _closePeer(signal.from)
      remoteScreenStreams.current.delete(signal.from)
      makingOfferRef.current.delete(signal.from)
      ignoreOfferRef.current.delete(signal.from)
      return
    }

    if (signal.kind === 'screen-start' && signal.data?.streamId) {
      const ids = new Set(remoteScreenStreams.current.get(signal.from) || [])
      ids.add(signal.data.streamId)
      remoteScreenStreams.current.set(signal.from, ids)
      setRemoteStreams(prev => prev.map(r =>
        r.peerId === signal.from && r.stream.id === signal.data.streamId ? { ...r, type: 'screen' } : r
      ))
      return
    }

    if (signal.kind === 'screen-stop' && signal.data?.streamId) {
      const ids = new Set(remoteScreenStreams.current.get(signal.from) || [])
      ids.delete(signal.data.streamId)
      if (ids.size) remoteScreenStreams.current.set(signal.from, ids)
      else remoteScreenStreams.current.delete(signal.from)
      setRemoteStreams(prev => prev.filter(
        r => !(r.peerId === signal.from && r.stream.id === signal.data.streamId)
      ))
      return
    }

    // ── Perfect Negotiation: offer / answer / ICE ─────────────────────────
    const peer = _getOrCreatePeer(signal.from)

    if (signal.kind === 'offer') {
      const polite = isPolite(signal.from)
      const collision = makingOfferRef.current.get(signal.from) || peer.signalingState !== 'stable'
      const ignore = !polite && collision   // impolite side ignores colliding offers
      ignoreOfferRef.current.set(signal.from, ignore)
      if (ignore) return

      try {
        // setRemoteDescription first (triggers implicit rollback for polite peer if needed).
        // We add local tracks AFTER this, while in have-remote-offer state, so
        // onnegotiationneeded does NOT fire (it only fires in stable state).
        await peer.setRemoteDescription(new RTCSessionDescription(signal.data))
        if (localStreamRef.current) _addMissingTracks(peer, localStreamRef.current)
        const answer = await peer.createAnswer()
        await peer.setLocalDescription(answer)
        await sendSignal(makePeerSignal({ kind: 'answer', from: userId, to: signal.from, data: answer }))
      } catch (err) {
        console.warn('[rtc] offer handler:', signal.from, err.message)
      }
      return
    }

    if (signal.kind === 'answer') {
      if (peer.signalingState === 'stable') return   // already settled
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(signal.data))
      } catch (err) {
        console.warn('[rtc] answer handler:', signal.from, err.message)
      }
      return
    }

    if (signal.kind === 'ice-candidate') {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(signal.data))
      } catch (err) {
        // Suppress errors for ICE candidates belonging to ignored/rolled-back offers
        if (!ignoreOfferRef.current.get(signal.from)) {
          console.warn('[rtc] ICE candidate:', signal.from, err.message)
        }
      }
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
    stopScreenShare: _stopScreenShare,
    handleSignal,
  }
}
