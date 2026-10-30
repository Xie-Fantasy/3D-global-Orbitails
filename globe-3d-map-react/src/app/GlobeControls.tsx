import type { GlobeLocale } from "../globe/types/data"
import { t } from "../i18n/globe"

interface GlobeControlsProps {
  autoRotate: boolean
  interacting?: boolean
  locale: GlobeLocale
  onToggleRotate: (enabled: boolean) => void
  onReset: () => void
}

export function GlobeControls({
  autoRotate,
  interacting = false,
  locale,
  onToggleRotate,
  onReset,
}: GlobeControlsProps) {
  return (
    <aside className="globe-controls" aria-label={t(locale, "resetView")}>
      <button
        type="button"
        className={`globe-controls__button${
          autoRotate ? " is-active" : ""
        }`}
        aria-pressed={autoRotate}
        onClick={() => onToggleRotate(!autoRotate)}
      >
        <span className="globe-controls__icon" aria-hidden="true">
          ↻
        </span>
        <span>{autoRotate ? t(locale, "autoRotating") : t(locale, "autoRotate")}</span>
        <small>
          {interacting
            ? t(locale, "manualControl")
            : autoRotate
              ? "ON"
              : "OFF"}
        </small>
      </button>
      <button
        type="button"
        className="globe-controls__button"
        title={t(locale, "resetView")}
        onClick={onReset}
      >
        <span className="globe-controls__icon" aria-hidden="true">
          ↺
        </span>
        <span>{t(locale, "resetView")}</span>
        <small>{locale === "zh" ? "重置" : "RESET"}</small>
      </button>
    </aside>
  )
}
