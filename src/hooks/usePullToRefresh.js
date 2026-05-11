import { useEffect, useRef, useState } from 'react'

const THRESHOLD = 72    // px of pull needed to trigger
const MAX_PULL  = 100   // px cap on indicator travel

export function usePullToRefresh(onRefresh, enabled = true) {
  const [pullY, setPullY]       = useState(0)   // 0-MAX_PULL
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(null)
  const pulling = useRef(false)

  useEffect(() => {
    if (!enabled) return

    const onTouchStart = (e) => {
      if (window.scrollY > 4) return          // only trigger from top
      startY.current = e.touches[0].clientY
      pulling.current = true
    }

    const onTouchMove = (e) => {
      if (!pulling.current || startY.current === null) return
      const delta = e.touches[0].clientY - startY.current
      if (delta <= 0) { setPullY(0); return }
      // dampen movement so it feels elastic
      const clamped = Math.min(MAX_PULL, delta * 0.5)
      setPullY(clamped)
    }

    const onTouchEnd = async () => {
      if (!pulling.current) return
      pulling.current = false
      if (pullY >= THRESHOLD) {
        setRefreshing(true)
        setPullY(0)
        try { await onRefresh() } finally { setRefreshing(false) }
      } else {
        setPullY(0)
      }
      startY.current = null
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove',  onTouchMove,  { passive: true })
    window.addEventListener('touchend',   onTouchEnd)

    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove',  onTouchMove)
      window.removeEventListener('touchend',   onTouchEnd)
    }
  }, [onRefresh, pullY, enabled])

  return { pullY, refreshing, triggered: pullY >= THRESHOLD }
}
