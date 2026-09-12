import { useEffect } from "react"

const EDGE_ZONE_PX = 24
const OPEN_THRESHOLD_PX = 40

/**
 * Opens the drawer on a right-to-left swipe starting within EDGE_ZONE_PX of
 * the viewport's physical right edge. The drawer lives on the right (RTL
 * "leading" side); its own vaul-driven drag handles closing once open, this
 * hook only covers the open gesture vaul doesn't provide on its own.
 */
export function useEdgeSwipe(onSwipeOpen: () => void) {
  useEffect(() => {
    let startX: number | null = null
    let startY: number | null = null
    let tracking = false

    function onTouchStart(e: TouchEvent) {
      const touch = e.touches[0]
      if (!touch) return
      const fromRightEdge = window.innerWidth - touch.clientX <= EDGE_ZONE_PX
      if (!fromRightEdge) return
      startX = touch.clientX
      startY = touch.clientY
      tracking = true
    }

    function onTouchMove(e: TouchEvent) {
      if (!tracking || startX === null || startY === null) return
      const touch = e.touches[0]
      if (!touch) return
      const dx = startX - touch.clientX
      const dy = Math.abs(touch.clientY - startY)
      if (dx > OPEN_THRESHOLD_PX && dx > dy) {
        tracking = false
        onSwipeOpen()
      }
    }

    function onTouchEnd() {
      tracking = false
      startX = null
      startY = null
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchmove", onTouchMove, { passive: true })
    window.addEventListener("touchend", onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("touchend", onTouchEnd)
    }
  }, [onSwipeOpen])
}
