import { useEffect, useState } from "react"
import type { GlobeState } from "../globe/types/state"
import type { GlobeDiagnosticsSnapshot } from "../globe/core/GlobeDiagnostics"
import type { GlobeControls } from "../hooks/useGlobeWorld"
import type { GlobeLocale } from "../globe/types/data"
import { t } from "../i18n/globe"
import type { GlobeMessageKey } from "../i18n/globe"

interface StatusBarProps {
  state: GlobeState
  controls: GlobeControls
  locale: GlobeLocale
}

const LOCATION_TYPE_KEY: Record<string, GlobeMessageKey> = {
  hub: "hub",
  city: "city",
  port: "port",
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="globe-stat">
      <span className="globe-stat__value">{value}</span>
      <span className="globe-stat__label">{label}</span>
    </div>
  )
}

export function StatusBar({ state, controls, locale }: StatusBarProps) {
  const [diagnostics, setDiagnostics] = useState<GlobeDiagnosticsSnapshot | null>(
    null,
  )

  useEffect(() => {
    const read = (): void => setDiagnostics(controls.getDiagnostics())
    read()
    const timer = window.setInterval(read, 500)
    return () => window.clearInterval(timer)
  }, [controls])

  const active = state.activeLocation
  const country = state.selectedCountry

  return (
    <div className="globe-status">
      <div className="globe-status__info">
        {active ? (
          <div className="globe-info-card">
            <div className="globe-info-card__head">
              <strong>
                {locale === "zh" ? active.nameZh : active.name}
              </strong>
              <span className="globe-info-card__type">
                {t(locale, LOCATION_TYPE_KEY[active.type] ?? "city")}
              </span>
            </div>
            <dl className="globe-info-card__grid">
              <dt>{t(locale, "coordinates")}</dt>
              <dd>
                {active.coordinate[0].toFixed(1)}, {active.coordinate[1].toFixed(1)}
              </dd>
              <dt>{t(locale, "quantitySpread")}</dt>
              <dd>{active.value}</dd>
              <dt>{t(locale, "connectionIndex")}</dt>
              <dd>{active.priority}</dd>
            </dl>
          </div>
        ) : country ? (
          <div className="globe-info-card">
            <div className="globe-info-card__head">
              <strong>
                {locale === "zh" ? country.nameZh : country.name}
              </strong>
              <span className="globe-info-card__type">
                {t(locale, "countryFocus")}
              </span>
            </div>
            <dl className="globe-info-card__grid">
              <dt>{t(locale, "coordinates")}</dt>
              <dd>
                {country.coordinate[0].toFixed(1)},{" "}
                {country.coordinate[1].toFixed(1)}
              </dd>
            </dl>
          </div>
        ) : (
          <p className="globe-status__hint">{t(locale, "selectToFocus")}</p>
        )}
      </div>

      <div className="globe-status__stats">
        {diagnostics ? (
          <>
            <Stat label="FPS" value={String(diagnostics.fps)} />
            <Stat label="Draw" value={String(diagnostics.drawCalls)} />
            <Stat label="Tris" value={diagnostics.triangles.toLocaleString()} />
            <Stat
              label="Layers"
              value={`${diagnostics.visibleLayers}/${diagnostics.totalLayers}`}
            />
          </>
        ) : null}
      </div>
    </div>
  )
}
