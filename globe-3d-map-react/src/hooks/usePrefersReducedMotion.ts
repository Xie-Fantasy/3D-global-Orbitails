import { useEffect, useState } from "react"

/**
 * Tracks the user's `prefers-reduced-motion` setting and updates live if it
 * changes. The globe layers already gate their animation on this value, but the
 * UI also uses it to avoid motion-heavy transitions.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return
    }
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReduced(query.matches)

    const handleChange = (event: MediaQueryListEvent): void => {
      setPrefersReduced(event.matches)
    }
    query.addEventListener("change", handleChange)
    return () => query.removeEventListener("change", handleChange)
  }, [])

  return prefersReduced
}
