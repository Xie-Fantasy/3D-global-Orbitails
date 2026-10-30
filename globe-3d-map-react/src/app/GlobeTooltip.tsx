import type { GlobeActiveLocation } from "../globe/types/state"
import type { GlobeLocale } from "../globe/types/data"
import { t } from "../i18n/globe"

interface GlobeTooltipProps {
  location: GlobeActiveLocation | null | undefined
  locale: GlobeLocale
}

export function GlobeTooltip({ location, locale }: GlobeTooltipProps) {
  if (!location) return null

  const typeLabel = t(locale, location.type)
  const [longitude, latitude] = location.coordinate
  const coordinateLabel = `${Math.abs(latitude).toFixed(2)}°${
    latitude >= 0 ? "N" : "S"
  } / ${Math.abs(longitude).toFixed(2)}°${longitude >= 0 ? "E" : "W"}`
  const isSelected = location.interaction === "selected"

  return (
    <aside
      className={`globe-tooltip${isSelected ? " is-selected" : ""}`}
      aria-live="polite"
    >
      <div className="globe-tooltip__header">
        <span>{isSelected ? t(locale, "nodeLocked") : t(locale, "nodeSignal")}</span>
        <i aria-hidden="true" />
      </div>
      <strong>{locale === "zh" ? location.nameZh : location.name}</strong>
      <small>
        {locale === "zh" ? location.countryZh : location.country} · {typeLabel}
      </small>
      <dl>
        <div>
          <dt>{t(locale, "connectionIndex")}</dt>
          <dd>{location.value}</dd>
        </div>
        <div>
          <dt>{t(locale, "coordinates")}</dt>
          <dd>{coordinateLabel}</dd>
        </div>
      </dl>
      {isSelected ? <p>{t(locale, "selectedHint")}</p> : null}
    </aside>
  )
}
