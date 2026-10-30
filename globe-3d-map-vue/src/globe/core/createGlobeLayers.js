import { BASE_LAYER_IDS, DATA_LAYER_IDS } from "../config/globe.config.js"
import { FLIGHT_ROUTES } from "../data/flightRoutes.js"
import { LOCATIONS } from "../data/locations.js"
import { TRANSPORT_ROUTES } from "../data/transportRoutes.js"
import { AtmosphereLayer } from "../layers/AtmosphereLayer.js"
import { BarLayer } from "../layers/BarLayer.js"
import { BoundaryLayer } from "../layers/BoundaryLayer.js"
import { EarthLayer } from "../layers/EarthLayer.js"
import { FlightArcLayer } from "../layers/FlightArcLayer.js"
import { LabelLayer } from "../layers/LabelLayer.js"
import { MarkerLayer } from "../layers/MarkerLayer.js"
import { ParticleHaloLayer } from "../layers/ParticleHaloLayer.js"
import { RouteLayer } from "../layers/RouteLayer.js"
import { StarfieldLayer } from "../layers/StarfieldLayer.js"
import { GlobeDataService } from "../services/GlobeDataService.js"

export function createGlobeLayers({
  container,
  globeRoot,
  options,
  pixelRatio,
  quality,
  scene,
  textures,
}) {
  const dataService = new GlobeDataService({
    locations: options.locations ?? LOCATIONS,
    flightRoutes: options.flightRoutes ?? FLIGHT_ROUTES,
    transportRoutes: options.transportRoutes ?? TRANSPORT_ROUTES,
  })
  const data = dataService.getSnapshot()
  const entries = []
  const errors = []
  const layersById = new Map()

  const addLayer = (id, parent, createLayer, required = false) => {
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
        message: error instanceof Error ? error.message : "图层创建失败",
      })
    }
  }

  addLayer(BASE_LAYER_IDS.earth, globeRoot, () => new EarthLayer(quality, textures), true)
  addLayer(DATA_LAYER_IDS.particleHalo, globeRoot, () =>
    new ParticleHaloLayer(quality, pixelRatio)
  )
  addLayer(BASE_LAYER_IDS.boundaries, globeRoot, () => new BoundaryLayer())
  addLayer(DATA_LAYER_IDS.landRoutes, globeRoot, () =>
    new RouteLayer(data.landRoutes, "land")
  )
  addLayer(DATA_LAYER_IDS.seaRoutes, globeRoot, () =>
    new RouteLayer(data.seaRoutes, "sea")
  )
  addLayer(DATA_LAYER_IDS.flightArcs, globeRoot, () =>
    new FlightArcLayer(data.flightRoutes)
  )
  addLayer(DATA_LAYER_IDS.bars, globeRoot, () => new BarLayer(data.locations))
  addLayer(DATA_LAYER_IDS.markers, globeRoot, () =>
    new MarkerLayer(data.locations)
  )
  addLayer(DATA_LAYER_IDS.labels, globeRoot, () =>
    new LabelLayer(data.locations, container)
  )
  addLayer(BASE_LAYER_IDS.atmosphere, globeRoot, () =>
    new AtmosphereLayer(quality)
  )
  addLayer(BASE_LAYER_IDS.starfield, scene, () =>
    new StarfieldLayer(quality, pixelRatio)
  )

  return {
    dataService,
    entries,
    errors,
    layersById,
    selectableLayers: [
      DATA_LAYER_IDS.markers,
      DATA_LAYER_IDS.labels,
      DATA_LAYER_IDS.bars,
      DATA_LAYER_IDS.flightArcs,
      DATA_LAYER_IDS.landRoutes,
      DATA_LAYER_IDS.seaRoutes,
    ]
      .map((id) => layersById.get(id))
      .filter(Boolean),
  }
}
