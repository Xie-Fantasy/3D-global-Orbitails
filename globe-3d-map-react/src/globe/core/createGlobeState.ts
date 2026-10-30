import {
  BASE_LAYER_IDS,
  DATA_LAYER_IDS,
  DEFAULT_TEXTURE_MODE,
  DEFAULT_THEME_ID,
  EFFECT_IDS,
} from "../config/globe.config"
import type { QualityPresetId } from "../config/quality.config"
import type { GlobeState, LayerState } from "../types/state"

function idleLayer(visible: boolean): LayerState {
  return { visible, status: "idle", error: null }
}

export function createGlobeState(
  quality: QualityPresetId,
  theme: string = DEFAULT_THEME_ID,
): GlobeState {
  return {
    phase: "idle",
    quality,
    theme,
    accent: null,
    preset: "global",
    autoRotate: true,
    densities: { halo: 100, starfield: 100 },
    interacting: false,
    hoveredLocationId: null,
    selectedLocationId: null,
    selectedCountry: null,
    activeLocation: null,
    error: null,
    layerIssues: [],
    loading: { progress: 0, message: "loading" },
    texture: { mode: DEFAULT_TEXTURE_MODE, status: "idle", error: null },
    effects: {
      [EFFECT_IDS.atmosphereMotion]: {
        enabled: true,
        status: "idle",
        error: null,
      },
    },
    layers: {
      [BASE_LAYER_IDS.earth]: idleLayer(true),
      [BASE_LAYER_IDS.atmosphere]: idleLayer(true),
      [BASE_LAYER_IDS.boundaries]: idleLayer(true),
      [BASE_LAYER_IDS.starfield]: idleLayer(true),
      [DATA_LAYER_IDS.markers]: idleLayer(true),
      [DATA_LAYER_IDS.labels]: idleLayer(true),
      [DATA_LAYER_IDS.bars]: idleLayer(false),
      [DATA_LAYER_IDS.flightArcs]: idleLayer(true),
      [DATA_LAYER_IDS.landRoutes]: idleLayer(true),
      [DATA_LAYER_IDS.seaRoutes]: idleLayer(true),
      [DATA_LAYER_IDS.particleHalo]: idleLayer(true),
    },
  }
}
