import { useEffect, useRef, useState } from "react"
import type { RefObject } from "react"
import { GlobeWorld } from "../globe/core/GlobeWorld"
import type { GlobeWorldOptions } from "../globe/core/GlobeWorld"
import type { GlobeState } from "../globe/types/state"
import type { GlobeLocale, LonLat } from "../globe/types/data"

export type GlobeStatus = "idle" | "loading" | "ready" | "error"

export type GlobeTextureModeValue = "off" | "day" | "night"

export interface GlobeControls {
  setLayerVisible(id: string, visible: boolean): boolean
  setEffectEnabled(id: string, enabled: boolean): boolean
  setTheme(themeId: string): boolean
  setCustomAccentColor(color: string): boolean
  setTextureMode(mode: GlobeTextureModeValue): boolean
  setLocale(locale: GlobeLocale): void
  selectLocation(locationId: string | null): void
  setSelectedLocation(locationId: string | null, focus?: boolean): void
  selectCountryAtCoordinate(coordinate: LonLat | null): void
  clearSelectedCountry(resumeAutoRotate?: boolean): boolean
  clearSelection(): void
  setAutoRotate(enabled: boolean): void
  resetView(): void
  setVisualDensity(kind: "halo" | "starfield", value: number): boolean
  getDiagnostics(): ReturnType<GlobeWorld["getDiagnostics"]> | null
}

export interface UseGlobeWorldResult {
  canvasRef: RefObject<HTMLCanvasElement | null>
  state: GlobeState | null
  status: GlobeStatus
  controls: GlobeControls
}

/**
 * Owns a single `GlobeWorld` instance bound to a canvas ref.
 *
 * StrictMode safety: the effect intentionally creates a fresh instance on every
 * mount and disposes it on cleanup. Because `GlobeWorld.load()` is async, the
 * cleanup flips `disposed` (load() short-circuits when disposed) and disposes
 * the renderer before the second mount spins up a clean instance.
 */
export function useGlobeWorld(
  options: GlobeWorldOptions = {},
): UseGlobeWorldResult {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const worldRef = useRef<GlobeWorld | null>(null)
  const [state, setState] = useState<GlobeState | null>(null)
  const [status, setStatus] = useState<GlobeStatus>("idle")

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const world = new GlobeWorld(canvas, {
      ...options,
      onStateChange: (next) => setState(next),
      onError: () => setStatus("error"),
    })
    worldRef.current = world

    let cancelled = false
    setStatus("loading")
    world
      .load()
      .then((ok) => {
        if (!cancelled) {
          setStatus(ok ? "ready" : "error")
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error")
        }
      })

    return () => {
      cancelled = true
      world.dispose()
      worldRef.current = null
    }
    // Options are captured at mount; runtime theme/locale/layer changes flow
    // through the `controls` API instead of re-creating the world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const controlsRef = useRef<GlobeControls>({
    setLayerVisible: (id, visible) =>
      worldRef.current?.setLayerVisible(id, visible) ?? false,
    setEffectEnabled: (id, enabled) =>
      worldRef.current?.setEffectEnabled(id, enabled) ?? false,
    setTheme: (themeId) => worldRef.current?.setTheme(themeId) ?? false,
    setCustomAccentColor: (color) =>
      worldRef.current?.setCustomAccentColor(color) ?? false,
    setTextureMode: (mode) => worldRef.current?.setTextureMode(mode) ?? false,
    setLocale: (locale) => worldRef.current?.setLocale(locale),
    selectLocation: (locationId) =>
      worldRef.current?.selectLocation(locationId),
    setSelectedLocation: (locationId, focus) =>
      worldRef.current?.setSelectedLocation(locationId, focus),
    selectCountryAtCoordinate: (coordinate) =>
      worldRef.current?.selectCountryAtCoordinate(coordinate),
    clearSelectedCountry: (resumeAutoRotate) =>
      worldRef.current?.clearSelectedCountry(resumeAutoRotate) ?? false,
    clearSelection: () => worldRef.current?.clearSelection(),
    setAutoRotate: (enabled) => worldRef.current?.setAutoRotate(enabled),
    resetView: () => worldRef.current?.resetView(),
    setVisualDensity: (kind, value) =>
      worldRef.current?.setVisualDensity(kind, value) ?? false,
    getDiagnostics: () => worldRef.current?.getDiagnostics() ?? null,
  })

  return { canvasRef, state, status, controls: controlsRef.current }
}
