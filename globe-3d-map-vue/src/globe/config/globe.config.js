export const EARTH_RADIUS = 50

export const GLOBE_THEMES = Object.freeze({
  emerald: Object.freeze({
    id: "emerald",
    label: "翡翠绿",
    colors: Object.freeze({
      background: 0x020706,
      surfaceDeep: 0x06120f,
      surfaceMid: 0x164438,
      mint: 0x63f5cb,
      cyan: 0x75fff4,
      amber: 0xf7e27e,
      land: 0x67efaa,
      sea: 0x53d8ff,
      halo: 0x3de8b4,
      boundary: 0x88ffe1,
      star: 0xd9fff4,
    }),
  }),
  azure: Object.freeze({
    id: "azure",
    label: "深海蓝",
    colors: Object.freeze({
      background: 0x020711,
      surfaceDeep: 0x07152b,
      surfaceMid: 0x174b83,
      mint: 0x63d7ff,
      cyan: 0xa7efff,
      amber: 0xffdf76,
      land: 0x83d5ff,
      sea: 0x48f0ff,
      halo: 0x4c9dff,
      boundary: 0xa3e8ff,
      star: 0xe6f7ff,
    }),
  }),
  violet: Object.freeze({
    id: "violet",
    label: "星云紫",
    colors: Object.freeze({
      background: 0x080511,
      surfaceDeep: 0x150d27,
      surfaceMid: 0x523875,
      mint: 0xc497ff,
      cyan: 0x78e7ff,
      amber: 0xffd477,
      land: 0xd2a5ff,
      sea: 0x67dcff,
      halo: 0xa86cff,
      boundary: 0xe0c5ff,
      star: 0xf5efff,
    }),
  }),
  solar: Object.freeze({
    id: "solar",
    label: "琥珀金",
    colors: Object.freeze({
      background: 0x0b0702,
      surfaceDeep: 0x211506,
      surfaceMid: 0x765018,
      mint: 0xffbb55,
      cyan: 0xffe0a3,
      amber: 0xfff08a,
      land: 0xffc86b,
      sea: 0x65e3ff,
      halo: 0xff9f43,
      boundary: 0xffdeb0,
      star: 0xfff5dc,
    }),
  }),
})

export const DEFAULT_THEME_ID = "emerald"
export const GLOBE_COLORS = GLOBE_THEMES[DEFAULT_THEME_ID].colors

export const TEXTURE_MODES = Object.freeze({
  off: Object.freeze({ id: "off", label: "无贴图", caption: "GRID" }),
  day: Object.freeze({ id: "day", label: "白天", caption: "DAY" }),
  night: Object.freeze({ id: "night", label: "夜晚", caption: "NIGHT" }),
})

export const DEFAULT_TEXTURE_MODE = "day"

export function resolveGlobeTheme(themeId) {
  return GLOBE_THEMES[themeId] ?? GLOBE_THEMES[DEFAULT_THEME_ID]
}

export const CAMERA_CONFIG = Object.freeze({
  fieldOfView: 40,
  near: 0.1,
  far: 1400,
  minDistance: 74,
  maxDistance: 260,
  defaultDistance: 148,
  autoRotateSpeed: 0.08,
  autoRotateResumeDelay: 5000,
})

export const VIEW_PRESETS = Object.freeze({
  global: {
    id: "global",
    label: "全球",
    coordinate: [104, 24],
    distance: 148,
  },
  china: {
    id: "china",
    label: "中国",
    coordinate: [104, 35],
    distance: 112,
  },
  guangdong: {
    id: "guangdong",
    label: "广东",
    coordinate: [113.2644, 23.1291],
    distance: 88,
  },
})

export const BASE_LAYER_IDS = Object.freeze({
  earth: "earth",
  atmosphere: "atmosphere",
  boundaries: "boundaries",
  starfield: "starfield",
})

export const EFFECT_IDS = Object.freeze({
  atmosphereMotion: "atmosphereMotion",
})

export const DATA_LAYER_IDS = Object.freeze({
  markers: "markers",
  labels: "labels",
  bars: "bars",
  flightArcs: "flightArcs",
  landRoutes: "landRoutes",
  seaRoutes: "seaRoutes",
  particleHalo: "particleHalo",
})
