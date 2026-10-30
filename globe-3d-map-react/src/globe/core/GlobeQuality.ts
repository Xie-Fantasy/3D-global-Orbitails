import { detectQualityPreset, QUALITY_PRESETS } from "../config/quality.config"
import type { QualityPreset, QualityPresetId } from "../config/quality.config"

export class GlobeQuality {
  preset: QualityPreset

  constructor(initialQuality?: QualityPresetId) {
    const detected = detectQualityPreset()
    const requested = initialQuality
      ? QUALITY_PRESETS[initialQuality]
      : undefined
    this.preset = requested ?? detected
  }

  get id(): QualityPresetId {
    return this.preset.id
  }

  get pixelRatio(): number {
    const devicePixelRatio =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    return Math.min(devicePixelRatio, this.preset.pixelRatio)
  }
}
