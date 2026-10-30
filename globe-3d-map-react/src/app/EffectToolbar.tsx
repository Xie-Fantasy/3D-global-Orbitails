import type { GlobeLocale } from "../globe/types/data"
import { t } from "../i18n/globe"
import type { LayerStatus } from "../globe/types/layers"

interface LayerItem {
  readonly id: string
  readonly label: string
  readonly visible: boolean
  readonly status: LayerStatus
  readonly error?: string | null
  readonly tone?: string
}

interface EffectToolbarProps {
  baseLayers: readonly LayerItem[]
  dataLayers: readonly LayerItem[]
  locale: GlobeLocale
  onToggle: (id: string, visible: boolean) => void
}

function getStatusLabel(
  item: LayerItem,
  locale: GlobeLocale,
): string {
  if (item.status === "ready") {
    return item.visible ? t(locale, "on") : t(locale, "off")
  }
  if (item.status === "empty") {
    return t(locale, "empty")
  }
  if (item.status === "error") {
    return t(locale, "error")
  }
  return t(locale, "wait")
}

function getStatusTitle(item: LayerItem, locale: GlobeLocale): string | undefined {
  if (item.status === "empty") {
    return `${item.label}: ${t(locale, "noData")}`
  }
  if (item.status === "error") {
    return `${item.label}: ${t(locale, "loadFailed")}`
  }
  return undefined
}

export function EffectToolbar({
  baseLayers,
  dataLayers,
  locale,
  onToggle,
}: EffectToolbarProps) {
  return (
    <aside className="effect-toolbar" aria-label={t(locale, "sceneLayers")}>
      <div className="effect-toolbar__section">
        <p className="effect-toolbar__eyebrow">{t(locale, "sceneLayers")}</p>
        {baseLayers.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`effect-toolbar__button${
              item.visible ? " is-active" : ""
            }${
              item.status === "empty" || item.status === "error"
                ? " is-degraded"
                : ""
            }`}
            aria-pressed={item.visible}
            disabled={item.status !== "ready"}
            title={getStatusTitle(item, locale)}
            onClick={() => onToggle(item.id, !item.visible)}
          >
            <span className="effect-toolbar__indicator" aria-hidden="true" />
            <span>{item.label}</span>
            <span className="effect-toolbar__state">
              {getStatusLabel(item, locale)}
            </span>
          </button>
        ))}
      </div>

      <div className="effect-toolbar__section effect-toolbar__section--data">
        <p className="effect-toolbar__eyebrow">{t(locale, "dataLayers")}</p>
        {dataLayers.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`effect-toolbar__button${
              item.visible ? " is-active" : ""
            }${
              item.status === "empty" || item.status === "error"
                ? " is-degraded"
                : ""
            }`}
            data-tone={item.tone}
            aria-pressed={item.status === "ready" ? item.visible : undefined}
            disabled={item.status !== "ready"}
            title={getStatusTitle(item, locale)}
            onClick={() => onToggle(item.id, !item.visible)}
          >
            <span className="effect-toolbar__indicator" aria-hidden="true" />
            <span>{item.label}</span>
            <span className="effect-toolbar__state">
              {getStatusLabel(item, locale)}
            </span>
          </button>
        ))}
      </div>
    </aside>
  )
}
