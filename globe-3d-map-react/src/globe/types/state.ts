import type { CountryRecord, LocationRecord } from "./data"
import type {
  GlobeTextureMode,
  GlobeDensities,
  LayerStatus,
} from "./layers"
import type { QualityPresetId } from "../config/quality.config"

export type GlobePhase =
  | "idle"
  | "loading"
  | "entering"
  | "ready"
  | "recovering"
  | "fatal-error"
  | "disposed"

export type TextureStatus = "idle" | "loading" | "ready" | "error"

export interface TextureState {
  mode: GlobeTextureMode
  status: TextureStatus
  error: string | null
}

export interface LayerState {
  visible: boolean
  status: LayerStatus
  error: string | null
}

export interface EffectState {
  enabled: boolean
  status: LayerStatus
  error: string | null
}

export interface LoadingState {
  progress: number
  message: string
}

export interface GlobeError {
  readonly code: string
  readonly message: string
  readonly recoverable: boolean
}

export interface LayerIssue {
  readonly id: string
  readonly status: LayerStatus
  readonly message: string
}

export interface GlobeActiveLocation extends LocationRecord {
  readonly interaction: "selected" | "hovered"
}

export interface GlobeState {
  phase: GlobePhase
  quality: QualityPresetId
  theme: string
  accent: string | null
  preset: string
  autoRotate: boolean
  densities: GlobeDensities
  interacting: boolean
  hoveredLocationId: string | null
  selectedLocationId: string | null
  selectedCountry: CountryRecord | null
  activeLocation: GlobeActiveLocation | null
  error: GlobeError | null
  layerIssues: readonly LayerIssue[]
  loading: LoadingState
  texture: TextureState
  effects: Record<string, EffectState>
  layers: Record<string, LayerState>
}
