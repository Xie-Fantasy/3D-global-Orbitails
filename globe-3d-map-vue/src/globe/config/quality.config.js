export const QUALITY_PRESETS = Object.freeze({
  low: {
    id: "low",
    pixelRatio: 1,
    sphereSegments: [48, 32],
    starCount: 500,
    haloParticleCount: 420,
    antialias: false,
  },
  medium: {
    id: "medium",
    pixelRatio: 1.5,
    sphereSegments: [64, 48],
    starCount: 1100,
    haloParticleCount: 900,
    antialias: true,
  },
  high: {
    id: "high",
    pixelRatio: 2,
    sphereSegments: [96, 64],
    starCount: 1800,
    haloParticleCount: 1500,
    antialias: true,
  },
})

export function detectQualityPreset() {
  if (typeof window === "undefined") {
    return QUALITY_PRESETS.medium
  }

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  const memory = navigator.deviceMemory ?? 8
  const narrowViewport = window.innerWidth < 768

  if (reducedMotion || narrowViewport || memory <= 4) {
    return QUALITY_PRESETS.low
  }

  if (memory >= 8 && window.innerWidth >= 1600) {
    return QUALITY_PRESETS.high
  }

  return QUALITY_PRESETS.medium
}
