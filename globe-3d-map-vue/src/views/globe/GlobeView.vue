<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue"
import EffectToolbar from "../../components/globe-ui/EffectToolbar.vue"
import GlobeControls from "../../components/globe-ui/GlobeControls.vue"
import GlobeError from "../../components/globe-ui/GlobeError.vue"
import GlobeLayerNotice from "../../components/globe-ui/GlobeLayerNotice.vue"
import GlobeLoading from "../../components/globe-ui/GlobeLoading.vue"
import GlobeTooltip from "../../components/globe-ui/GlobeTooltip.vue"
import LanguageSwitcher from "../../components/globe-ui/LanguageSwitcher.vue"
import ThemeSwitcher from "../../components/globe-ui/ThemeSwitcher.vue"
import TextureSwitcher from "../../components/globe-ui/TextureSwitcher.vue"
import VisualControls from "../../components/globe-ui/VisualControls.vue"
import { BASE_LAYER_IDS, DATA_LAYER_IDS, EFFECT_IDS, GLOBE_THEMES, TEXTURE_MODES } from "../../globe/config/globe.config.js"
import { GlobeWorld } from "../../globe/core/GlobeWorld.js"
import { t, type GlobeLocale, type GlobeMessageKey } from "../../i18n/globe"
import "./globe.scss"

const canvas = ref<HTMLCanvasElement | null>(null)
const locale = ref<GlobeLocale>("en")
let world: GlobeWorld | null = null
let diagnosticsTimer: number | null = null
const searchParams = new URLSearchParams(window.location.search)
const requestedQuality = searchParams.get("quality")
const requestedTheme = searchParams.get("theme")
const qualityOverride = ["low", "medium", "high"].includes(requestedQuality ?? "") ? requestedQuality : undefined
const dataOverride = searchParams.get("scenario") === "empty" ? { locations: [], flightRoutes: [], transportRoutes: [] } : {}

const sceneState: any = reactive({
  phase: "idle", quality: "medium", theme: GLOBE_THEMES[requestedTheme] ? requestedTheme : "emerald", accent: "#63f5cb", preset: "global", interacting: false, autoRotate: true,
  densities: { halo: 100, starfield: 100 }, hoveredLocationId: null, selectedLocationId: null, selectedCountry: null, activeLocation: null, error: null, layerIssues: [], effects: {}, layers: {},
  loading: { progress: 0, message: "loading" }, texture: { mode: "day", status: "idle", error: null },
})
const diagnostics: any = reactive({ fps: 0, frameTime: 0, drawCalls: 0, triangles: 0, geometries: 0, textures: 0, heapMemoryMb: null, cameraCoordinate: [0, 0] })

const baseLayerDefinitions: Array<{ id: string; labelKey: GlobeMessageKey; effect?: boolean }> = [
  { id: BASE_LAYER_IDS.boundaries, labelKey: "worldBoundaries" },
  { id: BASE_LAYER_IDS.atmosphere, labelKey: "atmosphere" },
  { id: EFFECT_IDS.atmosphereMotion, labelKey: "glowMotion", effect: true },
  { id: BASE_LAYER_IDS.starfield, labelKey: "starfield" },
]
const dataLayerDefinitions: Array<{ id: string; labelKey: GlobeMessageKey; milestone: string; tone?: string }> = [
  { id: DATA_LAYER_IDS.bars, labelKey: "bars", milestone: "M2" },
  { id: DATA_LAYER_IDS.flightArcs, labelKey: "flights", milestone: "M2" },
  { id: DATA_LAYER_IDS.labels, labelKey: "labels", milestone: "M2" },
  { id: DATA_LAYER_IDS.landRoutes, labelKey: "landRoutes", milestone: "M3", tone: "land" },
  { id: DATA_LAYER_IDS.seaRoutes, labelKey: "seaRoutes", milestone: "M3", tone: "sea" },
  { id: DATA_LAYER_IDS.particleHalo, labelKey: "particleHalo", milestone: "M3", tone: "halo" },
]
const themes = computed(() => Object.values(GLOBE_THEMES).map((theme) => ({ id: theme.id, label: t(locale.value, theme.id as GlobeMessageKey), swatch: `#${theme.colors.mint.toString(16).padStart(6, "0")}` })))
const textureModes = computed(() => Object.values(TEXTURE_MODES).map((mode) => ({ ...mode, label: t(locale.value, mode.id === "off" ? "noTexture" : mode.id === "day" ? "daytime" : "nighttime") })))
const activeAccent = computed(() => sceneState.accent)
const baseLayers = computed(() => baseLayerDefinitions.map((definition) => {
  const itemState = definition.effect ? sceneState.effects[definition.id] : sceneState.layers[definition.id]
  return { ...definition, label: t(locale.value, definition.labelKey), visible: definition.effect ? itemState?.enabled ?? false : itemState?.visible ?? false, status: itemState?.status ?? "idle", error: itemState?.error ?? null }
}))
const dataLayers = computed(() => dataLayerDefinitions.map((definition) => {
  const itemState = sceneState.layers[definition.id]
  return { ...definition, label: t(locale.value, definition.labelKey), visible: itemState?.visible ?? false, status: itemState?.status ?? "idle", error: itemState?.error ?? null }
}))
const layerLabelKeys = new Map<string, GlobeMessageKey>([[BASE_LAYER_IDS.earth, "earthSurface"], [DATA_LAYER_IDS.markers, "markers"], ...baseLayerDefinitions.map((item) => [item.id, item.labelKey] as [string, GlobeMessageKey]), ...dataLayerDefinitions.map((item) => [item.id, item.labelKey] as [string, GlobeMessageKey])])
const layerIssues = computed(() => sceneState.layerIssues.map((issue: any) => ({ ...issue, label: t(locale.value, layerLabelKeys.get(issue.id) ?? "markers") })))
const statusLabel = computed(() => sceneState.phase === "ready" ? sceneState.interacting ? t(locale.value, "manualControlStatus") : t(locale.value, "orbitOnline") : sceneState.phase === "loading" ? t(locale.value, "booting") : sceneState.phase === "entering" ? t(locale.value, "orbitStarting") : sceneState.phase === "recovering" ? t(locale.value, "recoveringStatus") : t(locale.value, "offline"))
const cameraCoordinateLabel = computed(() => {
  const [longitude, latitude] = diagnostics.cameraCoordinate
  return { latitude: `${Math.abs(latitude).toFixed(4)}° ${latitude >= 0 ? "N" : "S"}`, longitude: `${Math.abs(longitude).toFixed(4)}° ${longitude >= 0 ? "E" : "W"}` }
})
const loadingMessage = computed(() => {
  if (sceneState.phase === "recovering") return t(locale.value, "recovering")
  return t(locale.value, sceneState.loading.message in { loading: 1, loadingDay: 1, loadingNight: 1, loadingScene: 1, loadingReady: 1 } ? sceneState.loading.message : "loading")
})

function updateState(nextState: any) { Object.assign(sceneState, nextState) }
async function createWorld() {
  world?.dispose()
  world = null
  sceneState.phase = "loading"
  sceneState.error = null
  await nextTick()
  if (!canvas.value) return
  world = new GlobeWorld(canvas.value, { ...dataOverride, onStateChange: updateState, quality: qualityOverride, theme: sceneState.theme })
  await world.load()
  world.setLocale(locale.value)
  if (diagnosticsTimer !== null) window.clearInterval(diagnosticsTimer)
  diagnosticsTimer = window.setInterval(() => { if (world && sceneState.phase === "ready") Object.assign(diagnostics, world.getDiagnostics()) }, 1000)
}
function toggleLayer(id: string, visible: boolean) { id === EFFECT_IDS.atmosphereMotion ? world?.setEffectEnabled(id, visible) : world?.setLayerVisible(id, visible) }
function selectTheme(id: string) { world?.setTheme(id) }
function selectCustomTheme(color: string) { world?.setCustomAccentColor(color) }
function selectTextureMode(id: string) { world?.setTextureMode(id) }
function toggleAutoRotate(enabled: boolean) { world?.setAutoRotate(enabled) }
function resetView() { world?.resetView() }
function updateDensity(kind: string, value: number) { world?.setVisualDensity(kind, value) }
function selectLocale(nextLocale: GlobeLocale) { locale.value = nextLocale; world?.setLocale(nextLocale) }
onMounted(createWorld)
onBeforeUnmount(() => { if (diagnosticsTimer !== null) window.clearInterval(diagnosticsTimer); world?.dispose(); world = null })
</script>

<template>
  <main class="globe-page" :data-theme="sceneState.theme" :data-phase="sceneState.phase">
    <div class="globe-stage"><canvas ref="canvas" class="globe-stage__canvas" aria-label="Interactive 3D globe">Your browser cannot display this WebGL 3D globe.</canvas></div>
    <div class="globe-vignette" aria-hidden="true"></div><div class="globe-scanlines" aria-hidden="true"></div>
    <header class="globe-header"><div class="globe-runtime" :data-fps="diagnostics.fps" :data-frame-time="diagnostics.frameTime" :data-draw-calls="diagnostics.drawCalls" :data-triangles="diagnostics.triangles" :data-geometries="diagnostics.geometries" :data-textures="diagnostics.textures" :data-heap-memory-mb="diagnostics.heapMemoryMb"><span class="globe-runtime__signal" aria-hidden="true"></span><div><strong>{{ statusLabel }}</strong><small>{{ sceneState.quality.toUpperCase() }} · {{ diagnostics.fps }} FPS · {{ diagnostics.drawCalls }} CALLS</small></div></div></header>
    <ThemeSwitcher :themes="themes" :current="sceneState.theme" :accent="activeAccent" :locale="locale" @select="selectTheme" @select-custom="selectCustomTheme" />
    <TextureSwitcher :modes="textureModes" :current="sceneState.texture.mode" :disabled="sceneState.texture.status !== 'ready'" :locale="locale" @select="selectTextureMode" />
    <EffectToolbar :base-layers="baseLayers" :data-layers="dataLayers" :locale="locale" @toggle="toggleLayer" />
    <GlobeControls :auto-rotate="sceneState.autoRotate" :interacting="sceneState.interacting" :locale="locale" @toggle-rotate="toggleAutoRotate" @reset="resetView" />
    <VisualControls :halo-density="sceneState.densities.halo" :star-density="sceneState.densities.starfield" :locale="locale" @update:halo-density="updateDensity('halo', $event)" @update:star-density="updateDensity('starfield', $event)" />
    <LanguageSwitcher :current="locale" @select="selectLocale" />
    <div class="globe-guide"><span>{{ t(locale, "dragToRotate") }}</span><span>{{ t(locale, "wheelToZoom") }}</span><span>{{ t(locale, "selectToFocus") }}</span></div>
    <div v-if="sceneState.selectedCountry" class="country-focus"><small>{{ t(locale, "countryFocus") }}</small><strong>{{ locale === "zh" ? sceneState.selectedCountry.nameZh : sceneState.selectedCountry.name }}</strong><span>{{ t(locale, "clickAgainToExit") }}</span></div>
    <div class="globe-coordinate"><span>{{ cameraCoordinateLabel.latitude }}</span><i aria-hidden="true"></i><span>{{ cameraCoordinateLabel.longitude }}</span></div>
    <GlobeTooltip :location="sceneState.activeLocation" :locale="locale" />
    <GlobeLayerNotice :issues="layerIssues" :locale="locale" />
    <Transition name="loading-curtain"><GlobeLoading v-if="sceneState.phase === 'loading' || sceneState.phase === 'recovering'" :message="loadingMessage" :progress="sceneState.phase === 'recovering' ? 0.72 : sceneState.loading.progress" /></Transition>
    <GlobeError v-if="sceneState.phase === 'fatal-error'" :message="sceneState.error" @retry="createWorld" />
  </main>
</template>
