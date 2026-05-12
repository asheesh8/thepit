import { useEffect } from 'react'
import { startRingtone, stopRingtone } from '../lib/ringtone'

export default function useRingtone(active, key) {
  useEffect(() => {
    if (!active) {
      stopRingtone(key)
      return
    }

    startRingtone(key)
    return () => stopRingtone(key)
  }, [active, key])
}
