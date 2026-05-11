import { useEffect, useRef, useState } from 'react'

const THRESHOLD   = 130
const MAX_PULL    = 150
const MIN_HOLD_MS = 200   // must be pulling for this long before it can trigger

export function usePullToRefresh(onRefresh, enabled = true) {
  const [pullY, setPullY]           = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY    = useRef(null)
  const startTime = useRef(null)
  const pulling   = useRef(false)
  const pullRef   = useRef(0)

  useEffect(() => {
    if (!enabled) return

    const onTouchStart = (e) => {
      if (window.scrollY !== 0) return
      startY.current    = e.touches[0].clientY
      startTime.current = Date.now()
      pulling.current   = true
    }

    const onTouchMove = (e) => {
      if (!pulling.current || startY.current === null) return
      const delta = e.touches[0].clientY - startY.current
      if (delta <= 0) { setPullY(0); pullRef.current = 0; return }
      const clamped = Math.min(MAX_PULL, delta * 0.45)
      setPullY(clamped)
      pullRef.current = clamped
    }

    const onTouchEnd = async () => {
      if (!pulling.current) return
      pulling.current = false
      const held    = Date.now() - (startTime.current || 0)
      const current = pullRef.current
      setPullY(0)
      pullRef.current   = 0
      startY.current    = null
      startTime.current = null
      if (current >= THRESHOLD && held >= MIN_HOLD_MS) {
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
