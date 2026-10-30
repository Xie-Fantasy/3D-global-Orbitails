export type QualityPresetId = "low" | "medium" | "high"

export interface QualityPreset {
  readonly id: QualityPresetId
  readonly pixelRatio: number
  readonly sphereSegments: readonly [number, number]
  readonly starCount: number
  readonly haloParticleCount: number
  readonly antialias: boolean
}

export const QUALITY_PRESETS: Record<QualityPresetId, QualityPreset> =
  Object.freeze({
    low: Object.freeze({
      id: "low",
      pixelRatio: 1,
      sphereSegments: [48, 32] as const,
      starCount: 500,
      haloParticleCount: 420,
      antialias: false,
    }),
    medium: Object.freeze({
      id: "medium",
      pixelRatio: 1.5,
      sphereSegments: [64, 48] as const,
      starCount: 1100,
      haloParticleCount: 900,
      antialias: true,
    }),
    high: Object.freeze({
      id: "high",
      pixelRatio: 2,
      sphereSegments: [96, 64] as const,
      starCount: 1800,
      haloParticleCount: 1500,
      antialias: true,
    }),
  })

export function detectQualityPreset(): QualityPreset {
  if (typeof window === "undefined") {
    return QUALITY_PRESETS.medium
  }

  const reducedMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches
  const memory =
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
  const narrowViewport = window.innerWidth < 768

  if (reducedMotion || narrowViewport || memory <= 4) {
    return QUALITY_PRESETS.low
  }

  if (memory >= 8 && window.innerWidth >= 1600) {
    return QUALITY_PRESETS.high
  }

  return QUALITY_PRESETS.medium
}
