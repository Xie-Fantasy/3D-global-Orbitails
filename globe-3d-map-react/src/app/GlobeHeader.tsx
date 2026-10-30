import type { GlobePhase } from "../globe/types/state"
import type { QualityPresetId } from "../globe/config/quality.config"
import type { GlobeLocale } from "../globe/types/data"
import { t } from "../i18n/globe"

interface GlobeHeaderProps {
  phase: GlobePhase
  quality: QualityPresetId
  fps: number
  drawCalls: number
  locale: GlobeLocale
}

export function GlobeHeader({
  phase,
  quality,
  fps,
  drawCalls,
  locale,
}: GlobeHeaderProps) {
  const statusLabel =
    phase === "ready"
      ? t(locale, "orbitOnline")
      : phase === "loading"
        ? t(locale, "booting")
        : phase === "entering"
          ? t(locale, "orbitStarting")
          : phase === "recovering"
            ? t(locale, "recoveringStatus")
            : t(locale, "offline")

  return (
    <header className="globe-header">
      <div className="globe-runtime">
        <span className="globe-runtime__signal" aria-hidden="true" />
        <div>
          <strong>{statusLabel}</strong>
          <small>
            {quality.toUpperCase()} · {fps} FPS · {drawCalls} CALLS
          </small>
        </div>
      </div>
    </header>
  )
}
