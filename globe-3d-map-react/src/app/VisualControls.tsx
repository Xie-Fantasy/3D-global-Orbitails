import type { GlobeLocale } from "../globe/types/data"
import { t } from "../i18n/globe"

interface VisualControlsProps {
  haloDensity: number
  starDensity: number
  locale: GlobeLocale
  onUpdateHalo: (value: number) => void
  onUpdateStar: (value: number) => void
}

export function VisualControls({
  haloDensity,
  starDensity,
  locale,
  onUpdateHalo,
  onUpdateStar,
}: VisualControlsProps) {
  return (
    <aside className="visual-controls" aria-label={t(locale, "visualDensity")}>
      <p className="visual-controls__eyebrow">{t(locale, "visualDensity")}</p>
      <label className="visual-controls__row">
        <span>
          <strong>{t(locale, "particleHalo")}</strong>
          <small>
            {haloDensity}% · {t(locale, "quantitySpread")}
          </small>
        </span>
        <input
          type="range"
          min={25}
          max={250}
          step={1}
          value={haloDensity}
          aria-label={t(locale, "particleHalo")}
          onChange={(event) => onUpdateHalo(Number(event.target.value))}
        />
      </label>
      <label className="visual-controls__row">
        <span>
          <strong>{t(locale, "starfield")}</strong>
          <small>
            {starDensity}% · {t(locale, "quantitySpread")}
          </small>
        </span>
        <input
          type="range"
          min={25}
          max={250}
          step={1}
          value={starDensity}
          aria-label={t(locale, "starfield")}
          onChange={(event) => onUpdateStar(Number(event.target.value))}
        />
      </label>
    </aside>
  )
}
