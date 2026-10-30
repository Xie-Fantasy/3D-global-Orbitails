import { Clock, Color, Group, Scene, SRGBColorSpace, WebGLRenderer } from "three"
import {
  BASE_LAYER_IDS,
  DATA_LAYER_IDS,
  EFFECT_IDS,
  resolveGlobeTheme,
  TEXTURE_MODES,
  VIEW_PRESETS,
} from "../config/globe.config.js"
import { CountryService } from "../services/CountryService.js"
import { GlobeAssetService } from "../services/GlobeAssetService.js"
import { GlobeInteractionService } from "../services/GlobeInteractionService.js"
import { GlobeCameraController } from "./GlobeCameraController.js"
import { GlobeContextRecovery } from "./GlobeContextRecovery.js"
import { GlobeDiagnostics } from "./GlobeDiagnostics.js"
import { GlobeLifecycle } from "./GlobeLifecycle.js"
import { GlobeQuality } from "./GlobeQuality.js"
import { createGlobeLayers } from "./createGlobeLayers.js"
import { createGlobeState } from "./createGlobeState.js"
import { mountGlobeLayers } from "./mountGlobeLayers.js"

export class GlobeWorld {
  constructor(canvas, options = {}) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError("GlobeWorld requires a canvas element")
    }

    this.canvas = canvas
    this.container = canvas.parentElement
    this.options = options
    this.lifecycle = new GlobeLifecycle()
    this.clock = new Clock()
    this.quality = new GlobeQuality(options.quality)
    this.theme = resolveGlobeTheme(options.theme)
    this.layers = new Map()
    this.frameId = null
    this.paused = false
    this.disposed = false
    this.currentSize = null
    this.state = createGlobeState(this.quality.id, this.theme.id)
    this.state.accent = `#${this.theme.colors.mint.toString(16).padStart(6, "0")}`
    this.diagnostics = new GlobeDiagnostics(this.quality.id)
  }

  async load() {
    if (this.disposed || ["entering", "ready"].includes(this.state.phase)) {
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
      await this.cameraController.playIntro(this.globeRoot)
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

  createRuntime() {
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
      }
    )

    this.globeRoot = new Group()
    this.globeRoot.name = "globe-root"
    this.scene.add(this.globeRoot)
  }

  createLayers() {
    const result = createGlobeLayers({
      container: this.container,
      globeRoot: this.globeRoot,
      options: this.options,
      pixelRatio: this.quality.pixelRatio,
      quality: this.quality.preset,
      scene: this.scene,
      textures: this.assets.textures,
    })
    this.dataService = result.dataService
    const mounted = mountGlobeLayers(result.entries, this.state, result.errors)
    this.layers = mounted.layers
    this.markerLayer = this.layers.get(DATA_LAYER_IDS.markers)
    this.labelLayer = this.layers.get(DATA_LAYER_IDS.labels)
    this.earthLayer = this.layers.get(BASE_LAYER_IDS.earth)
    this.boundaryLayer = this.layers.get(BASE_LAYER_IDS.boundaries)
    this.countryService = new CountryService()
    this.selectableLayers = result.selectableLayers.filter((layer) =>
      [...this.layers.values()].includes(layer)
    )
    this.state.layerIssues = mounted.issues
    this.layers.forEach((layer) => layer.setTheme?.(this.theme))
    const atmosphereState = this.state.layers[BASE_LAYER_IDS.atmosphere]
    const atmosphereEffect = this.state.effects[EFFECT_IDS.atmosphereMotion]
    atmosphereEffect.status = atmosphereState.status
    atmosphereEffect.error = atmosphereState.error
    atmosphereEffect.enabled =
      this.layers
        .get(BASE_LAYER_IDS.atmosphere)
        ?.setAnimationEnabled(atmosphereEffect.enabled) ?? false
    this.emitState()
  }

  createInteraction() {
    const interactiveObjects = this.markerLayer?.getInteractiveObjects() ?? []
    this.interactionService = new GlobeInteractionService(
      this.canvas,
      this.cameraController.camera,
      interactiveObjects,
      {
        onHover: (locationId) => this.setHoveredLocation(locationId),
        onSelect: (locationId) => this.selectLocation(locationId),
        onSurfaceSelect: (coordinate) => this.selectCountryAtCoordinate(coordinate),
        onEscape: () => this.clearSelection(),
        surfaceObject: this.earthLayer?.getInteractiveObject(),
      }
    )
    const markersVisible = this.state.layers[DATA_LAYER_IDS.markers].visible
    this.interactionService.setMarkersEnabled(
      interactiveObjects.length > 0 && markersVisible
    )
  }

  bindLifecycle() {
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
        this.state.error = "图形上下文暂时中断，正在尝试恢复。"
        this.emitState()
      },
      onTimeout: () => {
        this.state.phase = "fatal-error"
        this.state.error = "图形上下文恢复超时，请重试。"
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

  getSize() {
    const bounds = this.container.getBoundingClientRect()
    return {
      width: Math.max(1, Math.floor(bounds.width)),
      height: Math.max(1, Math.floor(bounds.height)),
      pixelRatio: this.quality.pixelRatio,
    }
  }

  resize() {
    if (!this.renderer || !this.cameraController || this.disposed) {
      return
    }

    const size = this.getSize()
    this.currentSize = size
    this.renderer.setPixelRatio(size.pixelRatio)
    this.renderer.setSize(size.width, size.height, false)
    this.cameraController.resize(size.width / size.height)
    this.layers.forEach((layer) => layer.resize(size))
  }

  start() {
    if (this.frameId !== null || this.disposed) {
      return
    }

    const tick = () => {
      if (this.disposed) {
        return
      }

      this.frameId = window.requestAnimationFrame(tick)
      if (this.paused) {
        return
      }

      const frameDelta = this.clock.getDelta()
      const delta = Math.min(frameDelta, 0.05)
      this.cameraController.update(delta)
      this.layers.forEach((layer) => {
        if (layer.group.visible) {
          layer.update(delta, this.clock.elapsedTime, {
            camera: this.cameraController.camera,
            size: this.currentSize,
          })
        }
      })
      this.renderer.render(this.scene, this.cameraController.camera)
      this.diagnostics.recordFrame(frameDelta)
    }

    this.frameId = window.requestAnimationFrame(tick)
  }

  setLayerVisible(id, visible) {
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

  setEffectEnabled(id, enabled) {
    const effectState = this.state.effects[id]
    if (
      id !== EFFECT_IDS.atmosphereMotion ||
      effectState?.status !== "ready"
    ) {
      return false
    }

    const atmosphere = this.layers.get(BASE_LAYER_IDS.atmosphere)
    effectState.enabled =
      atmosphere?.setAnimationEnabled(Boolean(enabled)) ?? false
    this.emitState()
    return true
  }

  setTheme(themeId) {
    const theme = resolveGlobeTheme(themeId)
    if (!this.renderer || theme.id === this.state.theme) {
      return theme.id === this.state.theme
    }

    this.theme = theme
    this.state.theme = theme.id
    this.state.accent = `#${theme.colors.mint.toString(16).padStart(6, "0")}`
    this.scene.background.setHex(theme.colors.background)
    this.renderer.setClearColor(theme.colors.background, 1)
    this.layers.forEach((layer) => layer.setTheme?.(theme))
    this.emitState()
    return true
  }

  setCustomAccentColor(color) {
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

  setTextureMode(mode) {
    if (
      !TEXTURE_MODES[mode] ||
      this.state.texture.status !== "ready" ||
      !this.earthLayer
    ) {
      return false
    }

    this.earthLayer.setTextureMode(mode)
    this.state.texture.mode = mode
    this.emitState()
    return true
  }

  setLocale(locale) {
    this.labelLayer?.setLocale(locale)
  }

  applyPreset(presetId) {
    const preset = VIEW_PRESETS[presetId]
    if (!preset || !this.cameraController) {
      return false
    }

    this.setSelectedLocation(null, false)
    this.clearSelectedCountry(false)
    this.interactionService?.setHovered(null)
    this.state.preset = presetId
    this.cameraController.applyPreset(preset)
    this.emitState()
    return true
  }

  setHoveredLocation(locationId) {
    const nextId = this.dataService?.getLocation(locationId)?.id ?? null
    if (nextId === this.state.hoveredLocationId) {
      return
    }

    this.state.hoveredLocationId = nextId
    this.markerLayer?.setHovered(nextId)
    this.labelLayer?.setHovered(nextId)
    this.syncActiveLocation()
    this.emitState()
  }

  selectLocation(locationId) {
    const nextId =
      locationId && locationId === this.state.selectedLocationId
        ? null
        : this.dataService?.getLocation(locationId)?.id ?? null
    if (nextId) {
      this.clearSelectedCountry(false)
    }
    this.setSelectedLocation(nextId, Boolean(nextId))
  }

  setSelectedLocation(locationId, focus = true) {
    const nextId = this.dataService?.getLocation(locationId)?.id ?? null
    if (nextId === this.state.selectedLocationId) {
      return
    }

    this.state.selectedLocationId = nextId
    this.selectableLayers?.forEach((layer) => layer.setSelected(nextId))

    if (nextId && focus) {
      const location = this.dataService.getLocation(nextId)
      this.state.preset = "custom"
      this.cameraController.focusCoordinate(location.coordinate)
    } else if (!nextId) {
      this.cameraController?.releaseFocus()
    }

    this.syncActiveLocation()
    this.emitState()
  }

  syncActiveLocation() {
    const activeId =
      this.state.selectedLocationId ?? this.state.hoveredLocationId
    const location = this.dataService?.getLocation(activeId)
    this.state.activeLocation = location
      ? {
          ...location,
          interaction:
            location.id === this.state.selectedLocationId ? "selected" : "hovered",
        }
      : null
  }

  selectCountryAtCoordinate(coordinate) {
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
    this.state.selectedCountry = this.countryService.toState(country)
    this.state.preset = "custom"
    this.boundaryLayer?.setSelectedCountry(country.feature)
    this.cameraController.focusCoordinate(
      country.coordinate,
      country.focusDistance,
      1.55
    )
    this.emitState()
  }

  clearSelectedCountry(resumeAutoRotate = true) {
    if (!this.state.selectedCountry) {
      return false
    }
    this.state.selectedCountry = null
    this.boundaryLayer?.setSelectedCountry(null)
    if (resumeAutoRotate) {
      this.cameraController?.releaseFocus(true)
    }
    this.emitState()
    return true
  }

  clearSelection() {
    const hadCountry = this.clearSelectedCountry(true)
    if (!hadCountry) {
      this.setSelectedLocation(null, false)
    }
    this.interactionService?.setHovered(null)
  }

  setAutoRotate(enabled) {
    const nextValue = Boolean(enabled)
    this.cameraController?.setAutoRotate(nextValue)
    this.state.autoRotate = nextValue
    this.emitState()
  }

  resetView() {
    this.setSelectedLocation(null, false)
    this.clearSelectedCountry(false)
    this.interactionService?.setHovered(null)
    this.cameraController?.resetView()
    this.state.preset = "global"
    this.state.interacting = false
    this.emitState()
  }

  setVisualDensity(kind, value) {
    const normalized = Math.max(25, Math.min(250, Number(value) || 100))
    const layerId = kind === "halo" ? DATA_LAYER_IDS.particleHalo : BASE_LAYER_IDS.starfield
    const layer = this.layers.get(layerId)
    if (!layer?.setDensity) {
      return false
    }
    layer.setDensity(normalized)
    this.state.densities[kind === "halo" ? "halo" : "starfield"] = normalized
    this.emitState()
    return true
  }

  getDiagnostics() {
    return this.diagnostics.snapshot({
      camera: this.cameraController?.camera,
      dataService: this.dataService,
      layers: this.layers,
      renderer: this.renderer,
    })
  }

  setPhase(phase) {
    this.state.phase = phase
    this.emitState()
  }

  emitState() {
    this.options.onStateChange?.(JSON.parse(JSON.stringify(this.state)))
  }

  handleFatalError(error) {
    this.paused = true
    this.state.phase = "fatal-error"
    this.state.error = error instanceof Error ? error.message : "3D 地球初始化失败"
    this.emitState()
    this.options.onError?.(error)
  }

  dispose() {
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
