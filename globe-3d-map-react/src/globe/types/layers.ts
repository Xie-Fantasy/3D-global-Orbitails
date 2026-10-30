import type { Camera, Group, Object3D } from "three"
import type { Feature } from "geojson"
import type { GlobeLocale } from "./data"

export interface GlobeSize {
  readonly width: number
  readonly height: number
}

export interface LayerResizeContext extends GlobeSize {
  readonly pixelRatio: number
}

export interface GlobeDensities {
  readonly halo: number
  readonly starfield: number
}

export type GlobeTextureMode = "off" | "day" | "night"

export interface GlobeThemeColors {
  readonly background: number
  readonly surfaceDeep: number
  readonly surfaceMid: number
  readonly mint: number
  readonly cyan: number
  readonly amber: number
  readonly land: number
  readonly sea: number
  readonly halo: number
  readonly boundary: number
  readonly star: number
}

export interface GlobeTheme {
  readonly id: string
  readonly label: string
  readonly colors: GlobeThemeColors
}

export interface LayerUpdateContext {
  readonly camera: Camera
  readonly size: GlobeSize
}

// "empty" is used by mountGlobeLayers when a layer has no displayable data.
export type LayerStatus = "idle" | "ready" | "degraded" | "error" | "empty"

export interface GlobeLayer {
  readonly group: Group
  mount(parent: Object3D): void
  setData?(data: unknown): void
  setVisible(visible: boolean): void
  setTheme?(theme: GlobeTheme): void
  setLocale?(locale: GlobeLocale): void
  setSelected?(locationId: string | null): void
  setHovered?(locationId: string | null): void
  setDensity?(value: number): void
  setAnimationEnabled?(enabled: boolean): boolean
  setTextureMode?(mode: GlobeTextureMode): void
  setSelectedCountry?(countryFeature: Feature | null): void
  getInteractiveObjects?(): Object3D[]
  getInteractiveObject?(): Object3D | null
  readonly isEmpty?: boolean
  update(delta: number, elapsed: number, context: LayerUpdateContext): void
  resize(context: LayerResizeContext): void
  dispose(): void
}

export type { GlobeLocale } from "./data"
export type { LayerIssue } from "./state"
