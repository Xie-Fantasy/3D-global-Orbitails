import { useState } from "react"
import {
  BASE_LAYER_IDS,
  DATA_LAYER_IDS,
  EFFECT_IDS,
} from "../globe/config/globe.config"
import type { GlobeState } from "../globe/types/state"
import type { GlobeControls, GlobeTextureModeValue } from "../hooks/useGlobeWorld"
import type { GlobeLocale } from "../globe/types/data"
import { t } from "../i18n/globe"
import type { GlobeMessageKey } from "../i18n/globe"

interface ControlPanelProps {
  state: GlobeState
  controls: GlobeControls
  locale: GlobeLocale
  onLocaleChange: (locale: GlobeLocale) => void
  reducedMotion: boolean
}

interface LayerToggleConfig {
  readonly id: string
  readonly labelKey: GlobeMessageKey
}

const SCENE_LAYERS: readonly LayerToggleConfig[] = [
  { id: BASE_LAYER_IDS.atmosphere, labelKey: "atmosphere" },
  { id: BASE_LAYER_IDS.boundaries, labelKey: "worldBoundaries" },
  { id: DATA_LAYER_IDS.particleHalo, labelKey: "particleHalo" },
  { id: BASE_LAYER_IDS.starfield, labelKey: "starfield" },
]

const DATA_LAYERS: readonly LayerToggleConfig[] = [
  { id: DATA_LAYER_IDS.markers, labelKey: "markers" },
  { id: DATA_LAYER_IDS.labels, labelKey: "labels" },
  { id: DATA_LAYER_IDS.bars, labelKey: "bars" },
  { id: DATA_LAYER_IDS.flightArcs, labelKey: "flights" },
  { id: DATA_LAYER_IDS.landRoutes, labelKey: "landRoutes" },
  { id: DATA_LAYER_IDS.seaRoutes, labelKey: "seaRoutes" },
]

const THEMES: readonly { readonly id: string; readonly labelKey: GlobeMessageKey }[] = [
  { id: "emerald", labelKey: "emerald" },
  { id: "azure", labelKey: "azure" },
  { id: "violet", labelKey: "violet" },
  { id: "solar", labelKey: "solar" },
]

const TEXTURE_MODES: readonly {
  readonly mode: GlobeTextureModeValue
  readonly labelKey: GlobeMessageKey
}[] = [
  { mode: "day", labelKey: "daytime" },
  { mode: "night", labelKey: "nighttime" },
  { mode: "off", labelKey: "off" },
]

interface ToggleProps {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
}

function Toggle({ label, checked, disabled = false, onChange }: ToggleProps) {
  return (
    <label className={`globe-toggle${disabled ? " is-disabled" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="globe-toggle__track" aria-hidden="true" />
      <span className="globe-toggle__label">{label}</span>
    </label>
  )
}

export function ControlPanel({
  state,
  controls,
  locale,
  onLocaleChange,
  reducedMotion,
}: ControlPanelProps) {
  const [accentDraft, setAccentDraft] = useState<string>(
    state.accent ?? "#63f5cb",
  )
  const atmosphereEffect = state.effects[EFFECT_IDS.atmosphereMotion]
  const effectEnabled = atmosphereEffect?.enabled ?? false
  const effectReady = atmosphereEffect?.status === "ready"

  return (
    <aside
      className="globe-panel"
      data-reduced-motion={reducedMotion ? "true" : "false"}
    >
      <header className="globe-panel__header">
        <div className="globe-panel__title">
          <h1>3d-earth-Orbitalis</h1>
          <p>瑠璃色の地球</p>
        </div>
        <div className="globe-lang" role="group" aria-label="Language">
          <span className="globe-lang__label">{t(locale, "language")}</span>
          <button
            type="button"
            className={`globe-lang__option${locale === "en" ? " is-active" : ""}`}
            onClick={() => onLocaleChange("en")}
          >
            EN
          </button>
          <button
            type="button"
            className={`globe-lang__option${locale === "zh" ? " is-active" : ""}`}
            onClick={() => onLocaleChange("zh")}
          >
            中
          </button>
        </div>
      </header>

      <section className="globe-panel__section">
        <h2>{t(locale, "colorSystem")}</h2>
        <div className="globe-chip-row">
          {THEMES.map(({ id, labelKey }) => (
            <button
              key={id}
              type="button"
              className={`globe-chip${state.theme === id ? " is-active" : ""}`}
              onClick={() => controls.setTheme(id)}
            >
              {t(locale, labelKey)}
            </button>
          ))}
        </div>
        <div className="globe-chip-row">
          {TEXTURE_MODES.map(({ mode, labelKey }) => (
            <button
              key={mode}
              type="button"
              className={`globe-chip${state.texture.mode === mode ? " is-active" : ""}`}
              onClick={() => controls.setTextureMode(mode)}
            >
              {t(locale, labelKey)}
            </button>
          ))}
        </div>
        <label className="globe-accent">
          <span>{t(locale, "customColor")}</span>
          <input
            type="color"
            value={accentDraft}
            onChange={(event) => {
              setAccentDraft(event.target.value)
              controls.setCustomAccentColor(event.target.value)
            }}
          />
        </label>
      </section>

      <section className="globe-panel__section">
        <h2>{t(locale, "sceneLayers")}</h2>
        <div className="globe-toggle-list">
          {SCENE_LAYERS.map(({ id, labelKey }) => {
            const layerState = state.layers[id]
            return (
              <Toggle
                key={id}
                label={t(locale, labelKey)}
                checked={layerState?.visible ?? false}
                disabled={layerState?.status !== "ready"}
                onChange={(next) => controls.setLayerVisible(id, next)}
              />
            )
          })}
          <Toggle
            label={t(locale, "glowMotion")}
            checked={effectEnabled}
            disabled={!effectReady}
            onChange={(next) =>
              controls.setEffectEnabled(EFFECT_IDS.atmosphereMotion, next)
            }
          />
        </div>
      </section>

      <section className="globe-panel__section">
        <h2>{t(locale, "dataLayers")}</h2>
        <div className="globe-toggle-list">
          {DATA_LAYERS.map(({ id, labelKey }) => {
            const layerState = state.layers[id]
            return (
              <Toggle
                key={id}
                label={t(locale, labelKey)}
                checked={layerState?.visible ?? false}
                disabled={layerState?.status !== "ready"}
                onChange={(next) => controls.setLayerVisible(id, next)}
              />
            )
          })}
        </div>
      </section>

      <section className="globe-panel__section">
        <h2>{t(locale, "visualDensity")}</h2>
        <label className="globe-slider">
          <span>{t(locale, "particleHalo")}</span>
          <input
            type="range"
            min={25}
            max={250}
            value={state.densities.halo}
            onChange={(event) =>
              controls.setVisualDensity("halo", Number(event.target.value))
            }
          />
          <output>{state.densities.halo}</output>
        </label>
        <label className="globe-slider">
          <span>{t(locale, "starfield")}</span>
          <input
            type="range"
            min={25}
            max={250}
            value={state.densities.starfield}
            onChange={(event) =>
              controls.setVisualDensity("starfield", Number(event.target.value))
            }
          />
          <output>{state.densities.starfield}</output>
        </label>
      </section>

      <section className="globe-panel__section">
        <h2>{t(locale, "manualControl")}</h2>
        <div className="globe-toggle-list">
          <Toggle
            label={t(locale, "autoRotate")}
            checked={state.autoRotate}
            onChange={(next) => controls.setAutoRotate(next)}
          />
        </div>
        <button
          type="button"
          className="globe-button"
          onClick={() => controls.resetView()}
        >
          {t(locale, "resetView")}
        </button>
      </section>

      <footer className="globe-panel__footer">
        <span>{t(locale, "dragToRotate")}</span>
        <span>{t(locale, "wheelToZoom")}</span>
        <span>{t(locale, "selectToFocus")}</span>
      </footer>
    </aside>
  )
}
