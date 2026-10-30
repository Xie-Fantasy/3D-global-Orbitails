import { BASE_LAYER_IDS, DATA_LAYER_IDS } from "../config/globe.config"
import { FLIGHT_ROUTES } from "../data/flightRoutes"
import { LOCATIONS } from "../data/locations"
import { TRANSPORT_ROUTES } from "../data/transportRoutes"
import { AtmosphereLayer } from "../layers/AtmosphereLayer"
import { BarLayer } from "../layers/BarLayer"
import { BoundaryLayer } from "../layers/BoundaryLayer"
import { EarthLayer } from "../layers/EarthLayer"
import { FlightArcLayer } from "../layers/FlightArcLayer"
import { LabelLayer } from "../layers/LabelLayer"
import { MarkerLayer } from "../layers/MarkerLayer"
import { ParticleHaloLayer } from "../layers/ParticleHaloLayer"
import { RouteLayer } from "../layers/RouteLayer"
import { StarfieldLayer } from "../layers/StarfieldLayer"
import { GlobeDataService } from "../services/GlobeDataService"
import type { QualityPreset } from "../config/quality.config"
import type { GlobeLayer, LayerIssue } from "../types/layers"
import type { Texture } from "three"
import type { Object3D } from "three"

export interface CreateGlobeLayersOptions {
  readonly container: HTMLElement
  readonly globeRoot: Object3D
  readonly options: {
    readonly locations?: readonly import("../types/data").RawLocation[]
    readonly flightRoutes?: readonly import("../types/data").RawRoute[]
    readonly transportRoutes?: readonly import("../types/data").RawRoute[]
  }
  readonly pixelRatio: number
  readonly quality: QualityPreset
  readonly scene: Object3D
  readonly textures: Record<string, Texture>
}

export interface CreateGlobeLayersResult {
  readonly dataService: GlobeDataService
  readonly entries: ReadonlyArray<readonly [string, GlobeLayer, Object3D]>
  readonly errors: readonly LayerIssue[]
  readonly layersById: Map<string, GlobeLayer>
  readonly selectableLayers: GlobeLayer[]
}

export function createGlobeLayers(
  params: CreateGlobeLayersOptions,
): CreateGlobeLayersResult {
  const { container, globeRoot, options, pixelRatio, quality, scene, textures } =
    params
  const dataService = new GlobeDataService({
    locations: options.locations ?? LOCATIONS,
    flightRoutes: options.flightRoutes ?? FLIGHT_ROUTES,
    transportRoutes: options.transportRoutes ?? TRANSPORT_ROUTES,
  })
  const data = dataService.getSnapshot()
  const entries: Array<[string, GlobeLayer, Object3D]> = []
  const errors: LayerIssue[] = []
  const layersById = new Map<string, GlobeLayer>()

  const addLayer = (
    id: string,
    parent: Object3D,
    createLayer: () => GlobeLayer,
    required = false,
  ): void => {
    try {
      const layer = createLayer()
      layersById.set(id, layer)
      entries.push([id, layer, parent])
    } catch (error) {
      if (required) {
        throw error
      }
      errors.push({
        id,
        status: "error",
        message:
          error instanceof Error ? error.message : "图层创建失败",
      })
    }
  }

  addLayer(
    BASE_LAYER_IDS.earth,
    globeRoot,
    () => new EarthLayer(quality, textures),
    true,
  )
  addLayer(DATA_LAYER_IDS.particleHalo, globeRoot, () =>
    new ParticleHaloLayer(quality, pixelRatio),
  )
  addLayer(BASE_LAYER_IDS.boundaries, globeRoot, () => new BoundaryLayer())
  addLayer(DATA_LAYER_IDS.landRoutes, globeRoot, () =>
    new RouteLayer(data.landRoutes, "land"),
  )
  addLayer(DATA_LAYER_IDS.seaRoutes, globeRoot, () =>
    new RouteLayer(data.seaRoutes, "sea"),
  )
  addLayer(DATA_LAYER_IDS.flightArcs, globeRoot, () =>
    new FlightArcLayer(data.flightRoutes),
  )
  addLayer(DATA_LAYER_IDS.bars, globeRoot, () => new BarLayer(data.locations))
  addLayer(DATA_LAYER_IDS.markers, globeRoot, () =>
    new MarkerLayer(data.locations),
  )
  addLayer(DATA_LAYER_IDS.labels, globeRoot, () =>
    new LabelLayer(data.locations, container),
  )
  addLayer(BASE_LAYER_IDS.atmosphere, globeRoot, () =>
    new AtmosphereLayer(quality),
  )
  addLayer(BASE_LAYER_IDS.starfield, scene, () =>
    new StarfieldLayer(quality, pixelRatio),
  )

  const selectableLayerIds = [
    DATA_LAYER_IDS.markers,
    DATA_LAYER_IDS.labels,
    DATA_LAYER_IDS.bars,
    DATA_LAYER_IDS.flightArcs,
    DATA_LAYER_IDS.landRoutes,
    DATA_LAYER_IDS.seaRoutes,
  ]
  const selectableLayers = selectableLayerIds
    .map((id) => layersById.get(id))
    .filter((layer): layer is GlobeLayer => Boolean(layer))

  return {
    dataService,
    entries,
    errors,
    layersById,
    selectableLayers,
  }
}
