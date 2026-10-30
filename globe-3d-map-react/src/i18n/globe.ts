import type { GlobeLocale } from "../globe/types/data"

export type GlobeMessageKey =
  | "language"
  | "colorSystem"
  | "customColor"
  | "earthSurface"
  | "sceneLayers"
  | "dataLayers"
  | "visualDensity"
  | "particleHalo"
  | "starfield"
  | "quantitySpread"
  | "autoRotate"
  | "autoRotating"
  | "manualControl"
  | "resetView"
  | "dragToRotate"
  | "wheelToZoom"
  | "selectToFocus"
  | "countryFocus"
  | "clickAgainToExit"
  | "worldBoundaries"
  | "atmosphere"
  | "glowMotion"
  | "bars"
  | "flights"
  | "labels"
  | "landRoutes"
  | "seaRoutes"
  | "markers"
  | "hub"
  | "city"
  | "port"
  | "connectionNode"
  | "connectionIndex"
  | "coordinates"
  | "selectedHint"
  | "loading"
  | "loadingDay"
  | "loadingNight"
  | "loadingScene"
  | "loadingReady"
  | "recovering"
  | "runtimeError"
  | "unableToStart"
  | "retry"
  | "layerDegraded"
  | "noData"
  | "loadFailed"
  | "noTexture"
  | "daytime"
  | "nighttime"
  | "emerald"
  | "azure"
  | "violet"
  | "solar"
  | "orbitOnline"
  | "manualControlStatus"
  | "booting"
  | "orbitStarting"
  | "recoveringStatus"
  | "offline"
  | "on"
  | "off"
  | "empty"
  | "error"
  | "wait"
  | "nodeLocked"
  | "nodeSignal"

const messages: Record<GlobeLocale, Record<GlobeMessageKey, string>> = {
  en: {
    language: "LANGUAGE",
    colorSystem: "COLOR SYSTEM",
    customColor: "Custom theme color",
    earthSurface: "EARTH SURFACE · NASA",
    sceneLayers: "SCENE LAYERS",
    dataLayers: "DATA LAYERS",
    visualDensity: "VISUAL DENSITY",
    particleHalo: "Particle halo",
    starfield: "Deep-space stars",
    quantitySpread: "quantity / spread",
    autoRotate: "Auto rotate",
    autoRotating: "Rotating",
    manualControl: "Manual control",
    resetView: "Reset view",
    dragToRotate: "Drag to rotate",
    wheelToZoom: "Scroll to zoom",
    selectToFocus: "Click a country or node to focus",
    countryFocus: "COUNTRY FOCUS",
    clickAgainToExit: "Click the country again to exit focus",
    worldBoundaries: "World boundaries",
    atmosphere: "Atmospheric glow",
    glowMotion: "Glow motion",
    bars: "Bars",
    flights: "Flight arcs",
    labels: "Labels",
    landRoutes: "Land routes",
    seaRoutes: "Sea routes",
    markers: "Markers",
    hub: "Hub node",
    city: "City node",
    port: "Port node",
    connectionNode: "Connection node",
    connectionIndex: "Connection index",
    coordinates: "Coordinates",
    selectedHint: "Click the node again or press Esc to exit focus",
    loading: "Preparing globe resources",
    loadingDay: "Loading daytime surface",
    loadingNight: "Loading nighttime lights",
    loadingScene: "Building 3D scene",
    loadingReady: "Resources ready",
    recovering: "Recovering graphics context",
    runtimeError: "RUNTIME ERROR",
    unableToStart: "Unable to start 3D globe",
    retry: "Retry",
    layerDegraded: "Some layers are degraded",
    noData: "No displayable data",
    loadFailed: "Failed to load",
    noTexture: "No texture",
    daytime: "Daytime",
    nighttime: "Nighttime",
    emerald: "Emerald",
    azure: "Deep blue",
    violet: "Nebula violet",
    solar: "Amber gold",
    orbitOnline: "ORBIT ONLINE",
    manualControlStatus: "MANUAL CONTROL",
    booting: "BOOTING",
    orbitStarting: "ORBIT STARTING",
    recoveringStatus: "RECOVERING",
    offline: "OFFLINE",
    on: "ON",
    off: "OFF",
    empty: "EMPTY",
    error: "ERROR",
    wait: "WAIT",
    nodeLocked: "NODE LOCKED",
    nodeSignal: "NODE SIGNAL",
  },
  zh: {
    language: "LANGUAGE",
    colorSystem: "配色系统",
    customColor: "自定义主题色",
    earthSurface: "地球表面 · NASA",
    sceneLayers: "场景图层",
    dataLayers: "数据图层",
    visualDensity: "视觉密度",
    particleHalo: "粒子光环",
    starfield: "深空星群",
    quantitySpread: "数量 / 散布",
    autoRotate: "自动旋转",
    autoRotating: "旋转中",
    manualControl: "手动控制",
    resetView: "重置视图",
    dragToRotate: "拖拽旋转",
    wheelToZoom: "滚轮缩放",
    selectToFocus: "点击国家或节点聚焦",
    countryFocus: "国家聚焦",
    clickAgainToExit: "再次点击该国家退出聚焦",
    worldBoundaries: "世界边界",
    atmosphere: "大气辉光",
    glowMotion: "辉光动画",
    bars: "柱状图",
    flights: "飞线",
    labels: "标签",
    landRoutes: "陆运线",
    seaRoutes: "海航线",
    markers: "散点",
    hub: "核心枢纽",
    city: "城市节点",
    port: "港口节点",
    connectionNode: "连接节点",
    connectionIndex: "连接指数",
    coordinates: "坐标",
    selectedHint: "再次点击节点或按 Esc 取消聚焦",
    loading: "正在准备地球资源",
    loadingDay: "正在载入白天地表",
    loadingNight: "正在载入夜间灯光",
    loadingScene: "正在构建三维场景",
    loadingReady: "资源准备完成",
    recovering: "图形上下文恢复中",
    runtimeError: "运行时错误",
    unableToStart: "无法启动 3D 地球",
    retry: "重新初始化",
    layerDegraded: "局部图层已降级",
    noData: "当前没有可显示的数据",
    loadFailed: "加载失败",
    noTexture: "无贴图",
    daytime: "白天",
    nighttime: "夜晚",
    emerald: "翡翠绿",
    azure: "深海蓝",
    violet: "星云紫",
    solar: "琥珀金",
    orbitOnline: "轨道在线",
    manualControlStatus: "手动控制",
    booting: "正在启动",
    orbitStarting: "轨道启动中",
    recoveringStatus: "恢复中",
    offline: "离线",
    on: "开启",
    off: "关闭",
    empty: "无数据",
    error: "错误",
    wait: "等待中",
    nodeLocked: "节点已锁定",
    nodeSignal: "节点信号",
  },
}

export function t(locale: GlobeLocale, key: GlobeMessageKey): string {
  return messages[locale][key]
}

export function localizedText<T extends Record<GlobeLocale, string>>(
  locale: GlobeLocale,
  values: T,
): string {
  return locale === "zh" ? values.zh : values.en
}
