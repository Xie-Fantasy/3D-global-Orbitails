import { detectQualityPreset, QUALITY_PRESETS } from "../config/quality.config.js"

export class GlobeQuality {
  constructor(initialQuality) {
    const detected = detectQualityPreset()
    this.preset = QUALITY_PRESETS[initialQuality] ?? detected
  }

  get id() {
    return this.preset.id
  }

  get pixelRatio() {
    return Math.min(window.devicePixelRatio || 1, this.preset.pixelRatio)
  }
}

