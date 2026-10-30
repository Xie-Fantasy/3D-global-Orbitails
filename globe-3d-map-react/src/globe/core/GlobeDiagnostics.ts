import { vector3ToLonLat } from "../math/geo"
import type { LonLat } from "../types/data"
import type { QualityPresetId } from "../config/quality.config"

export interface GlobeDiagnosticsSnapshot {
  readonly quality: QualityPresetId
  readonly fps: number
  readonly frameTime: number
  readonly longFrames: number
  readonly drawCalls: number
  readonly triangles: number
  readonly points: number
  readonly lines: number
  readonly geometries: number
  readonly textures: number
  readonly heapMemoryMb: number | null
  readonly visibleLayers: number
  readonly totalLayers: number
  readonly locationCount: number
  readonly routeCount: number
  readonly cameraCoordinate: LonLat
}

interface DiagnosticsDependencies {
  readonly camera:
    | { position: { x: number; y: number; z: number } }
    | undefined
  readonly dataService:
    | {
        readonly locations: readonly unknown[]
        readonly flightRoutes: readonly unknown[]
        readonly landRoutes: readonly unknown[]
        readonly seaRoutes: readonly unknown[]
      }
    | undefined
  readonly layers:
    | Iterable<{ readonly group?: { readonly visible?: boolean } }>
    | undefined
  readonly renderer:
    | {
        readonly info?: {
          readonly render?: {
            readonly calls?: number
            readonly triangles?: number
            readonly points?: number
            readonly lines?: number
          }
          readonly memory?: {
            readonly geometries?: number
            readonly textures?: number
          }
        }
      }
    | undefined
}

function readHeapMemory(): number | null {
  const memory = (
    globalThis.performance as {
      memory?: { usedJSHeapSize?: number }
    } | undefined
  )?.memory?.usedJSHeapSize
  return Number.isFinite(memory as number)
    ? Math.round(((memory as number) / 1024 / 1024) * 10) / 10
    : null
}

export class GlobeDiagnostics {
  private readonly quality: QualityPresetId
  private frameCount = 0
  private frameSeconds = 0
  private longFrameCount = 0
  private lastFps = 0

  constructor(quality: QualityPresetId) {
    this.quality = quality
  }

  recordFrame(delta: number): void {
    if (!Number.isFinite(delta) || delta <= 0) {
      return
    }

    this.frameCount += 1
    this.frameSeconds += delta
    if (delta > 1 / 30) {
      this.longFrameCount += 1
    }
  }

  snapshot(
    dependencies: DiagnosticsDependencies = {
      camera: undefined,
      dataService: undefined,
      layers: undefined,
      renderer: undefined,
    },
  ): GlobeDiagnosticsSnapshot {
    if (this.frameCount > 0 && this.frameSeconds > 0) {
      this.lastFps = Math.round(this.frameCount / this.frameSeconds)
    }

    const renderInfo = dependencies.renderer?.info?.render ?? {}
    const memoryInfo = dependencies.renderer?.info?.memory ?? {}
    const camera = dependencies.camera
    const cameraCoordinate: LonLat = camera
      ? vector3ToLonLat(camera.position as never)
      : [0, 0]
    const layerList = dependencies.layers
      ? [...dependencies.layers]
      : []
    const dataService = dependencies.dataService
    const fps = this.lastFps

    const result: GlobeDiagnosticsSnapshot = {
      quality: this.quality,
      fps,
      frameTime: fps > 0 ? Math.round((10000 / fps)) / 10 : 0,
      longFrames: this.longFrameCount,
      drawCalls: renderInfo.calls ?? 0,
      triangles: renderInfo.triangles ?? 0,
      points: renderInfo.points ?? 0,
      lines: renderInfo.lines ?? 0,
      geometries: memoryInfo.geometries ?? 0,
      textures: memoryInfo.textures ?? 0,
      heapMemoryMb: readHeapMemory(),
      visibleLayers: layerList.filter(
        (layer) => layer.group?.visible === true,
      ).length,
      totalLayers: layerList.length,
      locationCount: dataService?.locations.length ?? 0,
      routeCount:
        (dataService?.flightRoutes.length ?? 0) +
        (dataService?.landRoutes.length ?? 0) +
        (dataService?.seaRoutes.length ?? 0),
      cameraCoordinate,
    }

    this.frameCount = 0
    this.frameSeconds = 0
    this.longFrameCount = 0
    return result
  }
}
