import { useRef, useCallback } from 'react'

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
}

export function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void, threshold = 70): SwipeHandlers {
  const startX = useRef(0)
  const startY = useRef(0)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const diffX = e.changedTouches[0].clientX - startX.current
    const diffY = e.changedTouches[0].clientY - startY.current
    if (Math.abs(diffX) < threshold) return
    if (Math.abs(diffY) > Math.abs(diffX)) return
    if (diffX > 0) {
      onSwipeRight()
    } else {
      onSwipeLeft()
    }
  }, [onSwipeLeft, onSwipeRight, threshold])

  return { onTouchStart, onTouchEnd }
}
