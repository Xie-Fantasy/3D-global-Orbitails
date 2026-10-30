import {
  Clock,
  Color,
  Group,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
  type Texture,
} from "three"
import {
  BASE_LAYER_IDS,
  DATA_LAYER_IDS,
  DEFAULT_THEME_ID,
  EFFECT_IDS,
  resolveGlobeTheme,
  TEXTURE_MODES,
} from "../config/globe.config"
import type { QualityPresetId } from "../config/quality.config"
import { CountryService } from "../services/CountryService"
import { GlobeAssetService } from "../services/GlobeAssetService"
import { GlobeInteractionService } from "../services/GlobeInteractionService"
import { GlobeCameraController } from "./GlobeCameraController"
import { GlobeContextRecovery } from "./GlobeContextRecovery"
import { GlobeDiagnostics } from "./GlobeDiagnostics"
import { GlobeLifecycle } from "./GlobeLifecycle"
import { GlobeQuality } from "./GlobeQuality"
import { createGlobeLayers } from "./createGlobeLayers"
import { createGlobeState } from "./createGlobeState"
import { mountGlobeLayers } from "./mountGlobeLayers"
import type { GlobeLayer, GlobeTheme } from "../types/layers"
import type { GlobeState } from "../types/state"
import type { LonLat, RawLocation, RawRoute } from "../types/data"

export interface GlobeWorldOptions {
  readonly theme?: string
  readonly quality?: QualityPresetId
  readonly locations?: readonly RawLocation[]
  readonly flightRoutes?: readonly RawRoute[]
  readonly transportRoutes?: readonly RawRoute[]
  readonly onStateChange?: (state: GlobeState) => void
  readonly onError?: (error: unknown) => void
}

interface RuntimeSize {
  width: number
  height: number
  pixelRatio: number
}

export class GlobeWorld {
  private readonly canvas: HTMLCanvasElement
  private container: HTMLElement
  private readonly options: GlobeWorldOptions
  private readonly lifecycle: GlobeLifecycle
  private readonly clock: Clock
  private readonly quality: GlobeQuality
  private theme: GlobeTheme
  private readonly layers: Map<string, GlobeLayer> = new Map()
  private frameId: number | null = null
  private paused = false
  private disposed = false
  private currentSize: RuntimeSize | null = null
  private readonly state: GlobeState
  private readonly diagnostics: GlobeDiagnostics
  private renderer: WebGLRenderer | null = null
  private scene: Scene | null = null
  private cameraController: GlobeCameraController | null = null
  private globeRoot: Group | null = null
  private assetService: GlobeAssetService | null = null
  private assets: { textures: Record<string, Texture> } | null = null
  private dataService: import("../services/GlobeDataService").GlobeDataService | null =
    null
  private markerLayer: GlobeLayer | undefined
  private labelLayer: GlobeLayer | undefined
  private earthLayer: GlobeLayer | undefined
  private boundaryLayer: GlobeLayer | undefined
  private countryService: CountryService | null = null
  private selectableLayers: GlobeLayer[] = []
  private interactionService: GlobeInteractionService | null = null
  private contextRecovery: GlobeContextRecovery | null = null

  constructor(canvas: HTMLCanvasElement, options: GlobeWorldOptions = {}) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError("GlobeWorld requires a canvas element")
    }

    const container = canvas.parentElement
    if (!container) {
      throw new TypeError("GlobeWorld requires a canvas mounted in a container")
    }

    this.canvas = canvas
    this.container = container
    this.options = options
    this.lifecycle = new GlobeLifecycle()
    this.clock = new Clock()
    this.quality = new GlobeQuality(options.quality)
    this.theme = resolveGlobeTheme(options.theme ?? DEFAULT_THEME_ID)
    this.state = createGlobeState(this.quality.id, this.theme.id)
    this.state.accent = `#${this.theme.colors.mint
      .toString(16)
      .padStart(6, "0")}`
    this.diagnostics = new GlobeDiagnostics(this.quality.id)
  }

  async load(): Promise<boolean> {
    if (
      this.disposed ||
      this.state.phase === "entering" ||
      this.state.phase === "ready"
    ) {
      return false
    }

    this.setPhase("loading")
    this.state.texture.status = "loading"
    this.assetService = new GlobeAssetService()

    try {
      const assets = await this.assetService.load((progress, message) => {
        this.state.loading.progress = progress
        this.state.loading.message = message
        this.emitState()
      })
      if (this.disposed) {
        this.assetService.dispose()
        return false
      }
      this.assets = assets
      this.createRuntime()
      this.createLayers()
      this.createInteraction()
      this.bindLifecycle()
      this.resize()
      this.state.texture.status = "ready"
      this.state.autoRotate = true
      this.state.densities = { halo: 100, starfield: 100 }
      this.start()
      this.setPhase("entering")
      await this.cameraController?.playIntro(this.globeRoot as Group)
      if (this.disposed) {
        return false
      }
      this.setPhase("ready")
      return true
    } catch (error) {
      this.handleFatalError(error)
      return false
    }
  }

  private createRuntime(): void {
    const size = this.getSize()
    this.currentSize = size
    this.scene = new Scene()
    this.scene.background = new Color(this.theme.colors.background)

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      alpha: false,
      antialias: this.quality.preset.antialias,
      powerPreference: "high-performance",
    })
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.setClearColor(this.theme.colors.background, 1)
    this.renderer.setPixelRatio(this.quality.pixelRatio)
    this.renderer.setSize(size.width, size.height, false)

    this.cameraController = new GlobeCameraController(
      this.canvas,
      size.width / size.height,
      {
        onPresetChange: (preset) => {
          this.state.preset = preset
          this.emitState()
        },
        onInteractionChange: (interacting) => {
          this.state.interacting = interacting
          this.emitState()
        },
      },
    )

    this.globeRoot = new Group()
    this.globeRoot.name = "globe-root"
    this.scene.add(this.globeRoot)
  }

  private createLayers(): void {
    const result = createGlobeLayers({
      container: this.container,
      globeRoot: this.globeRoot as Group,
      options: this.options,
      pixelRatio: this.quality.pixelRatio,
      quality: this.quality.preset,
      scene: this.scene as Scene,
      textures: this.assets?.textures ?? {},
    })
    this.dataService = result.dataService
    const mounted = mountGlobeLayers(result.entries, this.state, result.errors)
    this.layers.clear()
    mounted.layers.forEach((layer, id) => this.layers.set(id, layer))
    this.markerLayer = this.layers.get(DATA_LAYER_IDS.markers)
    this.labelLayer = this.layers.get(DATA_LAYER_IDS.labels)
    this.earthLayer = this.layers.get(BASE_LAYER_IDS.earth)
    this.boundaryLayer = this.layers.get(BASE_LAYER_IDS.boundaries)
    this.countryService = new CountryService()
    this.selectableLayers = result.selectableLayers.filter((layer) =>
      [...this.layers.values()].includes(layer),
    )
    this.state.layerIssues = mounted.issues
    this.layers.forEach((layer) => layer.setTheme?.(this.theme))

    const atmosphereState = this.state.layers[BASE_LAYER_IDS.atmosphere]
    const atmosphereEffect = this.state.effects[EFFECT_IDS.atmosphereMotion]
    if (atmosphereState && atmosphereEffect) {
      atmosphereEffect.status = atmosphereState.status
      atmosphereEffect.error = atmosphereState.error
      atmosphereEffect.enabled =
        this.layers
          .get(BASE_LAYER_IDS.atmosphere)
          ?.setAnimationEnabled?.(atmosphereEffect.enabled) ?? false
    }
    this.emitState()
  }

  private createInteraction(): void {
    const interactiveObjects =
      this.markerLayer?.getInteractiveObjects?.() ?? []
    this.interactionService = new GlobeInteractionService(
      this.canvas,
      this.cameraController?.camera as GlobeCameraController["camera"],
      interactiveObjects,
      {
        onHover: (locationId) => this.setHoveredLocation(locationId),
        onSelect: (locationId) => this.selectLocation(locationId),
        onSurfaceSelect: (coordinate) =>
          this.selectCountryAtCoordinate(coordinate),
        onEscape: () => this.clearSelection(),
        surfaceObject: this.earthLayer?.getInteractiveObject?.() ?? null,
      },
    )
    const markersVisible =
      this.state.layers[DATA_LAYER_IDS.markers]?.visible ?? false
    this.interactionService.setMarkersEnabled(
      interactiveObjects.length > 0 && markersVisible,
    )
  }

  private bindLifecycle(): void {
    const resizeObserver = new ResizeObserver(() => this.resize())
    resizeObserver.observe(this.container)
    this.lifecycle.addObserver(resizeObserver)

    this.lifecycle.addEvent(document, "visibilitychange", () => {
      this.paused = document.hidden
      if (!this.paused) {
        this.clock.getDelta()
      }
    })

    this.contextRecovery = new GlobeContextRecovery(this.canvas, this.lifecycle, {
      onLost: () => {
        this.paused = true
        this.state.phase = "recovering"
        this.state.error = {
          code: "context-lost",
          message: "图形上下文暂时中断，正在尝试恢复。",
          recoverable: true,
        }
        this.emitState()
      },
      onTimeout: () => {
        this.state.phase = "fatal-error"
        this.state.error = {
          code: "context-timeout",
          message: "图形上下文恢复超时，请重试。",
          recoverable: true,
        }
        this.emitState()
      },
      onRestored: () => {
        this.renderer?.resetState()
        this.resize()
        this.clock.getDelta()
        this.state.error = null
        this.state.phase = "ready"
        this.paused = false
        this.emitState()
      },
    })
    this.contextRecovery.bind()
  }

  private getSize(): RuntimeSize {
    const bounds = this.container.getBoundingClientRect()
    return {
      width: Math.max(1, Math.floor(bounds.width)),
      height: Math.max(1, Math.floor(bounds.height)),
      pixelRatio: this.quality.pixelRatio,
    }
  }

  resize(): void {
    if (!this.renderer || !this.cameraController || this.disposed) {
      return
    }

    const size = this.getSize()
    this.currentSize = size
    this.renderer.setPixelRatio(size.pixelRatio)
    this.renderer.setSize(size.width, size.height, false)
    this.cameraController.resize(size.width / size.height)
    this.layers.forEach((layer) =>
      layer.resize({
        width: size.width,
        height: size.height,
        pixelRatio: size.pixelRatio,
      }),
    )
  }

  private start(): void {
    if (this.frameId !== null || this.disposed) {
      return
    }

    const tick = (): void => {
      if (this.disposed) {
        return
      }

      this.frameId = window.requestAnimationFrame(tick)
      if (this.paused) {
        return
      }

      const frameDelta = this.clock.getDelta()
      const delta = Math.min(frameDelta, 0.05)
      this.cameraController?.update(delta)
      this.layers.forEach((layer) => {
        if (layer.group.visible) {
          layer.update(delta, this.clock.elapsedTime, {
            camera: this.cameraController?.camera as GlobeCameraController["camera"],
            size: {
              width: this.currentSize?.width ?? 1,
              height: this.currentSize?.height ?? 1,
            },
          })
        }
      })
      if (this.renderer && this.cameraController) {
        this.renderer.render(this.scene as Scene, this.cameraController.camera)
      }
      this.diagnostics.recordFrame(frameDelta)
    }

    this.frameId = window.requestAnimationFrame(tick)
  }

  setLayerVisible(id: string, visible: boolean): boolean {
    const layer = this.layers.get(id)
    const layerState = this.state.layers[id]
    if (!layer || !layerState || layerState.status !== "ready") {
      return false
    }

    const normalizedVisible = Boolean(visible)
    layer.setVisible(normalizedVisible)
    layerState.visible = normalizedVisible
    if (id === DATA_LAYER_IDS.markers) {
      this.interactionService?.setMarkersEnabled(normalizedVisible)
      if (!normalizedVisible) {
        this.setHoveredLocation(null)
        this.setSelectedLocation(null, false)
      }
    }
    this.emitState()
    return true
  }

  setEffectEnabled(id: string, enabled: boolean): boolean {
    const effectState = this.state.effects[id]
    if (
      id !== EFFECT_IDS.atmosphereMotion ||
      effectState?.status !== "ready"
    ) {
      return false
    }

    const atmosphere = this.layers.get(BASE_LAYER_IDS.atmosphere)
    effectState.enabled =
      atmosphere?.setAnimationEnabled?.(Boolean(enabled)) ?? false
    this.emitState()
    return true
  }

  setTheme(themeId: string): boolean {
    const theme = resolveGlobeTheme(themeId)
    if (!this.renderer || theme.id === this.state.theme) {
      return theme.id === this.state.theme
    }

    this.theme = theme
    this.state.theme = theme.id
    this.state.accent = `#${theme.colors.mint
      .toString(16)
      .padStart(6, "0")}`
    if (this.scene && this.scene.background) {
      ;(this.scene.background as Color).setHex(theme.colors.background)
    }
    this.renderer.setClearColor(theme.colors.background, 1)
    this.layers.forEach((layer) => layer.setTheme?.(theme))
    this.emitState()
    return true
  }

  setCustomAccentColor(color: string): boolean {
    if (!this.renderer || !/^#[0-9a-f]{6}$/i.test(color)) {
      return false
    }

    const accent = Number.parseInt(color.slice(1), 16)
    this.theme = {
      ...this.theme,
      colors: {
        ...this.theme.colors,
        mint: accent,
        cyan: accent,
        halo: accent,
        boundary: accent,
      },
    }
    this.state.accent = color.toLowerCase()
    this.layers.forEach((layer) => layer.setTheme?.(this.theme))
    this.emitState()
    return true
  }

  setTextureMode(mode: string): boolean {
    if (
      !TEXTURE_MODES[mode as keyof typeof TEXTURE_MODES] ||
      this.state.texture.status !== "ready" ||
      !this.earthLayer
    ) {
      return false
    }

    this.earthLayer.setTextureMode?.(mode as GlobeTextureModeValue)
    this.state.texture.mode = mode as GlobeTextureModeValue
    this.emitState()
    return true
  }

  setLocale(locale: import("../types/data").GlobeLocale): void {
    this.labelLayer?.setLocale?.(locale)
  }

  setHoveredLocation(locationId: string | null): void {
    const nextId = this.dataService?.getLocation(locationId ?? "")?.id ?? null
    if (nextId === this.state.hoveredLocationId) {
      return
    }

    this.state.hoveredLocationId = nextId
    this.markerLayer?.setHovered?.(nextId)
    this.labelLayer?.setHovered?.(nextId)
    this.syncActiveLocation()
    this.emitState()
  }

  selectLocation(locationId: string | null): void {
    const nextId =
      locationId && locationId === this.state.selectedLocationId
        ? null
        : this.dataService?.getLocation(locationId ?? "")?.id ?? null
    if (nextId) {
      this.clearSelectedCountry(false)
    }
    this.setSelectedLocation(nextId, Boolean(nextId))
  }

  setSelectedLocation(locationId: string | null, focus = true): void {
    const nextId = this.dataService?.getLocation(locationId ?? "")?.id ?? null
    if (nextId === this.state.selectedLocationId) {
      return
    }

    this.state.selectedLocationId = nextId
    this.selectableLayers.forEach((layer) => layer.setSelected?.(nextId))

    if (nextId && focus) {
      const location = this.dataService?.getLocation(nextId)
      if (location) {
        this.state.preset = "custom"
        this.cameraController?.focusCoordinate(location.coordinate)
      }
    } else if (!nextId) {
      this.cameraController?.releaseFocus()
    }

    this.syncActiveLocation()
    this.emitState()
  }

  private syncActiveLocation(): void {
    const activeId =
      this.state.selectedLocationId ?? this.state.hoveredLocationId
    const location = this.dataService?.getLocation(activeId ?? "")
    this.state.activeLocation = location
      ? {
          ...location,
          interaction:
            location.id === this.state.selectedLocationId
              ? "selected"
              : "hovered",
        }
      : null
  }

  selectCountryAtCoordinate(coordinate: LonLat | null): void {
    if (!coordinate) {
      return
    }
    const country = this.countryService?.findCountry(coordinate)
    if (!country) {
      return
    }
    if (country.id === this.state.selectedCountry?.id) {
      this.clearSelectedCountry(true)
      return
    }

    this.setSelectedLocation(null, false)
    this.state.selectedCountry = this.countryService?.toState(country) ?? null
    this.state.preset = "custom"
    this.boundaryLayer?.setSelectedCountry?.(country.feature)
    this.cameraController?.focusCoordinate(
      country.coordinate,
      country.focusDistance,
      1.55,
    )
    this.emitState()
  }

  clearSelectedCountry(resumeAutoRotate = true): boolean {
    if (!this.state.selectedCountry) {
      return false
    }
    this.state.selectedCountry = null
    this.boundaryLayer?.setSelectedCountry?.(null)
    if (resumeAutoRotate) {
      this.cameraController?.releaseFocus(true)
    }
    this.emitState()
    return true
  }

  clearSelection(): void {
    const hadCountry = this.clearSelectedCountry(true)
    if (!hadCountry) {
      this.setSelectedLocation(null, false)
    }
    this.interactionService?.clearHover()
  }

  setAutoRotate(enabled: boolean): void {
    const nextValue = Boolean(enabled)
    this.cameraController?.setAutoRotate(nextValue)
    this.state.autoRotate = nextValue
    this.emitState()
  }

  resetView(): void {
    this.setSelectedLocation(null, false)
    this.clearSelectedCountry(false)
    this.cameraController?.resetView()
    this.interactionService?.clearHover()
    this.state.preset = "global"
    this.state.interacting = false
    this.emitState()
  }

  setVisualDensity(kind: "halo" | "starfield", value: number): boolean {
    const normalized = Math.max(25, Math.min(250, Number(value) || 100))
    const layerId =
      kind === "halo"
        ? DATA_LAYER_IDS.particleHalo
        : BASE_LAYER_IDS.starfield
    const layer = this.layers.get(layerId)
    if (!layer?.setDensity) {
      return false
    }
    layer.setDensity(normalized)
    this.state.densities = {
      halo: kind === "halo" ? normalized : this.state.densities.halo,
      starfield:
        kind === "starfield" ? normalized : this.state.densities.starfield,
    }
    this.emitState()
    return true
  }

  getDiagnostics() {
    return this.diagnostics.snapshot({
      camera: this.cameraController?.camera,
      dataService: this.dataService ?? undefined,
      layers: this.layers.values(),
      renderer: this.renderer ?? undefined,
    })
  }

  private setPhase(phase: GlobeState["phase"]): void {
    this.state.phase = phase
    this.emitState()
  }

  private emitState(): void {
    const snapshot = JSON.parse(JSON.stringify(this.state)) as GlobeState
    this.options.onStateChange?.(snapshot)
  }

  private handleFatalError(error: unknown): void {
    this.paused = true
    this.state.phase = "fatal-error"
    this.state.error = {
      code: "fatal",
      message:
        error instanceof Error ? error.message : "3D 地球初始化失败",
      recoverable: true,
    }
    this.emitState()
    this.options.onError?.(error)
  }

  dispose(): void {
    if (this.disposed) {
      return
    }

    this.disposed = true
    if (this.frameId !== null) {
      window.cancelAnimationFrame(this.frameId)
      this.frameId = null
    }

    this.lifecycle.dispose()
    this.contextRecovery?.dispose()
    this.interactionService?.dispose()
    this.cameraController?.dispose()
    this.layers.forEach((layer) => layer.dispose())
    this.layers.clear()
    this.assetService?.dispose()
    this.renderer?.renderLists.dispose()
    this.renderer?.dispose()
    this.renderer?.forceContextLoss()

    this.state.phase = "disposed"
    this.state.error = null
  }
}

type GlobeTextureModeValue = "off" | "day" | "night"
