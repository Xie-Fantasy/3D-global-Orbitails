import { useEffect, useMemo, useState } from "react"
import { useGlobeWorld } from "../hooks/useGlobeWorld"
import type { GlobeTextureModeValue } from "../hooks/useGlobeWorld"
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion"
import type { GlobeLocale } from "../globe/types/data"
import type { GlobeMessageKey } from "../i18n/globe"
import { t } from "../i18n/globe"
import {
  BASE_LAYER_IDS,
  DATA_LAYER_IDS,
  EFFECT_IDS,
  GLOBE_THEMES,
  TEXTURE_MODES,
} from "../globe/config/globe.config"
import type {
  GlobeActiveLocation,
  GlobePhase,
  LayerState,
  EffectState,
} from "../globe/types/state"
import type { LayerStatus } from "../globe/types/layers"
import type { GlobeDiagnosticsSnapshot } from "../globe/core/GlobeDiagnostics"
import { GlobeCanvas } from "./GlobeCanvas"
import { GlobeHeader } from "./GlobeHeader"
import { ThemeSwitcher } from "./ThemeSwitcher"
import { TextureSwitcher } from "./TextureSwitcher"
import { LanguageSwitcher } from "./LanguageSwitcher"
import { EffectToolbar } from "./EffectToolbar"
import { GlobeControls } from "./GlobeControls"
import { VisualControls } from "./VisualControls"
import { GlobeGuide } from "./GlobeGuide"
import { GlobeCoordinate } from "./GlobeCoordinate"
import { GlobeTooltip } from "./GlobeTooltip"
import { GlobeLoading } from "./GlobeLoading"
import "./app.css"

const LOADING_MESSAGE_KEYS = new Set<GlobeMessageKey>([
  "loading",
  "loadingDay",
  "loadingNight",
  "loadingScene",
  "loadingReady",
])

function translateLoadingMessage(
  message: string,
  locale: GlobeLocale,
): string {
  return LOADING_MESSAGE_KEYS.has(message as GlobeMessageKey)
    ? t(locale, message as GlobeMessageKey)
    : t(locale, "loading")
}

interface LayerDefinition {
  readonly id: string
  readonly labelKey: GlobeMessageKey
  readonly effect?: boolean
  readonly tone?: string
}

const BASE_LAYER_DEFINITIONS: readonly LayerDefinition[] = [
  { id: BASE_LAYER_IDS.boundaries, labelKey: "worldBoundaries" },
  { id: BASE_LAYER_IDS.atmosphere, labelKey: "atmosphere" },
  { id: EFFECT_IDS.atmosphereMotion, labelKey: "glowMotion", effect: true },
  { id: BASE_LAYER_IDS.starfield, labelKey: "starfield" },
]

const DATA_LAYER_DEFINITIONS: readonly LayerDefinition[] = [
  { id: DATA_LAYER_IDS.bars, labelKey: "bars" },
  { id: DATA_LAYER_IDS.flightArcs, labelKey: "flights" },
  { id: DATA_LAYER_IDS.labels, labelKey: "labels" },
  { id: DATA_LAYER_IDS.landRoutes, labelKey: "landRoutes", tone: "land" },
  { id: DATA_LAYER_IDS.seaRoutes, labelKey: "seaRoutes", tone: "sea" },
  { id: DATA_LAYER_IDS.particleHalo, labelKey: "particleHalo", tone: "halo" },
]

interface ToolbarLayerItem {
  readonly id: string
  readonly label: string
  readonly visible: boolean
  readonly status: LayerStatus
  readonly error: string | null
  readonly tone?: string
}

export function GlobePage() {
  const { canvasRef, state, status, controls } = useGlobeWorld()
  const [locale, setLocale] = useState<GlobeLocale>("en")
  const reducedMotion = usePrefersReducedMotion()
  const [diagnostics, setDiagnostics] = useState<GlobeDiagnosticsSnapshot | null>(
    null,
  )
  const [loadingVisible, setLoadingVisible] = useState(false)
  const [loadingLeaving, setLoadingLeaving] = useState(false)

  useEffect(() => {
    const read = (): void => setDiagnostics(controls.getDiagnostics())
    read()
    const timer = window.setInterval(read, 500)
    return () => window.clearInterval(timer)
  }, [controls])

  const phase: GlobePhase = state?.phase ?? "idle"
  const showLoading = phase === "loading" || phase === "recovering"

  useEffect(() => {
    if (showLoading) {
      setLoadingLeaving(false)
      setLoadingVisible(true)
      return
    }
    if (loadingVisible) {
      setLoadingLeaving(true)
      const timer = window.setTimeout(() => setLoadingVisible(false), 720)
      return () => window.clearTimeout(timer)
    }
  }, [showLoading, loadingVisible])

  const handleLocaleChange = (next: GlobeLocale): void => {
    setLocale(next)
    controls.setLocale(next)
  }

  const themes = useMemo(
    () =>
      Object.values(GLOBE_THEMES).map((theme) => ({
        id: theme.id,
        label: t(locale, theme.id as GlobeMessageKey),
        swatch: `#${theme.colors.mint.toString(16).padStart(6, "0")}`,
      })),
    [locale],
  )

  const textureModes = useMemo(
    () =>
      Object.values(TEXTURE_MODES).map((mode) => ({
        id: mode.id,
        label:
          mode.id === "off"
            ? t(locale, "noTexture")
            : mode.id === "day"
              ? t(locale, "daytime")
              : t(locale, "nighttime"),
        caption: mode.caption,
      })),
    [locale],
  )

  const baseLayers: readonly ToolbarLayerItem[] = useMemo(() => {
    if (!state) return []
    return BASE_LAYER_DEFINITIONS.map((definition) => {
      const itemState = definition.effect
        ? state.effects[definition.id]
        : state.layers[definition.id]
      return {
        ...definition,
        label: t(locale, definition.labelKey),
        visible: definition.effect
          ? ((itemState as EffectState | undefined)?.enabled ?? false)
          : ((itemState as LayerState | undefined)?.visible ?? false),
        status: itemState?.status ?? "idle",
        error: itemState?.error ?? null,
      }
    })
  }, [state, locale])

  const dataLayers: readonly ToolbarLayerItem[] = useMemo(() => {
    if (!state) return []
    return DATA_LAYER_DEFINITIONS.map((definition) => {
      const itemState = state.layers[definition.id]
      return {
        ...definition,
        label: t(locale, definition.labelKey),
        visible: itemState?.visible ?? false,
        status: itemState?.status ?? "idle",
        error: itemState?.error ?? null,
      }
    })
  }, [state, locale])

  const handleToggleLayer = (id: string, visible: boolean): void => {
    if (id === EFFECT_IDS.atmosphereMotion) {
      controls.setEffectEnabled(id, visible)
    } else {
      controls.setLayerVisible(id, visible)
    }
  }

  const loadingMessage = state
    ? translateLoadingMessage(state.loading.message, locale)
    : t(locale, "loading")
  const loadingProgress =
    phase === "recovering" ? 0.72 : state?.loading.progress ?? 0

  const activeLocation: GlobeActiveLocation | null | undefined =
    state?.activeLocation

  return (
    <main
      className="globe-page"
      data-theme={state?.theme ?? "emerald"}
      data-phase={phase}
      data-reduced-motion={reducedMotion ? "true" : "false"}
    >
      <GlobeCanvas canvasRef={canvasRef} state={state} status={status} />
      <div className="globe-vignette" aria-hidden="true" />
      <div className="globe-scanlines" aria-hidden="true" />

      {state ? (
        <>
          <GlobeHeader
            phase={phase}
            quality={state.quality}
            fps={diagnostics?.fps ?? 0}
            drawCalls={diagnostics?.drawCalls ?? 0}
            locale={locale}
          />
          <ThemeSwitcher
            themes={themes}
            current={state.theme}
            accent={state.accent ?? "#63f5cb"}
            locale={locale}
            onSelect={controls.setTheme}
            onSelectCustom={controls.setCustomAccentColor}
          />
          <TextureSwitcher
            modes={textureModes}
            current={state.texture.mode}
            disabled={state.texture.status !== "ready"}
            locale={locale}
            onSelect={(modeId) =>
              controls.setTextureMode(modeId as GlobeTextureModeValue)
            }
          />
          <LanguageSwitcher current={locale} onSelect={handleLocaleChange} />
          <EffectToolbar
            baseLayers={baseLayers}
            dataLayers={dataLayers}
            locale={locale}
            onToggle={handleToggleLayer}
          />
          <GlobeControls
            autoRotate={state.autoRotate}
            interacting={state.interacting}
            locale={locale}
            onToggleRotate={controls.setAutoRotate}
            onReset={controls.resetView}
          />
          <VisualControls
            haloDensity={state.densities.halo}
            starDensity={state.densities.starfield}
            locale={locale}
            onUpdateHalo={(value) => controls.setVisualDensity("halo", value)}
            onUpdateStar={(value) =>
              controls.setVisualDensity("starfield", value)
            }
          />
          <GlobeGuide locale={locale} />
          <GlobeCoordinate
            coordinate={diagnostics?.cameraCoordinate ?? [0, 0]}
          />
          <GlobeTooltip location={activeLocation} locale={locale} />
        </>
      ) : null}

      {loadingVisible ? (
        <GlobeLoading
          message={loadingMessage}
          progress={loadingProgress}
          leaving={loadingLeaving}
        />
      ) : null}
    </main>
  )
}
