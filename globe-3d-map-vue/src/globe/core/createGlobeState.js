import {
  BASE_LAYER_IDS,
  DATA_LAYER_IDS,
  DEFAULT_TEXTURE_MODE,
  DEFAULT_THEME_ID,
  EFFECT_IDS,
} from "../config/globe.config.js"

export function createGlobeState(quality, theme = DEFAULT_THEME_ID) {
  return {
    phase: "idle",
    quality,
    theme,
    accent: null,
    preset: "global",
    autoRotate: true,
    densities: {
      halo: 100,
      starfield: 100,
    },
    interacting: false,
    hoveredLocationId: null,
    selectedLocationId: null,
    selectedCountry: null,
    activeLocation: null,
    error: null,
    layerIssues: [],
    loading: {
      progress: 0,
      message: "loading",
    },
    texture: {
      mode: DEFAULT_TEXTURE_MODE,
      status: "idle",
      error: null,
    },
    effects: {
      [EFFECT_IDS.atmosphereMotion]: {
        enabled: true,
        status: "idle",
        error: null,
      },
    },
    layers: {
      [BASE_LAYER_IDS.earth]: { visible: true, status: "idle", error: null },
      [BASE_LAYER_IDS.atmosphere]: { visible: true, status: "idle", error: null },
      [BASE_LAYER_IDS.boundaries]: { visible: true, status: "idle", error: null },
      [BASE_LAYER_IDS.starfield]: { visible: true, status: "idle", error: null },
      [DATA_LAYER_IDS.markers]: { visible: true, status: "idle", error: null },
      [DATA_LAYER_IDS.labels]: { visible: true, status: "idle", error: null },
      [DATA_LAYER_IDS.bars]: { visible: false, status: "idle", error: null },
      [DATA_LAYER_IDS.flightArcs]: { visible: true, status: "idle", error: null },
      [DATA_LAYER_IDS.landRoutes]: { visible: true, status: "idle", error: null },
      [DATA_LAYER_IDS.seaRoutes]: { visible: true, status: "idle", error: null },
      [DATA_LAYER_IDS.particleHalo]: { visible: true, status: "idle", error: null },
    },
  }
}
