import { vector3ToLonLat } from "../math/geo.js"

function readHeapMemory() {
  const usedBytes = globalThis.performance?.memory?.usedJSHeapSize
  return Number.isFinite(usedBytes)
    ? Math.round((usedBytes / 1024 / 1024) * 10) / 10
    : null
}

export class GlobeDiagnostics {
  constructor(quality) {
    this.quality = quality
    this.frameCount = 0
    this.frameSeconds = 0
    this.longFrameCount = 0
    this.lastFps = 0
  }

  recordFrame(delta) {
    if (!Number.isFinite(delta) || delta <= 0) {
      return
    }

    this.frameCount += 1
    this.frameSeconds += delta
    if (delta > 1 / 30) {
      this.longFrameCount += 1
    }
  }

  snapshot({ camera, dataService, layers, renderer } = {}) {
    if (this.frameCount > 0 && this.frameSeconds > 0) {
      this.lastFps = Math.round(this.frameCount / this.frameSeconds)
    }

    const renderInfo = renderer?.info?.render ?? {}
    const memoryInfo = renderer?.info?.memory ?? {}
    const cameraCoordinate = camera
      ? vector3ToLonLat(camera.position)
      : [0, 0]
    const layerList = layers ? [...layers.values()] : []
    const fps = this.lastFps
    const result = {
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
      visibleLayers: layerList.filter((layer) => layer.group?.visible).length,
      totalLayers: layerList.length,
      locationCount: dataService?.locations?.length ?? 0,
      routeCount:
        (dataService?.flightRoutes?.length ?? 0) +
        (dataService?.landRoutes?.length ?? 0) +
        (dataService?.seaRoutes?.length ?? 0),
      cameraCoordinate,
    }

    this.frameCount = 0
    this.frameSeconds = 0
    this.longFrameCount = 0
    return result
  }
}
