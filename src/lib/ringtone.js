let audioContext = null
let ringTimer = null
const activeKeys = new Map()

const getAudioContext = () => {
  if (audioContext) return audioContext
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return null
  audioContext = new AudioCtx()
  return audioContext
}

const stopLoop = () => {
  if (ringTimer) {
    clearTimeout(ringTimer)
    ringTimer = null
  }
}

const tone = (ctx, startAt, duration, frequency, volume) => {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(frequency, startAt)
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.025)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(startAt)
  osc.stop(startAt + duration + 0.03)
}

const playRing = () => {
  if (!activeKeys.size) {
    stopLoop()
    return
  }

  const ctx = getAudioContext()
  if (!ctx) return

  if (ctx.state === 'suspended') {
    ctx.resume()
      .then(() => {
        if (activeKeys.size && !ringTimer) playRing()
      })
      .catch(() => {})
    return
  }

  const now = ctx.currentTime
  tone(ctx, now, 0.22, 440, 0.055)
  tone(ctx, now, 0.22, 554.37, 0.035)
  tone(ctx, now + 0.34, 0.22, 440, 0.055)
  tone(ctx, now + 0.34, 0.22, 554.37, 0.035)

  ringTimer = setTimeout(playRing, 1700)
}

export const startRingtone = (key = 'default') => {
  if (typeof window === 'undefined') return
  activeKeys.set(key, (activeKeys.get(key) || 0) + 1)
  if (!ringTimer) playRing()
}

export const unlockRingtone = () => {
  if (typeof window === 'undefined') return
  const ctx = getAudioContext()
  if (!ctx) return

  const playUnlockTone = () => {
    const now = ctx.currentTime
    tone(ctx, now, 0.04, 440, 0.001)
  }

  if (ctx.state === 'suspended') {
    ctx.resume().then(playUnlockTone).catch(() => {})
    return
  }

  playUnlockTone()
}

export const stopRingtone = (key = 'default') => {
  const count = activeKeys.get(key) || 0
  if (count <= 1) activeKeys.delete(key)
  else activeKeys.set(key, count - 1)
  if (!activeKeys.size) stopLoop()
}

export const stopAllRingtones = () => {
  activeKeys.clear()
  stopLoop()
}
