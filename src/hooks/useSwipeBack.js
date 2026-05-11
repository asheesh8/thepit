import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const EDGE_THRESHOLD = 30   // px from left edge to start tracking
const SWIPE_DISTANCE = 80   // px needed to trigger back

export function useSwipeBack() {
  const navigate = useNavigate()
  const startX = useRef(null)
  const startY = useRef(null)
  const tracking = useRef(false)

  useEffect(() => {
    const onStart = (e) => {
      const x = e.touches[0].clientX
      if (x > EDGE_THRESHOLD) return
      startX.current = x
      startY.current = e.touches[0].clientY
      tracking.current = true
    }

    const onMove = (e) => {
      if (!tracking.current) return
      const dy = Math.abs(e.touches[0].clientY - startY.current)
      if (dy > 20) { tracking.current = false; return }  // vertical scroll — abort
    }

    const onEnd = (e) => {
      if (!tracking.current) return
      tracking.current = false
      const dx = e.changedTouches[0].clientX - startX.current
      if (dx >= SWIPE_DISTANCE) navigate(-1)
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove',  onMove,  { passive: true })
    window.addEventListener('touchend',   onEnd)

    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove',  onMove)
      window.removeEventListener('touchend',   onEnd)
    }
  }, [navigate])
}
