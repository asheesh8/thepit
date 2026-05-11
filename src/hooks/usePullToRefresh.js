import { useEffect, useRef, useState } from 'react'

const THRESHOLD = 100   // px of pull needed to trigger (was 72 — raised to prevent accidental fires)
const MAX_PULL  = 120

export function usePullToRefresh(onRefresh, enabled = true) {
  const [pullY, setPullY]           = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY  = useRef(null)
  const pulling = useRef(false)
  const pullRef = useRef(0)  // shadow ref so touchend reads current value without stale closure

  useEffect(() => {
    if (!enabled) return

    const onTouchStart = (e) => {
      if (window.scrollY > 10) return   // only fire from the very top
      startY.current = e.touches[0].clientY
      pulling.current = true
    }

    const onTouchMove = (e) => {
      if (!pulling.current || startY.current === null) return
      const delta = e.touches[0].clientY - startY.current
      if (delta <= 0) { setPullY(0); pullRef.current = 0; return }
      // require the gesture to be more vertical than horizontal to avoid catching diagonal scrolls
      const touch = e.touches[0]
      // (startX not tracked, but we can check current vs window center — skip, keep simple)
      const clamped = Math.min(MAX_PULL, delta * 0.45)
      setPullY(clamped)
      pullRef.current = clamped
    }

    const onTouchEnd = async () => {
      if (!pulling.current) return
      pulling.current = false
      const current = pullRef.current
      setPullY(0)
      pullRef.current = 0
      startY.current = null
      if (current >= THRESHOLD) {
        setRefreshing(true)
        try { await onRefresh() } finally { setRefreshing(false) }
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove',  onTouchMove,  { passive: true })
    window.addEventListener('touchend',   onTouchEnd)

    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove',  onTouchMove)
      window.removeEventListener('touchend',   onTouchEnd)
    }
  }, [onRefresh, enabled])

  return { pullY, refreshing, triggered: pullRef.current >= THRESHOLD }
}
